---
title: "자바스크립트의 이벤트 루프(Event Loop) 간단 정리"
date: "2025-05-27"
tags: ["JavaScript", "Event Loop", "TIL"]
summary: "자바스크립트의 싱글 스레드, 콜백 큐, 마이크로태스크 개념을 리마인드합니다."
---

블로그의 첫 글로 자바스크립트의 이벤트 루프 개념을 다시 정리해봤다.

---

## 핵심 개념

- **자바스크립트는 싱글 스레드 언어**이다.
- 실행 컨텍스트가 콜 스택(Call Stack)에 쌓여 실행된다.
- 비동기 작업은 **Web APIs → Task Queue(또는 Microtask Queue)** 를 거쳐 다시 콜 스택으로 돌아온다.

---

## 이벤트 루프 작동 방식 요약

1. 콜 스택이 비어 있을 때,
2. 먼저 **마이크로태스크 큐**를 비우고,
3. 그 다음 **태스크 큐(매크로 태스크)** 를 실행한다.

---

## 예시 코드

```js
console.log("start");

setTimeout(() => {
  console.log("setTimeout");
}, 0);

Promise.resolve().then(() => {
  console.log("promise");
});

console.log("end");
```

### 예상 출력

```
start
end
promise
setTimeout
```

> `Promise.then()`은 **microtask**, `setTimeout()`은 **macrotask**이기 때문에 `promise`가 먼저 실행된다.

---

## 리마인드 포인트

- `setTimeout(fn, 0)`도 실제로는 **0초 뒤가 아니다!**
- 마이크로태스크가 우선시되므로, `Promise.then`은 항상 먼저 실행된다.
- 브라우저마다 이벤트 루프 구현 세부사항은 다를 수 있다.
