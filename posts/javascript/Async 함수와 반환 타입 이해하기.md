---
title: "Async 함수와 반환 타입 이해하기"
date: "2025-09-02"
tags: [JavaScript, TypeScript, Async, Promise]
summary: "async 함수는 항상 Promise를 반환합니다. 반환 타입을 생략했을 때와 return이 없는 경우 어떻게 동작하는지 정리합니다."
---

## 배경

코드 정적 분석 도구(SonarQube 등)에서 `async` 함수의 반환 타입과 관련된 경고를 본 경험이 있었음.
`async` 함수에 `return`을 작성하지 않았는데도 반환 타입은 자동으로 `Promise<void>`로 추론된다는 점이 혼동을 줌.

```ts
async function runTasks() {
  await task1(); // return이 없지만 Promise<void>로 추론됨
}
```

이처럼 반환 타입을 명시하지 않아도 `async` 함수는 항상 `Promise`를 반환하게 됨.

---

## 핵심 정리

1. **`async` 함수의 반환 규칙**

   - `async` 함수는 무조건 `Promise`를 반환.
   - `return` 값이 없으면 `Promise<void>`.
   - `return value`가 있으면 `Promise<타입>`.

   ```ts
   async function noReturn() {
     console.log("done");
   }
   // 타입: () => Promise<void>

   async function withReturn() {
     return 42;
   }
   // 타입: () => Promise<number>
   ```

2. **SonarQube의 경고 의미**

   - `async` 함수는 본질적으로 비동기 작업을 모델링하는데, `return`이 없으면 의도치 않게 무시될 수 있다고 경고.
   - 하지만 실제 타입 시스템에서는 문제 없음 (`Promise<void>`로 추론).

3. **`void`와 혼동하지 말기**

   - `async function fn(): void { ... }` → TypeScript 오류 발생 (반환 타입 불일치).
   - `async function fn() { ... }` → 자동으로 `Promise<void>`로 추론 (문제 없음).

---

## 느낀 점

- `async` 함수는 항상 `Promise`를 반환한다는 점을 명확히 이해해야 함.
- `return`이 없어도 `Promise<void>`로 처리되므로 크게 문제는 없으나,
  분석 도구가 경고하는 경우는 "의도한 것인지 확인하라"는 의미로 받아들이는 것이 좋음.
- 반환 타입을 굳이 `void`로 지정하는 실수를 하지 않도록 주의해야 함.
