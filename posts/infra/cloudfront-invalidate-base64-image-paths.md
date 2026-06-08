---
title: "CloudFront 이미지 핸들러 무효화: 평문 경로 말고 base64 토큰으로"
date: "2026-06-08"
tags: ["cloudfront", "base64", "invalidation", "cache-control"]
summary: "이미지 핸들러는 base64 토큰이 곧 캐시 키. 무효화는 엣지만 비운다"
---

## 문제 상황

운영툴에 등록된 아이콘 33개를 교체하고 CloudFront 캐시를 무효화해야 했다. 그런데 CloudFront 콘솔의 "객체 경로" 입력란 안내 예시는 이렇게 평문 경로를 넣으라고 되어 있다.

```
/example/path/object1
/example/path/object2
/examplePathWithWildcard*
```

안내대로 실제 S3 키 경로를 넣었다.

```
/public/your-community/icons/icon_sample.png
```

무효화는 "완료"로 떴는데 이미지가 갱신되지 않았다. 매칭되는 캐시가 없었던 것이다.

## 원인 분석

이 프로젝트의 이미지는 일반 정적 파일이 아니라 **이미지 리사이징 핸들러**(serverless-image-handler 류)를 거쳐 서빙된다. 브라우저/앱이 실제로 요청하는 URL이 아래처럼 base64 토큰이다.

```
https://your-cloudfront-domain.cloudfront.net/{base64_token}
```

토큰을 디코딩하면 bucket·key를 담은 JSON이 나온다.

```json
{"bucket":"your-bucket-name","key":"public/your-community/icons/icon_sample.png"}
```

즉 CloudFront가 캐시 키로 쓰는 "객체 경로"는 `/public/.../icon.png`(S3 키)가 **아니라** `/eyJ...`(base64 토큰)이다. 콘솔 예시가 평문 경로인 이유는 "S3 키 = URL 경로"인 일반 정적 파일 기준이기 때문이고, 이미지 핸들러 아키텍처에서는 토큰이 경로다. 그래서 평문 경로로는 영원히 매칭되지 않는다.

추가로 두 가지 함정이 더 있었다.

**1. 무효화 JSON 구조가 실제 저장된 토큰과 정확히 일치해야 한다.** 환경별로 토큰을 만드는 규칙이 달랐다.

| 환경 | JSON 구조 |
|------|-----------|
| dev / alpha | `{"bucket","key","edits":{},"cognitoPoolId":"..."}` |
| prod 아이콘 | `{"bucket","key"}` (edits·cognitoPoolId 없음) |

prod 아이콘은 `cognitoPoolId`도 `edits`도 없이 저장돼 있었는데, 처음엔 dev 구조 그대로 `cognitoPoolId`를 넣어 토큰을 만들었다. 그러니 base64 결과가 실제 캐시 키와 달라서 무효화가 안 됐다. 구조 하나만 어긋나도 다른 토큰이 된다.

**2. 줄 끝 쉼표.** 여러 경로를 붙여넣을 때 줄 끝에 `,`를 넣으면 쉼표까지 경로 문자로 포함돼서 매칭이 깨진다. CloudFront는 한 줄에 하나씩, 쉼표 없이 받는다.

```
/eyJ...fQ==      ✅
/eyJ...fQ==,     ❌ (쉼표가 경로에 포함됨)
```

## 해결 방법

토큰 33개를 손으로 만드는 대신 셸 스크립트로 생성했다. 핵심은 **실제 저장 구조와 동일한 JSON**을 만들고 base64로 인코딩하는 것.

```bash
for f in *.png; do
  # prod 아이콘은 bucket, key만 있는 구조
  json="{\"bucket\":\"your-bucket-name\",\"key\":\"public/your-community/icons/${f}\"}"
  enc=$(printf '%s' "$json" | base64)
  printf '/%s\n' "$enc"   # 쉼표 없이 한 줄에 하나씩
done
```

생성 후엔 첫 줄을 디코딩해서 실제 구조와 일치하는지 검증한다.

```bash
head -n1 paths.txt | sed 's|^/||' | base64 -d
# {"bucket":"your-bucket-name","key":"public/your-community/icons/icon_sample.png"}
```

### 더 나은 방법: 와일드카드 한 줄

33줄을 다 넣을 필요가 없었다. 모든 토큰의 JSON이 파일명 직전까지 동일하므로 **base64도 공통 접두사를 공유**한다. 그 지점까지의 base64 뒤에 `*`를 붙이면 한 줄로 전부 무효화된다.

```bash
# 33줄에서 공통 접두사 추출 (가장 긴 공통 prefix)
common=$(awk 'NR==1{p=$0;next}
  {m=(length(p)<length($0)?length(p):length($0)); n=0;
   for(i=1;i<=m;i++){if(substr(p,i,1)==substr($0,i,1))n++;else break}
   p=substr(p,1,n)} END{print p}' paths.txt)
echo "${common}*"
# /eyJidWNrZXQiOiJ5b3VyLWJ1Y2tldC1uYW1lIiwia2V5IjoicHVibGljL3lvdXItY29tbXVuaXR5L2ljb25zL2ljb25f*
```

```
객체 경로 입력란에 이 한 줄만:
/eyJidWNrZXQ...aWNvbnMvaWNvbl8*
```

와일드카드는 경로 **끝**에만 쓸 수 있는데(콘솔 안내 그대로), 토큰 끝에 붙이니 조건 충족. CloudFront 무효화 비용은 경로 수로 과금(월 1,000개 무료)되는데 와일드카드는 1개로 카운트돼서 더 저렴하기도 하다.

## 왜 이 방법인가

- **평문 경로 vs 토큰 경로**: 이미지 핸들러를 쓰면 토큰이 곧 캐시 키다. 콘솔 예시(평문)는 일반 정적 파일 전제라 이 아키텍처엔 맞지 않는다. 인코딩은 꼼수가 아니라 유일하게 맞는 방법.
- **33줄 vs 와일드카드 1줄**: 정확히 N개만 비울 땐 N줄, 같은 접두사 그룹을 통째로 비울 땐 와일드카드. 후자가 짧고 저렴하지만 접두사로 시작하는 다른 객체까지 비운다는 점만 의식하면 된다.

## 한 걸음 더: 무효화로는 브라우저 캐시를 못 비운다

여기서 더 큰 함정을 만났다. **무효화는 CloudFront 엣지 캐시만 비운다. 브라우저 캐시는 못 비운다.**

```
[오리진 S3] ──▶ [CloudFront 엣지 캐시] ──▶ [브라우저 캐시]
```

| 캐시 계층 | 위치 | 무효화로 비워지나 |
|-----------|------|------------------|
| CloudFront 엣지 | CDN (중앙 1곳) | ✅ 비워짐 |
| 브라우저 | 각 유저 기기 | ❌ 안 닿음 |

CloudFront Cache Policy의 최대 TTL이 1년이고 오리진이 `Cache-Control: max-age=31536000`을 보내면, 이 헤더가 브라우저에도 그대로 전달돼 **브라우저도 1년 캐시**가 된다. 그래서 아이콘을 교체하고 무효화까지 돌려도, 이미 캐싱한 기존 유저는 최대 1년간 옛 아이콘을 본다.

### 브라우저 캐시는 "첫 응답 헤더"가 결정한다

이미 박힌 캐시는 못 건드리지만, 아직 캐싱 안 된 이미지를 처음 내려줄 때 어떤 `Cache-Control`을 실어 보내느냐로 **미래의 캐시 동작을 미리 설계**할 수 있다.

```
브라우저가 이미지를 처음 요청
   │
   ▼ 응답의 Cache-Control 을 보고 보관 방식 결정
   ├─ max-age=31536000  → 1년간 서버에 안 물어봄 (빠름, 갱신 불가)
   ├─ no-cache          → 보관하되 매번 "바뀜?" 재검증 (304)
   └─ no-store          → 아예 보관 안 함 (항상 새로)
```

핵심은 **같은 URL에서 "영구 캐시"와 "즉시 갱신"은 동시에 못 가진다**는 것이다. 기준은 자산 종류가 아니라 URL의 성격이다.

> 불변 URL이면 최대한 길게(1년 + immutable), 가변 URL이면 짧게(또는 재검증).

| 자산 | URL 성격 | 권장 Cache-Control |
|------|----------|-------------------|
| HTML 진입점 | 가변 | `no-cache` / `max-age=0, must-revalidate` |
| 해시 박힌 정적 자산 (`app.a1b2c3.js`) | 불변 | `max-age=31536000, immutable` |
| 이름 고정 이미지 (`icon_fitness.png`) | 가변 (덮어쓰기) | 짧게 + ETag 재검증 |

### 이번 작업의 안티패턴: 이름 고정 덮어쓰기 + 긴 캐시

이번엔 코드 변경 없이 S3에서 **같은 이름으로 이미지를 덮어썼다**. 덮어쓰기 자체가 죄는 아니지만, **긴 캐시와 만나면** 안티패턴이 된다.

```
같은 이름 덮어쓰기 + max-age 1년
   ├─ 엣지 캐시: 무효화로 겨우 비움 (수동, 번거로움)
   ├─ 브라우저 캐시: 무효화 안 닿음 → 최대 1년 옛 이미지 ❌
   ├─ 롤백 불가: 이전 버전 사라짐
   └─ 업로드 중 레이스: 교체 도중 깨진 이미지 노출 가능
```

### 두 가지 갈림길

| Cache-Control | 동작 | 신선도 | 속도 |
|---------------|------|--------|------|
| `no-store` | 캐시 안 함 | 항상 최신 | 느림 |
| `no-cache` | 보관 + 매번 재검증(304) | 최신 | 중간 |
| `max-age=1년` | 1년간 서버에 안 물어봄 | 갱신 불가 | 가장 빠름 |

`no-store`에서 `max-age=1년`으로 갈수록 빨라지지만 갱신은 어려워진다. **전략 B는 `max-age=1년`(가장 빠름)에 머물면서, 갱신이 필요할 때 URL을 바꿔 그 단점을 우회한다.**

- **전략 A: 이름 고정 유지 + 짧은 캐시/재검증** (`no-cache` + ETag). URL 그대로, 갱신은 빠르지만 매 요청 304 검증이 붙는다.
- **전략 B: 긴 캐시 + URL 버저닝** (권장). 평소 1년 캐시로 가장 빠르고, 바꿀 땐 URL만 바꾸면 엣지·브라우저가 동시에 새 객체로 인식한다. 무효화 자체가 불필요해진다.

```
Cache-Control: max-age=31536000, immutable

icon_fitness.png?v=1  ─▶ 1년 캐시
        (이미지 교체)
icon_fitness.png?v=2  ─▶ 브라우저엔 "처음 보는 URL"
                          → 새로 받음 ✅ → 다시 1년 캐시
```

마침 이 Cache Policy는 "쿼리 문자열 = 모두"라 쿼리가 캐시 키에 포함된다. 그래서 교체할 때마다 참조 URL에 `?v=N`(또는 파일명/토큰에 해시)만 올리면 무효화 없이 즉시 갱신된다. 아이콘처럼 가끔 바뀌는 자산엔 전략 B가 정답이다.

## 정리

- 이미지 핸들러(serverless-image-handler) 환경에서 CloudFront 캐시 키는 S3 평문 경로가 아니라 **base64 토큰 자체**다. 무효화도 토큰으로 해야 한다.
- 무효화 토큰의 JSON 구조(`edits`·`cognitoPoolId` 유무)가 실제 저장된 구조와 **정확히** 같아야 매칭된다. 디코딩으로 먼저 검증할 것.
- 여러 경로는 쉼표 없이 한 줄에 하나씩. 토큰들이 공통 접두사를 공유하면 와일드카드 한 줄로 끝낼 수 있다.
- **무효화는 엣지 캐시만 비운다. 브라우저 캐시는 못 비운다.** 이름 고정 덮어쓰기 + 긴 캐시 조합이 근본 원인이다.
- 한 문장 요약: **"바뀔 수 있는 것에 긴 캐시를 걸지 말고, 긴 캐시를 걸 거면 바뀔 때 URL을 바꿔라."**
