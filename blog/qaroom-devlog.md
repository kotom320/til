---
title: "QA 기록방을 만들었습니다"
date: "2026-04-03"
summary: "rrweb과 Supabase로 팀 QA 도구를 직접 만든 과정 — 아이디어 발굴부터 Firebase 1MB 벽, fetch 래핑 함정, Jira CORS 해결까지"
description: "컨퍼런스에서 얻은 아이디어를 실제 팀 도구로 만들기까지. rrweb, Supabase, Edge Function을 선택한 이유와 그 과정에서 마주한 트러블슈팅을 기록합니다."
tags: ["Side Project", "rrweb", "Supabase", "SDK", "Jira", "Firebase"]
portfolio:
  slug: "qa-recording-sdk"
  title: "세션 레코딩 SDK"
---

## 아이디어의 시작

우아콘2025에서 배달의민족 팀의 발표를 봤다. QA 과정에서 버그를 신고할 때 화면 녹화 + 콘솔 로그 + 네트워크 로그를 묶어서 링크 하나로 공유한다는 내용이었다. 발표를 듣는 내내 "우리 팀에도 딱 필요한 건데"가 머릿속을 맴돌았다.

우리 팀은 신규 서비스를 개발 중이었다. QA 단계에서 버그를 공유하는 방식이 늘 불편했다. 테스터가 스크린샷을 찍어 Jira에 올리면 개발자가 재현을 시도하는데, "저는 되는데요"가 반복되곤 했다. 스크린샷 한 장으로는 클릭 순서도, API 응답도, 콘솔 에러도 알 수 없으니 당연한 일이었다.

발표를 본 다음 날, 직접 만들어보기로 했다.

---

## 상용 툴을 쓰지 않은 이유

처음에는 Microsoft Clarity나 Hotjar 같은 기존 서비스를 붙이는 방법을 먼저 생각했다. 하지만 세 가지 이유로 포기했다.

**데이터 주권.** 아직 출시 전인 서비스의 화면과 API 응답이 외부 서버로 나가는 건 찜찜했다. 공개되지 않은 기능, 내부 데이터가 녹화돼서 서드파티 서버에 저장되는 상황은 피하고 싶었다.

**QA 워크플로우 커스터마이징 불가.** Clarity, Hotjar는 마케팅/UX 분석 목적이지 QA 버그 리포팅 도구가 아니다. 심각도 분류, Jira 자동 연동, 완료 처리 같은 기능은 없다. 원하는 기능을 다 만들려면 어차피 직접 연동해야 한다.

**비용.** 팀 내부 도구 하나에 월정액을 쓰기가 부담스러웠다.

직접 만들면 세 가지를 모두 해결할 수 있었다. 오픈소스 라이브러리(rrweb)와 Supabase free tier 조합이라면 비용도 거의 없다.

---

## 전체 구조

만들기 전에 구조부터 잡았다.

```
타겟 앱 (SDK 설치)
  → 화면/콘솔/네트워크 녹화 (백그라운드)
  → FAB 버튼 클릭 시 lz-string 압축 + Supabase 저장
  → 뷰어 URL 생성

QA 기록방 Viewer (React SPA, Firebase Hosting)
  → Supabase에서 세션 로드 + lz-string 압축 해제
  → rrweb-player로 화면 재생
  → 콘솔/네트워크 로그 재생 시각 동기화

Supabase Edge Function
  → Jira REST API 프록시 (CORS 우회 + 토큰 보안)
```

SDK는 타겟 앱에 npm 패키지로 설치해 `initQaRoom()` 한 줄로 시작할 수 있다. 이후로는 완전히 백그라운드에서 동작한다.

```typescript
import { initQaRoom } from "qaroom-sdk";

initQaRoom({
  viewerBaseUrl: "https://your-viewer.web.app",
  maxMinutes: 3,
});
```

---

## 왜 rrweb인가

화면 녹화 방식으로 세 가지를 검토했다.

`MediaRecorder`로 비디오를 녹화하는 방법이 가장 직관적이었다. 하지만 파일이 크고, 재생 중 특정 시점으로 이동하기 어렵다. 가장 중요한 문제는 콘솔 로그나 네트워크 로그와 ms 단위로 동기화하는 것이 사실상 불가능하다는 점이었다.

rrweb은 DOM 변경 사항을 이벤트 스트림으로 직렬화한다. 텍스트 기반이라 lz-string으로 압축하면 크기를 크게 줄일 수 있고, 각 이벤트에 타임스탬프가 붙어 있어서 콘솔/네트워크 로그와 정확히 동기화할 수 있다.

**로그와의 동기화**가 rrweb을 선택한 핵심 이유였다. 재생 중 어느 시점에 어떤 API가 호출되었고 어떤 에러가 났는지를 한 화면에서 같이 보는 것, 그게 QA 도구에서 가장 필요한 기능이었다. 비디오 녹화로는 이걸 구현할 수 없다.

---

## 첫 번째 벽: Firebase 1MB 제한

처음에는 백엔드로 Firebase를 선택했다. 설정 없이 바로 쓸 수 있고 프로토타이핑이 빠르다는 이유에서였다. 로컬에서는 잘 동작했다.

문제는 실제 화면을 녹화하면서 터졌다.

```
FirebaseError: Document exceeds the maximum allowed size of 1,048,576 bytes.
```

Firestore의 단일 문서 크기 상한은 1MB다. rrweb 이벤트는 DOM 트리 전체를 JSON으로 직렬화한 데이터라 복잡한 화면에서 3분치를 압축해도 1MB가 넘었다. 압축 방식을 바꿔보려 했지만 `compressToBase64`도, `compressToEncodedURIComponent`도 오히려 더 커졌다. 데이터 자체가 크면 인코딩 방식을 바꿔도 한계가 있다.

근본적인 해결책은 데이터 분산 저장이었다. Firestore 서브컬렉션으로 이벤트를 300,000자 단위 청크로 쪼개 저장했다.

```
sessions
└── {sessionId}
    ├── chunkCount: 3
    ├── consoleLogsCompressed: string
    └── chunks (서브컬렉션)
        ├── 0: "..." (0~300,000자)
        ├── 1: "..." (300,000~600,000자)
        └── 2: "..." (600,000~900,000자)
```

문제는 해결됐지만 또 다른 문제가 보였다. 청크 수만큼 `addDoc`을 반복해야 해서 네트워크 요청이 청크 수에 비례해 늘어났다. 그리고 Jira 연동을 위한 서버사이드 함수가 필요했는데, Firebase의 Cloud Functions는 외부 API 호출이 유료 플랜에서만 가능했다.

결국 Supabase로 마이그레이션을 결정했다.

---

## Supabase로 이전하며 얻은 것

Supabase는 PostgreSQL 기반이라 복합 조건 필터링이 자유롭다. Firestore에서 심각도 + 완료 여부 복합 쿼리를 위해 인덱스를 따로 생성해야 했던 것과 달리, SQL처럼 그냥 쓸 수 있다.

```typescript
// Firestore — 복합 인덱스 별도 생성 필요
const q = query(collection, where("severity", "==", "critical"), where("done", "==", false));

// Supabase — SQL처럼 자유롭게
const { data } = await supabase
  .from("sessions")
  .select("*")
  .eq("severity", "critical")
  .eq("done", false)
  .order("timestamp", { ascending: false });
```

청크 저장도 달라졌다. Firebase에서는 청크마다 `addDoc`을 반복했는데, Supabase는 배열을 한 번에 `insert`할 수 있다.

```typescript
// Firebase — 청크 수만큼 네트워크 요청
for (const [i, chunk] of chunks.entries()) {
  await addDoc(chunksCollection, { index: i, data: chunk });
}

// Supabase — 한 번에 insert
await supabase.from("session_chunks").insert(
  chunks.map((data, i) => ({ session_id: sessionId, chunk_index: i, data }))
);
```

Edge Function은 free tier에서 동작한다. Jira 연동 문제도 여기서 해결됐다.

---

## 두 번째 벽: fetch 래핑의 함정

SDK에서 네트워크 로그를 기록하려면 `fetch`를 래핑해야 한다.

```typescript
const originalFetch = globalThis.fetch;
globalThis.fetch = function(input, init) {
  // ... 요청 정보 기록
  return originalFetch.call(this, input, init).then((res) => {
    // 여기서 응답 바디를 어떻게 읽어야 할까?
    res.text().then((text) => { /* 응답 기록 */ });
    return res;
  });
};
```

처음 구현에서 `res.text()`를 그냥 호출했다. 타겟 앱에 붙여보니 API 호출이 모조리 망가졌다.

원인은 `Response` 바디가 **스트림**이라는 점이었다. 한 번 소비하면 다시 읽을 수 없다. SDK가 `res.text()`로 바디를 읽어버리면, 타겟 앱 코드에서 `res.json()`을 호출할 때 이미 소비된 스트림이라 에러가 났다.

해결책은 `res.clone()`이었다.

```typescript
return originalFetch.call(this, input, init).then((res) => {
  // SDK는 복사본을 읽고, 원본은 그대로 반환
  res.clone().text().then((text) => {
    entry.responseBody = text.slice(0, 10_000);
  }).catch(() => {});

  return res; // 원본 Response 반환
});
```

이 한 줄을 빠뜨려서 꽤 당황했던 기억이 있다. 타겟 앱에 SDK를 붙이면 앱이 망가지는 최악의 시나리오였으니까. fetch를 래핑할 때 `res.clone()` 없이 바디를 읽는 것은 절대 금지다.

---

## 세 번째 벽: Jira CORS

Jira 이슈 자동 생성 기능을 추가하면서 처음 시도한 방법은 단순했다. 브라우저에서 직접 Jira REST API를 호출하는 것이었다.

결과는 즉시 CORS 에러였다.

```
Access to fetch at 'https://your-domain.atlassian.net/rest/api/3/issue'
from origin 'https://your-viewer.web.app' has been blocked by CORS policy.
```

Atlassian은 서드파티 Origin에서의 직접 API 호출을 허용하지 않는다. 설령 허용된다 해도 API 토큰을 브라우저 코드에 넣으면 누구나 소스에서 볼 수 있어서 보안 위반이다.

서버를 새로 추가하는 방법도 있었지만, 이미 Supabase를 DB로 쓰고 있었고 Edge Function이 free tier에서 동작했다. Edge Function을 프록시로 세우면 별도 인프라 없이 해결할 수 있었다.

```
브라우저 SDK
  → Supabase Edge Function (Deno)
    → Jira REST API (서버 간 통신, CORS 없음)
```

Edge Function에서 Jira 자격증명은 Supabase Secrets에 저장하고 `Deno.env.get()`으로만 접근한다. 배포된 함수 코드를 열람해도 실제 값을 볼 수 없다.

구현하면서 한 가지 더 걸렸다. Jira API v3에서 이슈 설명은 **ADF(Atlassian Document Format)**으로 작성해야 한다. 일반 문자열을 넣으면 400이 난다.

```typescript
// 잘못된 방법 — v3에서는 400 에러
{ description: "버그 설명" }

// 올바른 방법 — ADF 구조 필요
{
  description: {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "버그 설명" }]
      }
    ]
  }
}
```

Jira API 문서에 v2와 v3가 혼재되어 있어서 처음에 이걸 놓쳤다. v2는 문자열을 받지만 v3는 ADF가 필수다.

---

## Shadow DOM — 스타일 격리

SDK UI(FAB 버튼, 모달)를 타겟 앱 DOM에 그냥 붙이면 두 가지 문제가 생긴다.

하나는 타겟 앱의 전역 스타일이 SDK UI에 영향을 준다. `* { box-sizing: border-box; }` 같은 리셋 스타일이 SDK 버튼을 망가뜨릴 수 있다. 다른 하나는 SDK 스타일이 타겟 앱 레이아웃을 건드릴 수 있다.

Shadow DOM으로 격리하면 두 문제를 모두 해결할 수 있다. Shadow DOM 안의 스타일은 바깥으로 새지 않고, 바깥 스타일은 안으로 들어오지 않는다.

```typescript
const host = document.createElement("div");
host.style.cssText = "position:fixed;bottom:0;right:0;width:0;height:0;pointer-events:none;z-index:2147483647";
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "open" });
// Shadow DOM 안에서만 유효한 스타일 작성
```

`host` 자체는 0×0 크기에 `pointer-events: none`이라 존재 자체가 보이지 않는다. 내부 요소들은 `position: fixed`로 뷰포트에 배치된다.

Shadow DOM을 처음 쓰면서 외부 폰트(`@font-face`)가 Shadow DOM 안에서 적용되지 않는다는 것을 뒤늦게 알았다. 아이콘을 이모지로만 구성한 건 이 때문이다.

---

## 만들고 보니

SDK를 팀 서비스에 붙이고 처음 QA를 돌렸을 때, "저는 되는데요"가 한 번도 나오지 않았다. 버그를 신고할 때 뷰어 링크 하나로 재현 경로, 콘솔 에러, API 응답을 모두 공유할 수 있어서 개발자가 바로 원인을 파악할 수 있었다.

Jira 티켓을 만들 때 FAB에서 직접 생성하고 링크가 자동으로 붙으니, 이전에 스크린샷을 별도로 첨부하고 재현 경로를 텍스트로 설명하던 것과 비교하면 확실히 효율적이다.

사이드 프로젝트를 만들면서 가장 크게 배운 건 기술 선택보다 **"왜 이 기능이 필요한가"를 먼저 정의하는 것**의 중요성이었다. rrweb을 선택한 이유가 "로그와의 동기화"였고, Supabase로 옮긴 이유가 "복합 쿼리와 Edge Function"이었듯, 이유가 명확하니 선택도 명확했다.

Firebase 1MB 제한, fetch `res.clone()`, Jira CORS, ADF 포맷. 사전에 몰랐던 것들이 실제로 만들면서 하나씩 튀어나왔다. 문서를 아무리 읽어도 직접 부딪혀봐야 아는 것들이 있다.

---

*SDK, Viewer, Supabase Edge Function 코드는 구현 세부 사항별로 TIL 시리즈로 따로 정리해두었습니다.*
