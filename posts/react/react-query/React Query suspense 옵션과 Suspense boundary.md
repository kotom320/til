---
title: "React Query suspense 옵션과 Suspense boundary"
date: "2025-09-08"
tags: [React, ReactQuery, Suspense, ErrorHandling, TIL]
summary: "React Query에서 suspense 옵션을 활성화했을 때 반드시 Suspense boundary로 감싸야 하는 이유를 정리합니다."
---

## 배경

- React Query는 기본적으로 `isLoading` 같은 상태값으로 로딩을 표현한다.
- `suspense: true` 옵션을 주면 로딩 상태 대신 **Promise를 throw**하여 React의 Suspense 메커니즘에 위임한다.

## 동작 원리

1. `useQuery({ suspense: true })` → 로딩 중일 때 Promise를 throw.
2. React는 상위에서 `<Suspense fallback={...}>`를 탐색.
3. fallback UI를 렌더링하고, Promise가 resolve되면 컴포넌트를 다시 렌더링.

## Suspense로 감싸지 않으면?

- Promise를 처리할 boundary가 없어 **Unhandled Promise Error**가 발생.
- 화면이 깨질 수 있음.

## 예시 코드

```tsx
// ❌ Suspense boundary 없으면 에러 발생
function MyComponent() {
  const { data } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    suspense: true,
  });
  return <div>{data.title}</div>;
}

// ✅ Suspense boundary로 감싸기
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyComponent />
    </Suspense>
  );
}
```

## 정리

- `suspense: true` → 반드시 `<Suspense fallback>`으로 감싸야 안전하다.
- 그렇지 않으면 로딩 상태를 처리하지 못해 런타임 에러 발생.
