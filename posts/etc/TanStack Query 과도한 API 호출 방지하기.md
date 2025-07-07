---

title: "TanStack Query 과도한 API 호출 방지하기"
date: "2025-06-23"
tags: ["TanStack Query", "API", "Performance", "Refetch"]
summary: "TanStack Query 사용 시 자동 리패칭으로 인한 불필요한 API 호출 상황과 이를 제어하는 주요 옵션을 정리합니다."
--------------------------------------------------------------------------------

## 배경

* TanStack Query를 도입하면 서버 상태를 간편히 관리할 수 있지만,
  기본 설정만 사용하면 **불필요한 API 호출**이 발생할 수 있음
* 특히 클라이언트 캐시(`staleTime`)와 서버 원본 상태가 달라질 때, 자동 리패칭 트리거가 과도하게 동작함
* 주요 원인과 해결책을 정리해보고자 함

## 배운 내용

### 1. 자동 리패칭 트리거

* 기본적으로 `useQuery`는 다음 상황에서 자동으로 리패칭:

  * **컴포넌트 마운트** (`refetchOnMount: true`)
  * **윈도우 포커스** (`refetchOnWindowFocus: true`)
  * **네트워크 리커넥션** (`refetchOnReconnect: true`)
* 이 때문에 **staleTime**이 짧거나 `cacheTime`이 경과한 뒤 다시 마운트될 때마다
  수시로 API 호출이 발생할 수 있음

### 2. 불필요 호출 예시

```tsx
const { data } = useQuery(['todos'], fetchTodos, {
  staleTime: 0,               // 즉시 stale 처리
  refetchOnWindowFocus: true, // 포커스마다 리패칭
});
// 탭 전환 또는 새로고침 시 매번 fetchTodos 요청 실행
```

### 3. 과도 호출 방지 옵션

1. **staleTime 설정**

   ```ts
   useQuery(['todos'], fetchTodos, { staleTime: 5 * 60 * 1000 });
   // 5분간 캐시를 fresh로 간주 → 그 사이에는 리패칭하지 않음
   ```

2. **refetchOnWindowFocus / refetchOnReconnect 비활성화**

   ```ts
   useQuery(['todos'], fetchTodos, {
     refetchOnWindowFocus: false,
     refetchOnReconnect: false,
   });
   ```

3. **enabled 옵션으로 수동 제어**

   ```ts
   const shouldFetch = Boolean(userId);
   useQuery(['profile', userId], fetchProfile, { enabled: shouldFetch });
   // userId가 있어야만 API 호출 실행
   ```

4. **queryClient.setQueryDefaults**

   ```ts
   queryClient.setQueryDefaults(['todos'], {
     staleTime: 10 * 60 * 1000,
     refetchOnWindowFocus: false,
   });
   ```

   * 전역 기본값으로 설정해 여러 쿼리에 일괄 적용 가능

## 코드 예제

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';

function Todos() {
  const queryClient = useQueryClient();
  const { data } = useQuery(
    ['todos'],
    fetchTodos,
    {
      staleTime: 300_000,           // 5분
      cacheTime: 600_000,           // 10분
      refetchOnWindowFocus: false,  // 포커스 시 리패칭 방지
      refetchOnReconnect: false,    // 네트워크 복구 시 리패칭 방지
    }
  );

  return <TodoList items={data || []} />;
}
```

## 느낀 점

* 기본 설정만으로도 편리하지만, **staleTime** 과 **refetchOn...** 옵션을 통해 상황에 맞게 최적화해야 함
* 캐시 정책을 잘 설계하면 네트워크 비용 절감과 UX 개선을 동시에 달성할 수 있음
* 프로젝트 초기 단계에서 전역 기본(defaults)을 설정하고, 개별 쿼리에는 필요한 경우에만 오버라이드하는 패턴을 추천함

---
