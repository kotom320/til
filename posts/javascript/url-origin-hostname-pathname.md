---
title: "URL 객체의 origin, hostname, pathname 비교"
date: "2026-05-18"
tags: ["JavaScript", "URL", "Web API"]
summary: "URL 프로퍼티 세 가지의 포함 범위와 읽기/쓰기 차이"
---

## 배경 / 계기

URL을 파싱해서 출처(origin)를 비교하거나 경로(pathname)를 추출할 일이 자주 있는데, `origin` / `hostname` / `pathname`이 각각 어디까지 포함하는지 헷갈려서 정리했다.

## 핵심 개념

```
https://example.com:8080/path/to/page?q=hello#section
```

| 프로퍼티 | 값 | 포함 내용 |
|---|---|---|
| `origin` | `"https://example.com:8080"` | scheme + host + port |
| `hostname` | `"example.com"` | host만 (포트 제외) |
| `pathname` | `"/path/to/page"` | 경로만 (쿼리, 해시 제외) |

`host`는 `hostname`과 다르다. 포트가 있으면 `"example.com:8080"`처럼 포트를 포함한다.

## 예시 코드

```js
const url = new URL("https://example.com:8080/path/to/page?q=hello#section");

url.origin;   // "https://example.com:8080"
url.hostname; // "example.com"
url.host;     // "example.com:8080"
url.pathname; // "/path/to/page"
url.search;   // "?q=hello"
url.hash;     // "#section"
```

포트가 없는 경우:

```js
const url = new URL("https://example.com/path");

url.origin;   // "https://example.com"
url.hostname; // "example.com"
url.host;     // "example.com"  (hostname과 동일)
```

## 왜 이 방법인가

출처 비교가 목적이면 `origin`을 쓰는 게 가장 안전하다. `hostname`만 비교하면 포트가 다른 서로 다른 출처를 같다고 판단할 수 있다.

```js
// 포트가 다르면 다른 출처지만 hostname은 같다
const a = new URL("https://example.com:3000");
const b = new URL("https://example.com:4000");

a.hostname === b.hostname; // true  (잘못된 비교)
a.origin === b.origin;     // false (올바른 비교)
```

또한 `origin`은 read-only이지만, `hostname`과 `pathname`은 직접 재할당이 가능하다.

## 정리

출처 비교에는 `origin`, 포트 없는 도메인만 필요하면 `hostname`, 경로 추출에는 `pathname`을 쓴다.
