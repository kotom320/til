---

title: "JavaScript await와 이벤트 루프, 마이크로태스크 동작 원리"
date: "2025-08-14"
tags: ["JavaScript", "EventLoop", "Async/Await", "Promise", "Microtask", "Macrotask"]
summary: "await의 동작을 이벤트 루프와 마이크로태스크 관점에서 분석하고, 실행 순서를 예시와 함께 정리"
---

## 1. 배경

기존에는 `await`를 단순히 "앞 코드가 끝날 때까지 기다린다"로 이해했지만,
실제로는 이벤트 루프, 매크로태스크, 마이크로태스크 개념이 얽혀 있습니다.
오늘은 이 동작을 심화적으로 정리했습니다.

---

## 2. 이벤트 루프와 태스크 종류

JavaScript는 싱글 스레드 환경에서 이벤트 루프를 통해 태스크를 처리합니다.

| 구분                           | 예시                                        | 실행 시점                          |
| ------------------------------ | ------------------------------------------- | ---------------------------------- |
| **매크로태스크(Macro Task)**   | `setTimeout`, `setInterval`, I/O, UI 렌더링 | 이벤트 루프 한 바퀴가 끝날 때      |
| **마이크로태스크(Micro Task)** | `Promise.then`, `await`, `queueMicrotask`   | 현재 매크로태스크가 끝난 직후 실행 |

---

## 3. `await`의 동작 원리

- `await`는 내부적으로 Promise를 반환하며, 이후 코드를 마이크로태스크 큐에 넣습니다.
- 현재 매크로태스크가 끝난 뒤 마이크로태스크가 실행됩니다.

```js
async function test() {
  console.log("A");
  await null; // Promise.resolve(null)
  console.log("B");
}
test();
console.log("C");
```

실행 순서:

```
A
C
B
```

---

## 4. await + 동기 함수 + 비동기 함수 예시

```js
async function main() {
  console.log("1");
  await fun1(); // 마이크로태스크 예약
  fun2(); // 동기 실행
  await fun3(); // 마이크로태스크 예약
  console.log("4");
}

function fun1() {
  console.log("fun1");
}
function fun2() {
  console.log("fun2");
}
function fun3() {
  console.log("fun3");
}

main();
console.log("end");
```

실행 순서:

```
1
fun1
end
fun2
fun3
4
```

---

## 5. 실행 흐름 요약

1. `await`는 Promise가 resolve될 때까지 기다린다.
2. `await` 이후 코드는 **마이크로태스크 큐**에 들어간다.
3. 마이크로태스크는 매크로태스크보다 우선 실행된다.
4. 동기 함수는 즉시 실행된다.
5. `setTimeout`보다 `await` 이후 코드가 먼저 실행된다.

---

## 6. 결론

- `await`는 코드의 순서를 "완전히 동기"로 만드는 것이 아니라,
  **비동기 흐름을 마이크로태스크로 제어**한다.
- 실행 순서를 이해하면 `await`와 `Promise` 체이닝, 그리고 `setTimeout` 동작을 예측할 수 있다.
