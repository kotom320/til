---
title: "CloudFront 비용 분석: Invalidation 범위 변경이 실제 비용에 미친 영향"
date: "2026-02-11"
tags: ["cloudfront", "cache", "invalidation", "vite", "s3", "cost"]
summary: "CloudFront Invalidation을 /*에서 /index.html로 축소하면 비용이 감소할 것이라 예상했으나, 실제 데이터 분석 결과 그 효과는 미미했다. 이번 실험을 통해 가정이 왜 성립하지 않았는지를 정리하고, 다음 최적화 단계로 Request 중심 접근이 필요함을 도출한다."
---

## 1. 문제 인지 / 상황 설명

CloudFront 비용이 점진적으로 증가하고 있었고, 비용 항목 중 **Request Count 비중이 크다**는 점을 확인했다.  
기존 배포 파이프라인에서는 배포 시마다 CloudFront Invalidation을 `/*`로 수행하고 있었으며, 배포 직후 Requests와 Data transfer가 동시에 증가하는 패턴이 반복적으로 관측되었다.

현재 프로젝트는 Vite 기반 빌드 환경이며, JS/CSS 등 정적 자산은 **해시 기반 파일명**으로 생성된다.  
그럼에도 모든 캐시를 무효화하는 전략이 유지되고 있었고, 이 전략이 여전히 합리적인지 검증할 필요가 있다고 판단했다.

이에 Invalidation 범위를 `/*`에서 `/index.html`로 축소하는 실험을 진행했다.

## 2. 문제 정의 및 가설

### 2.1 문제 정의

- 배포 시점마다 CloudFront Requests와 Data transfer가 함께 증가한다.
- 전체 Invalidation(`/*`)이 이 현상의 주요 원인일 가능성이 있다.
- Invalidation 범위를 최소화하면 캐시 HIT 비율이 증가하고, CloudFront 비용이 감소할 수 있을 것으로 예상했다.

### 2.2 가설 (실험 전 기대)

기존 `/*` Invalidation은 다음과 같은 구조를 만든다고 판단했다.

- 모든 캐시 객체 제거
- 배포 직후 모든 요청이 MISS
- 해시 기반 여부와 무관하게 정적 자산 재전송
- Data transfer 증가 → 비용 증가

반면 `/index.html`만 무효화하면,

- 진입점 HTML만 MISS
- 기존에 캐싱된 해시 기반 정적 자산은 Edge 캐시에 유지
- 일부 사용자는 이전 캐시 자산을 계속 HIT로 사용
- 결과적으로 MISS 및 Data transfer가 유의미하게 감소

할 것이라는 가정을 세웠다.

## 3. 실험 및 관측 결과

### 3.1 실험 조건

| 날짜 | Invalidation 범위 |
|----|----------------|
| 1월 26일 | `/*` |
| 2월 3일 | `/index.html` |

두 날짜 모두 동일한 서비스, 동일한 배포 구조에서 측정했다.

### 3.2 Requests / Data transfer 관측

![배포 지표 (2026-01-26, Invalidation: /*)](/images/cloudfront0126.png)

![배포 지표 (2026-02-03, Invalidation: /index.html)](/images/cloudfront0203.png)

- Requests 패턴은 두 날짜 간 큰 차이가 없었다.
- Data transfer 역시 전체적인 형태가 유사했으며,
  `/index.html` Invalidation 이후 **유의미하게 감소했다고 단정하기는 어려웠다.**

### 3.3 CSV 기준 MISS 분석

CacheStatistics CSV를 기준으로 HIT / MISS 비율을 계산한 결과:

- `/*` Invalidation과 `/index.html` Invalidation 간 **MISS율 차이는 매우 작았다.**
- Invalidation 범위 변경이 MISS율 자체를 크게 바꾸지는 않았다.

이 결과는 “Invalidate 범위를 줄이면 MISS가 크게 줄 것”이라는 가설과는 달랐다.

## 4. 가설이 성립하지 않았던 이유 (원인 분석)

실험 전 가설에는 다음 전제가 포함되어 있었다.

> “배포 이후에도 일정 수의 사용자는 이전 버전을 바라보고,  
> 이 경우 기존에 캐싱된 해시 자산이 HIT로 처리될 것이다.”

그러나 실제 트래픽에서는,

- 배포 직후 대부분의 사용자가 새로운 `index.html`을 통해
- 즉시 새로운 해시 자산을 요청하는 흐름이 지배적이었다.

그 결과:

- 이전 캐시 자산이 Edge에 남아 있더라도
- 전체 트래픽과 비용 관점에서 의미 있는 비중을 차지하지 못했다.

즉, **invalidate 범위를 줄이는 것만으로는 MISS율이나 비용에 눈에 띄는 변화를 만들기 어려운 구조**였다.

## 5. 결론 (배운 점)

이번 실험을 통해 다음 사실을 확인했다.

- Invalidation 범위를 `/*`에서 `/index.html`로 축소해도
  **MISS율과 CloudFront 비용은 유의미하게 감소하지 않았다.**
- 이는 Invalidation 전략 자체가,
  현재 트래픽 패턴에서는 비용 최적화의 핵심 레버가 아님을 의미한다.

이번 변경의 의의는 “비용을 줄였다”가 아니라,

> **Invalidate 최적화만으로는 비용을 줄일 수 없다는 가설을 데이터로 반증한 것**

에 있다.

이 결과를 통해 다음 단계로 나아갈 근거를 확보했다는 점에 의미가 있다.

## 6. 다음 스텝

이제 초점을 **Data transfer**가 아닌 **Request Count**로 이동한다.

- 304 재검증 요청이 비용에 미치는 영향을 분석하고
- CloudFront Response Headers Policy / Cache Policy를 활용해
  - 해시 기반 정적 자산에 장기 캐시(`immutable`)
  - `index.html`에는 짧은 캐시 정책

을 적용하여 **브라우저 재요청 자체를 줄이는 방향**으로 최적화를 진행할 예정이다.