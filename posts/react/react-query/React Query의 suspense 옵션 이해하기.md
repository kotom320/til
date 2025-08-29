---
title: "React Query의 suspense 옵션 이해하기"
date: "2025-08-29"
tags: [React, React-Query, Suspense, TIL]
summary: "React Query에서 suspense 옵션이 어떻게 동작하는지와, 로딩/에러 처리를 컴포넌트 단에서 단순화할 수 있는 방법을 정리합니다."
---

## 배경

React Query는 서버 상태 관리 라이브러리로, `isLoading`, `isError`, `data` 등을 직접 제어하면서 UI를 구성합니다. 하지만 `suspense: true` 옵션을 사용하면 React의 Suspense와 Error Boundary를 활용해 더 단순한 코드를 작성할 수 있습니다.

## 동작 방식

1. **suspense: true**

   - 쿼리가 로딩 중일 때, React Query는 `Promise`를 던집니다.
   - 이 `Promise`는 React의 `<Suspense>` 컴포넌트가 캐치하여 `fallback` UI를 표시합니다.

2. **에러 처리**

   - 쿼리 실행 중 에러가 발생하면 `throw error`를 실행합니다.
   - 이 에러는 React의 `<ErrorBoundary>`에서 캐치할 수 있습니다.

## 예시 코드

```tsx
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

function User() {
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
    suspense: true,
  });
  return <div>{data.name}</div>;
}

export default function App() {
  return (
    <ErrorBoundary fallback={<div>에러 발생!</div>}>
      <Suspense fallback={<div>로딩 중...</div>}>
        <User />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## 장점

- `isLoading`, `isError` 분기 처리가 필요 없음
- UI 코드가 간결해짐
- React 18의 Concurrent Rendering과 자연스럽게 어울림

## 주의사항

- Suspense를 사용하려면 반드시 **에러 바운더리**와 함께 써야 안전합니다.
- 에러 상태나 로딩 상태를 좀 더 세밀하게 제어하려면 `suspense` 대신 기존 방식(`isLoading`, `isError`)을 쓰는 게 낫습니다.

## 결론

React Query의 `suspense` 옵션은 로딩/에러 처리를 React에 위임함으로써 UI를 단순하게 만들 수 있는 강력한 기능입니다. 다만 프로젝트 전반에서 일관되게 사용하는 것이 중요합니다.
