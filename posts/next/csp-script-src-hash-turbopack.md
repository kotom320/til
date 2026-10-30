---
title: "Next.js SSG 에 CSP script-src 해시를 걸었더니 Turbopack 인라인 스크립트가 막혀 하이드레이션이 깨졌다"
date: "2026-10-30"
tags: ["Next.js", "CSP", "Turbopack", "보안"]
summary: "CSP 해시로는 Turbopack 인라인 스크립트를 허용할 수 없다"
---

## 문제 상황

블로그(Next.js 16 Pages Router, 전 페이지 SSG)의 CSP 에는 `script-src` 가 없었다. `_document` 에 테마 깜빡임을 막는 인라인 스크립트가 하나 있어서 제한하지 않고 있었다.

```ts
// _document.tsx
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    document.documentElement.setAttribute('data-theme', stored || 'light');
  } catch (e) {}
})();
`;
```

보안 강화 작업 중에 이 스크립트 문자열의 sha256 해시로 `script-src` 를 걸었다. 스크립트를 모듈로 빼고 `next.config.ts` 에서 같은 문자열을 해시하면 스크립트를 고쳐도 해시가 어긋나지 않는다.

```ts
// next.config.ts
import { createHash } from "node:crypto";
import { themeInitScript } from "./src/lib/theme-init-script";

const hash = createHash("sha256").update(themeInitScript).digest("base64");

const scriptSrc = [
  "'self'",
  `'sha256-${hash}'`,
  process.env.NODE_ENV === "development" && "'unsafe-eval'", // Fast Refresh 용
]
  .filter(Boolean)
  .join(" ");

// { key: "Content-Security-Policy", value: `script-src ${scriptSrc}; ...` }
```

`pnpm build` 는 통과했고 응답 헤더도 의도대로 나왔다. 그런데 `pnpm start` 후 브라우저로 열어 보니 홈의 포스트 목록이 비어 있었고 콘솔에 이 에러가 있었다.

```
Executing inline script violates the following Content Security Policy directive
'script-src 'self' 'sha256-i5vn...''. Either the 'unsafe-inline' keyword,
a hash ('sha256-238f...'), or a nonce ('nonce-...') is required to enable
inline execution. The action has been blocked.
```

`window.next` 가 `undefined` 였다. 하이드레이션 자체가 안 된 것이다. 홈은 클라이언트에서 `/api/posts` 를 fetch 해 목록을 그리기 때문에 목록이 통째로 사라졌다.

## 원인 분석

빌드된 HTML 에서 실행되는 인라인 `<script>` 를 뽑아 보니 내가 넣은 것 말고 하나가 더 있었다.

```bash
curl -s http://localhost:4100/post/some-post | grep -o '<script[^>]*>' | sort | uniq -c
#   1 <script id="__NEXT_DATA__" type="application/json">   ← JSON 이라 실행 대상 아님
#   ...  <script src="/_next/static/chunks/....js" defer="">  ← 'self' 로 허용됨
#   2 <script>                                              ← 인라인 2개
```

```js
// 두 번째 인라인 스크립트 (Turbopack 부트스트랩)
(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push({
  "otherChunks": ["static/chunks/0xzhydv7uuiww.js", ...],
  ...
})
```

Next 16 의 `next build` 는 기본이 Turbopack 이다. Turbopack 은 페이지마다 필요한 청크 목록을 등록하는 인라인 부트스트랩 스크립트를 HTML 에 넣는다. 이게 막히니 런타임이 청크를 이어 붙이지 못해 하이드레이션이 실패했다.

해시로 허용할 수 없는 이유는 이렇다.

- 내용에 **청크 파일명(콘텐츠 해시)** 이 들어 있어 빌드할 때마다 바뀐다.
- 페이지마다 필요한 청크가 달라 **페이지별로도 내용이 다르다**.
- `headers()` 는 `next.config.ts` 를 읽는 시점, 즉 빌드 **전에** 값이 정해진다. 빌드 결과물의 해시를 미리 알 방법이 없다.

## 해결 방법

`script-src` 제한을 되돌렸다. 나머지 지시어는 유지하고, 왜 `script-src` 를 막지 않는지 주석으로 남겼다.

```ts
// _document의 테마 스크립트와 Turbopack이 빌드마다 다르게 넣는 인라인 부트스트랩 때문에
// script-src는 제한하지 않는다 (SSG라 요청별 nonce도 쓸 수 없다)
{
  key: "Content-Security-Policy",
  value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
},
```

되돌린 뒤 같은 방법으로 확인했다. 콘솔 에러가 없었고, `window.next` 가 존재했고, 포스트 링크 125개가 정상으로 렌더링됐다.

## 왜 이 방법인가

인라인 스크립트를 CSP 로 허용하는 방법은 세 가지인데, 이 프로젝트 조건에서는 모두 맞지 않았다.

| 방법 | 이 프로젝트에서 안 되는 이유 |
|------|------------------------------|
| `'sha256-...'` 해시 | Turbopack 부트스트랩 내용이 빌드·페이지마다 달라 config 에서 미리 계산할 수 없다 |
| `'nonce-...'` | 요청마다 새 nonce 를 HTML 에 박아야 한다. 빌드 때 HTML 을 만들어 두는 SSG 와 맞지 않고, 쓰려면 모든 페이지를 동적 렌더링으로 바꿔야 한다 |
| `'unsafe-inline'` | 인라인 스크립트를 전부 허용하므로 `script-src` 를 거는 의미가 거의 없다 |

남은 선택지는 빌드 후 HTML 을 훑어 해시를 모으고 호스팅 설정에 주입하는 후처리 정도인데, 블로그 하나에 들이기엔 과하다. 게다가 글은 본인만 레포에 커밋하므로 XSS 입력 경로가 없다. 그래서 `script-src` 는 포기하고, 보호 효과가 확실한 `frame-ancestors`, `object-src`, `base-uri`, `form-action` 만 유지했다.

(webpack 빌드 `next build --webpack` 에서도 같은 인라인 스크립트가 생기는지는 확인하지 않았다.)

## 정리

CSP 를 바꿨으면 빌드 성공과 헤더 값만 보지 말고 **브라우저 콘솔과 하이드레이션까지 확인**한다. Next 16(Turbopack) 은 빌드마다 바뀌는 인라인 부트스트랩 스크립트를 넣으므로, SSG 에서는 해시도 nonce 도 `script-src` 를 해결해 주지 못한다.
