---
title: "atob 는 base64url 과 한글을 못 푼다: TextDecoder 와 함께 쓰는 이유"
date: "2026-10-27"
tags: ["JavaScript", "base64", "atob", "TextDecoder"]
summary: "atob 는 바이트 문자열을 준다. 한글은 TextDecoder 로 한 번 더"
---

## 문제 상황

URL 쿼리로 받은 base64 JSON 을 풀어서 화면에 채우는 코드가 있었다.

```ts
const decode = (base64: string) => JSON.parse(atob(base64));
```

코드는 몇 달째 그대로인데 어느 날부터 에러 모니터링에 아래 에러가 대량으로 쌓이기 시작했다. 마침 Node 버전을 올린 직후라 처음엔 그쪽을 의심했다.

```
Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded.
```

Node 는 원인이 아니었다. `on 'Window'` 라는 문구 그대로 브라우저가 실행하는 `atob` 의 에러이고, 빌드 도구의 Node 버전은 브라우저의 `atob` 동작을 바꾸지 못한다.

실패한 값을 하나 받아서 보니 이랬다.

```
eyJkb25nIjoiMTAy64-ZIiwiaG8iOiI2MDMifQ
→ {"dong":"102동","ho":"603"}
```

## 원인 분석

문제가 두 겹이었다.

### 1. base64url 이라 `-`, `_` 가 섞여 있었다

base64 에는 알파벳이 두 종류 있다.

| | 62번 | 63번 | 패딩 |
|---|---|---|---|
| 표준 base64 | `+` | `/` | `=` 필수 |
| base64url | `-` | `_` | 보통 생략 |

`atob` 는 표준 알파벳만 받는다. 패딩이 없는 건 괜찮지만 `-`, `_` 가 하나라도 있으면 바로 에러를 낸다.

```js
atob('eyJkb25nIjoiMTAy64-ZIiwiaG8iOiI2MDMifQ'); // InvalidCharacterError
```

"코드는 그대로인데 갑자기" 터진 이유도 여기 있다. 62번·63번 문자가 나오는지는 **데이터에 따라** 달라진다. 동이 `"102"` 처럼 숫자일 땐 인코딩 결과에 `-`·`_` 가 한 번도 안 나와서 문제가 숨어 있었고, `"102동"` 이 들어오자 처음 드러났다.

```
{"dong":"102","ho":"603"}   → eyJkb25nIjoiMTAyIiwiaG8iOiI2MDMifQ      (문제 없음)
{"dong":"102동","ho":"603"} → eyJkb25nIjoiMTAy64-ZIiwiaG8iOiI2MDMifQ  (- 포함)
```

### 2. `atob` 는 문자열이 아니라 바이트를 준다

`-` 를 `+` 로 바꿔 넣으면 에러는 사라지지만 한글이 깨진다.

```js
atob('eyJkb25nIjoiMTAy64+ZIiwiaG8iOiI2MDMifQ'); // '{"dong":"102ë","ho":"603"}'
```

`atob` 는 이름과 달리 "base64 → 문자열" 이 아니라 **"base64 → 바이트 하나당 한 글자(0~255)인 문자열"** 이다. `동` 은 UTF-8 로 3바이트(`EB 8F 99`)라서, 각 바이트가 Latin-1 문자 하나로 풀려 `ë` 와 보이지 않는 문자 2개가 된다. 반대 방향인 `btoa('동')` 은 아예 에러를 낸다.

## 해결 방법

알파벳을 표준으로 맞춘 뒤, `atob` 가 준 바이트를 `TextDecoder` 로 UTF-8 디코딩한다.

```ts
const decodeBase64Json = (base64: string) => {
  // base64url(-, _)도 받는다. 패딩은 atob 가 없어도 처리한다
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  // atob 결과는 바이트 문자열이라 한글은 UTF-8 로 다시 디코딩한다
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

decodeBase64Json('eyJkb25nIjoiMTAy64-ZIiwiaG8iOiI2MDMifQ');     // { dong: '102동', ho: '603' }
decodeBase64Json('eyJkb25nIjoiMTAy64+ZIiwiaG8iOiI2MDMifQ==');   // { dong: '102동', ho: '603' }
```

표준·base64url, 패딩 유무, ASCII·한글 값이 모두 이 함수 하나로 풀린다.

## 왜 이 방법인가

"atob 말고 더 좋은 게 없나?" 를 따져 봤다.

| 방법 | 장점 | 걸리는 점 |
|---|---|---|
| `atob` + `TextDecoder` | 모든 브라우저·WebView 지원, 의존성 0 | 코드가 3줄로 늘어난다 |
| `Uint8Array.fromBase64(s, { alphabet: 'base64url' })` | 표준 API 한 줄, base64url 옵션 내장 | 최근 브라우저에만 있다 (Chrome 140, Safari 18.2, Firefox 133 무렵부터). iOS 업데이트를 안 한 WebView 에선 없다. TS 5.9 기본 lib 에 타입도 없다 |
| `Buffer.from(s, 'base64url')` | Node 에선 가장 간단 | 브라우저 전역에 없다. Vite 는 Node 폴리필을 자동으로 넣지 않는다 |
| `js-base64` 같은 라이브러리 | UTF-8·url-safe 를 알아서 처리 | 함수 하나 때문에 의존성이 늘어난다 |
| `decodeURIComponent(escape(atob(s)))` | 예전에 많이 쓰던 한 줄 | `escape` 는 deprecated. 지금 쓸 이유가 없다 |

앞으로 갈 방향은 `Uint8Array.fromBase64` 다. 바이트를 주는 API 라 이름과 동작이 일치하고, base64url 알파벳도 옵션으로 받는다. 다만 앱 안의 WebView 처럼 런타임 버전을 통제할 수 없는 곳에서는 아직 이르다. 지원 범위가 충분히 넓어지기 전까지는 `atob` + `TextDecoder` 가 가장 안전한 선택이다.

```ts
// 지원 환경이 충분해지면 이렇게 바꿀 수 있다
const bytes = Uint8Array.fromBase64(base64, { alphabet: 'base64url' });
const json = JSON.parse(new TextDecoder().decode(bytes));
```

참고로 `fromBase64` 의 `alphabet: 'base64url'` 은 `+`, `/` 가 섞인 표준 값을 거부한다. 지금 코드처럼 두 알파벳을 모두 받아야 한다면 치환 단계는 그대로 필요하다.

## 자주 헷갈리는 것

### base64 를 "바로" 디코딩하면 안 되나?

base64 는 글자가 아니라 **바이트**를 인코딩한다. 인코딩하는 쪽은 사실 두 단계를 거친다.

```
"102동"  →(UTF-8)→  31 30 32 EB 8F 99  →(base64)→  MTAy64+Z
 글자                    바이트                       base64
```

그러니 디코딩도 두 단계를 거꾸로 밟아야 한다.

```
MTAy64+Z  →(atob)→  바이트 6개  →(TextDecoder)→  "102동"
```

ASCII 는 1글자 = 1바이트이고 바이트 값과 글자 값도 같다. 그래서 ASCII 만 있을 땐 `atob` 한 번으로 **우연히** 맞게 풀린다. 다른 언어에서 한 줄로 끝나는 것처럼 보이는 것도 안을 보면 두 단계다.

```java
// Java: base64 → 바이트 → UTF-8 문자열
new String(Base64.getUrlDecoder().decode(s), StandardCharsets.UTF_8);
```

### 온라인 디코딩 사이트는 바로 풀어 주던데?

사이트도 내부에서 두 단계를 거친다. 버튼이 하나라 한 번에 되는 것처럼 보일 뿐이다. 대부분 "Source charset: UTF-8" 같은 옵션이 있는데, 그게 우리 코드의 `TextDecoder` 단계다. `-`·`_` 도 알아서 받아 주는 경우가 많아서 base64url 문제도 안 보인다.

charset 을 Latin-1(ISO-8859-1)로 바꿔 보면 `atob` 만 쓴 것과 똑같이 `102ë` 가 나온다.

### `encodeURIComponent` 랑은 무슨 관계?

이름은 비슷하지만 다른 인코딩이다.

| | base64 (`btoa` / `atob`) | 퍼센트 인코딩 (`encodeURIComponent`) |
|---|---|---|
| 용도 | 바이트를 64종 글자로 표현 | URL 에 넣으면 안 되는 문자를 이스케이프 |
| `"102동"` | `MTAy64+Z` | `102%EB%8F%99` |

그래도 두 군데에서 만난다.

**1. 예전에 한글 base64 를 풀던 꼼수**

```js
decodeURIComponent(escape(atob(s)));
```

`escape` 로 바이트를 `%EB%8F%99` 형태로 만든 뒤 `decodeURIComponent` 에게 UTF-8 해석을 맡기는 방식이다. 결국 `TextDecoder` 단계를 우회해서 한 것이다. `escape` 가 deprecated 라 지금은 쓰지 않는다.

**2. 표준 base64 를 URL 에 넣을 때**

표준 base64 의 `+`, `/`, `=` 는 URL 에서 의미가 있는 문자다. 특히 쿼리스트링에서 `+` 는 공백으로 해석된다.

```js
new URLSearchParams('q=MTAy64+Z').get('q'); // 'MTAy64 Z'
```

그래서 표준 base64 를 쿼리에 넣으려면 `encodeURIComponent` 로 감싸야 한다. base64url 은 이 문제를 피하려고 처음부터 URL 에 안전한 `-`, `_` 를 쓰도록 만든 포맷이다.

## 정리

`atob` 는 "base64 → 바이트 문자열" 이다. 받기 전에 `-`·`_` 를 `+`·`/` 로 바꾸고, 받은 뒤엔 `TextDecoder` 로 UTF-8 을 풀어야 한글이 안 깨진다.
