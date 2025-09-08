---
title: async 함수에서 `return` vs `throw`
date: "2025-09-08"
tags: [JavaScript, TypeScript, Async, ErrorHandling]
summary: "async 함수에서 성공/실패를 `return` 값으로 처리하는 방법과 `throw`를 통한 예외 처리의 차이"
---

## 1. 기본 개념

### 1.1 `return`

- async 함수는 항상 **Promise**를 반환합니다.
- `return 값` → `Promise.resolve(값)` 으로 감싸져 반환됩니다.

```ts
async function foo() {
  return 42;
}

foo().then(console.log); // 42
```

### 1.2 `throw`

- async 함수 내부에서 `throw`가 발생하면 → `Promise.reject(error)`로 변환됩니다.

```ts
async function bar() {
  throw new Error("문제 발생");
}

bar().catch((err) => console.error(err.message)); // "문제 발생"
```

---

## 2. boolean 패턴 (`true/false` 반환)

```ts
async function saveUser(data: User): Promise<boolean> {
  try {
    await api.post("/users", data);
    return true;
  } catch (e) {
    return false;
  }
}
```

- 성공 → `true`
- 실패 → `false`

### 장점

- 호출부가 간단합니다.

```ts
if (await saveUser(user)) {
  console.log("저장 성공!");
} else {
  console.log("저장 실패!");
}
```

---

## 3. 문제점

### 3.1 에러 정보 손실

- `throw`는 Error 객체를 전달하지만, boolean 패턴은 단순히 `false`만 반환합니다.
- 왜 실패했는지, 네트워크 문제인지, 인증 문제인지 알 수 없습니다.

### 3.2 흐름 제어 혼동

- 호출부에서 실패 원인에 따라 다른 처리를 하려면 boolean 패턴이 한계가 있습니다.
- 결국 `if-else` 블록이 지나치게 복잡해집니다.

### 3.3 의도 불명확

- 함수 이름만 보고는 "실패 시 false를 반환한다"는 사실을 알기 어렵습니다.
- API 호출이 실패했는데도 "성공/실패 여부만 알려준다"는 것은 협업 시 오해를 부를 수 있습니다.

---

## 4. 언제 boolean 패턴을 쓰면 좋은가?

**적합한 경우**

- 실패 원인이 중요하지 않고 단순 성공 여부만 필요할 때

  - 예: 토글 상태 저장, 단순 로깅 시도, 캐시 삭제 요청

- "실패해도 큰 문제가 없는 작업"에서 **fire-and-forget** 성격의 함수

**적합하지 않은 경우**

- 실패 이유에 따라 다른 처리가 필요할 때

  - 예: 로그인 실패 (비밀번호 오류 vs 서버 오류)

- API 응답 에러 메시지가 중요한 경우
- 디버깅, 로깅, 사용자 알림이 필요한 경우

---

## 5. 권장 패턴

- **실패 원인이 중요한 함수 → `throw` 사용**
- **성공 여부만 간단히 알면 되는 함수 → boolean 패턴 허용**

---

## 6. 정리

- `return` → 항상 성공 결과를 `Promise.resolve`로 감싸 반환
- `throw` → 실패를 `Promise.reject`로 감싸 반환
- boolean 패턴은 간단하지만 에러 정보를 잃을 수 있음
- 상황에 따라 혼합 사용하되, **중요한 비즈니스 로직은 반드시 `throw`로 예외 처리**하는 것이 안전하다.
