---

title: "React Query useMutation: Hook-level vs Call-level onSuccess 차이 및 실행 순서"
date: "2025-07-30"
tags: ["React Query", "useMutation", "onSuccess", "Mutation", "Callbacks"]
summary: "useMutation 훅 옵션의 onSuccess과 mutate 호출 옵션의 onSuccess 차이점과, 콜백이 호출되는 순서를 정리합니다."
---

## 개요

React Query의 `useMutation`에서는 **훅 수준(hook-level)** 과 **호출 수준(call-level)** 에서 별도의 콜백을 등록할 수 있습니다.

* 훅 수준(onSuccess 등): 해당 뮤테이션 인스턴스의 모든 호출에 대해 실행
* 호출 수준(onSuccess 등): 특정 `mutate` 호출에만 실행

---

## 1. Hook-level 콜백

```ts
const mutation = useMutation(mutationFn, {
  onSuccess: (data, variables, context) => {
    // 이 뮤테이션 인스턴스의 모든 성공 시마다 실행
  },
  onError: (error, variables, context) => {
    // 모든 실패 시마다 실행
  },
  onSettled: (data, error, variables, context) => {
    // 성공/실패 공통 후처리
  },
});
```

- `useMutation`의 옵션으로 지정
- 재사용성을 높여 공통 로깅, 글로벌 캐시 갱신 등에 적합

---

## 2. Call-level 콜백

```ts
mutation.mutate(variables, {
  onSuccess: (data, variables, context) => {
    // 이 한 번의 mutate 호출 성공 시에만 실행
  },
  onError: (error, variables, context) => {
    // 이 한 번의 호출 실패 시에만 실행
  },
  onSettled: (data, error, variables, context) => {
    // 이 한 번의 호출 완료 시 실행
  },
});
```

- `mutate` 호출 시 인자로 전달
- 특정 동작(예: 개별 버튼 클릭이나 폼 제출)에 특화된 후처리에 적합

---

## 3. 사용 용도 비교

| 용도            | Hook-level 콜백                             | Call-level 콜백                            |
| --------------- | ------------------------------------------- | ------------------------------------------ |
| **범용 처리**   | ✅ 공통 로깅, 전역 토스트, 글로벌 캐시 갱신 | ❌                                         |
| **단발성 처리** | ❌                                          | ✅ 특정 UI 동작(폼 제출, 개별 액션)에 적합 |
| **재사용성**    | ✅ 뮤테이션 인스턴스마다 한 번만 정의 가능  | ❌ 호출마다 옵션을 중복 정의해야 함        |

---

## 4.콜백 실행 순서

React Query 내부에서는 다음 순서로 콜백들을 호출합니다:

1. **onMutate**
   1. Hook-level onMutate (if provided)
   2. Call-level onMutate (if provided)
2. **mutationFn 실행**
3. **성공 시**
   1. Call-level onSuccess
   2. Hook-level onSuccess
4. **실패 시**
   1. Call-level onError
   2. Hook-level onError
5. **완료 시(성공/실패 공통)**
   1. Call-level onSettled
   2. Hook-level onSettled

---

## 느낀 점

- 훅-레벨 콜백으로 공통 후처리를 정의해 코드를 깔끔하게 유지하고,
- 호출-레벨 콜백으로 특화된 UI 동작을 제어하면, 유연하면서도 일관된 뮤테이션 로직을 설계할 수 있습니다.
- 콜백 호출 순서를 이해하면, 우선순위에 맞춰 효과적으로 사이드 이펙트를 관리할 수 있습니다.
