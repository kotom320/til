---
title: "프론트에도 서버는 있다: CSR 과 SSR 은 코드가 실행되는 위치의 차이"
date: "2026-10-27"
tags: ["CSR", "SSR", "Web", "Server"]
summary: "서버는 요청에 응답하는 것. 차이는 누가 JS 를 실행하나"
---

## 배경 / 계기

URL 로 받은 base64 를 `atob` 로 디코딩하는 코드가 갑자기 실패했다. 더 간단한 `Uint8Array.fromBase64` 를 쓰려고 보니 iOS 18.2 미만 WebView 에서는 지원되지 않았다. ([atob 는 base64url 과 한글을 못 푼다](/post/javascript/atob-base64url-utf8-decode))

여기서 의문이 생겼다. "우리 코드가 왜 사용자 브라우저 버전에 묶이지? CSR 이라서 그런가? SSR 이면 해결되나?"

그런데 SSR 을 떠올리는 순간 늘 막히던 지점이 있었다. **"프론트는 서버가 없는데, 서버 사이드 렌더링이 무슨 말이지?"** 따져 보니 문제는 SSR 이전에 "서버" 를 잘못 알고 있던 데 있었다.

## 핵심 개념

### 서버는 DB 가 아니다

나는 "서버 = 데이터를 보관하는 DB 서버" 로 생각하고 있었다. 실무에서 "서버 개발", "서버에 저장" 같은 말을 주로 그런 뜻으로 쓰다 보니 생긴 오해다. 원래 정의는 훨씬 넓다.

> **서버 = 요청을 받아서 응답을 돌려주는 프로그램 (또는 그게 돌아가는 컴퓨터)**

무엇을 돌려주느냐에 따라 이름이 달라질 뿐이다.

| 서버 | 받는 요청 | 돌려주는 것 | 예 |
|---|---|---|---|
| 정적 파일 서버 | "index.html 주세요" | 미리 빌드해 둔 HTML·JS·이미지 | S3 + CloudFront, nginx |
| API 서버 (WAS) | "단지 정보 주세요" | JSON 데이터 | Spring, Express |
| DB 서버 | API 서버의 SQL 쿼리 | 저장된 데이터 | MySQL, PostgreSQL |

사용자가 앱을 여는 흐름에 놓아 보면 이렇다.

```
브라우저 ──① 파일 요청──▶ 정적 파일 서버 (CloudFront)
         ◀── JS 파일 ───
   (여기서 JS 실행, atob 디코딩도 여기서)
브라우저 ──② API 요청──▶ API 서버 ──③ 쿼리──▶ DB 서버
         ◀── JSON ────           ◀── 데이터 ──
```

브라우저는 DB 에 직접 닿지 않는다. 그리고 **프론트에도 ① 서버는 항상 있었다.** 파일만 건네주는 역할이라 눈에 안 띄었을 뿐이다.

### CSR 과 SSR 의 차이는 ① 서버가 하는 일

| | ① 서버가 하는 일 | 화면을 만드는 JS 가 실행되는 곳 |
|---|---|---|
| **CSR** | 파일을 **그대로 전달만** 한다 | 사용자 브라우저 |
| **SSR** | Node 로 **JS 를 실행해서** HTML 을 만든 뒤 보낸다 | 우리 서버 (그 뒤 브라우저에서 hydration) |

SSR 을 하려면 ① 자리에 JS 를 실행할 수 있는 Node 서버가 필요하다. Next.js 같은 프레임워크가 서버를 띄워야 하는 이유가 이것이고, 흔히 "프론트 서버" 라고 부르는 게 바로 이 서버다.

## 예시 코드

base64 로 인코딩된 `household` 쿼리를 디코딩하는 같은 작업을 두 방식으로 놓아 보면 차이가 잘 보인다.

```ts
// CSR: 사용자 브라우저에서 실행된다. 오래된 기기까지 고려해 atob 를 쓴다
const binary = atob(household.replace(/-/g, '+').replace(/_/g, '/'));
const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
```

```ts
// SSR (Next.js App Router): 우리 서버의 Node 에서 실행된다
export default async function Page({ searchParams }: { searchParams: Promise<{ household: string }> }) {
  const { household } = await searchParams;
  const json = Buffer.from(household, 'base64').toString(); // base64url·UTF-8 다 처리
  const { dong, ho } = JSON.parse(json);
  return <p>{dong} {ho}</p>; // 브라우저는 완성된 HTML 만 받는다
}
```

## 왜 이 방법인가

"코드가 어디서 실행되나?" 로 물으면 어떤 런타임에 의존하는지가 바로 나온다.

| 질문 | CSR | SSR |
|---|---|---|
| 디코딩 코드는 어디서 실행되나? | 사용자 브라우저 | 우리 서버 |
| 무엇의 버전에 영향을 받나? | 사용자의 브라우저·WebView | 우리 서버의 Node |
| 버전을 우리가 정할 수 있나? | 없다 | 있다 |

이번 버그 때 처음엔 "Node 버전을 올려서 그런가" 를 의심했다. CSR 에선 Node 가 빌드 도구로만 쓰이니 원인이 될 수 없다. 반대로 SSR 이었다면 그 의심이 정확히 따져봐야 할 지점이 된다.

그렇다고 SSR 로 바꾸는 게 답은 아니다.

- **브라우저 의존이 사라지지 않는다.** SSR 이어도 클릭·입력·상태 관리는 hydration 뒤 브라우저에서 돈다. 서버로 옮겨지는 건 첫 화면을 그리는 데이터 처리 정도다.
- **비용이 크다.** 정적 파일 배포를 Node 서버 운영으로 바꾸는 일이다.

CSR 에서 "우리가 통제하는 곳에서 실행" 하고 싶다면 더 가벼운 길이 있다.

- **API 서버에 맡기기**: 원문을 그대로 넘기고 백엔드가 디코딩한다.
- **폴리필**: `core-js` 등으로 오래된 브라우저에 API 를 채운다.

빌드 target(Vite·Babel)은 `?.` 같은 **문법**만 옛날 형태로 바꿔 주고, `fromBase64` 같은 **API** 는 채워 주지 않는다. 빌드 설정만 낮춘다고 해결되지 않는 이유다.

렌더링 시점·SEO·성능 비교는 예전에 쓴 「SSR / SSG / CSR / SPA 개념 정리」 포스트에 있다. 이 글은 그 앞 단계인 "서버가 뭐고 코드가 어디서 도나" 를 다룬다.

## 정리

프론트에도 서버는 있다. CSR 은 서버가 파일만 건네고 브라우저가 JS 를 돌리는 것, SSR 은 서버가 직접 JS 를 돌려 HTML 을 만드는 것이다. 헷갈리면 "이 코드는 어디서 실행되나?" 를 물으면 된다.
