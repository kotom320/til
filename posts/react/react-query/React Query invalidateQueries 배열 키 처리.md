---

title: "React Query invalidateQueries 배열 키 처리 이슈"
date: "2025-06-17"
tags: ["React Query", "invalidateQueries", "TIL"]
summary: "queryClient.invalidateQueries에 배열로 여러 쿼리 키를 넘겼을 때, 의도한 대로 모두 초기화되지 않는 동작을 확인하고 해결 방법을 정리합니다."
-------------------------------------------------------------------------------------------------------

## 배경

* React Query의 `queryClient.invalidateQueries`를 사용해 특정 쿼리들을 무효화하려 함
* 여러 쿼리 키를 배열로 전달하면 한 번에 모두 초기화될 것이라 예상했으나, 실제로는 배열 전체를 하나의 복합 키로 해석해, 해당 복합 키를 가진 쿼리만 초기화됨
* 두 개 이상의 쿼리를 동시에 무효화하기 위한 방법을 학습하고자 함

## 배운 내용

1. **invalidateQueries 시 단일 QueryKey 해석 방식**

   ```ts
   // 예상: ['todos']와 ['users']를 모두 초기화
   queryClient.invalidateQueries([['todos'], ['users']]);
   ```

   * React Query 내부에서는 첫 번째 인수(`queryKey`)를 단일 QueryKey로 간주
   * 2차원 배열(`[[key1], [key2]]`) 전체를 하나의 키로 매칭하려 시도하기 때문에, 일치하는 쿼리가 없으면 아무 것도 초기화되지 않음

2. **여러 QueryKey 무효화 방법**

   * **방법 1: 개별 호출**

     ```ts
     const keys: QueryKey[] = [['todos'], ['users']];
     keys.forEach(key => {
       queryClient.invalidateQueries(key);
     });
     ```
   * **방법 2: predicate 옵션 사용 (v4 이상)**

```ts
queryClient.invalidateQueries({
  predicate: query =>
    ['todos', 'users'].some(key =>
      matchQueryKey(query.queryKey, [key])
    ),
});
```

* **predicate란?**

  * 특정 쿼리를 무효화할지 결정하는 **필터 함수**로, `query` 객체를 인수로 받아 `true`를 반환한 쿼리만 무효화함
  * `query.queryKey`나 `query.state` 등을 활용해 세밀하게 조건을 정의할 수 있음

    ```ts
    // 예: 'page'라는 queryKey를 포함하는 모든 쿼리 무효화
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        Array.isArray(queryKey) && queryKey.includes('page'),
    });
    ```
* **matchQueryKey** 함수 사용

  * `matchQueryKey(queryKey, filterKey)`는 React Query의 내부 유틸로, `queryKey` 배열이 `filterKey`를 포함하는지 검사
  * 직접 `includes`나 `JSON.stringify` 비교 대신 사용하면 더 정확한 매칭이 가능

    
  * **방법 3: filter 옵션 활용**

    ```ts
    queryClient.invalidateQueries({
      queryKey: ['todos'], // prefix로 todo 관련 모두
      exact: false,
    });
    queryClient.invalidateQueries({
      queryKey: ['users'],
      exact: false,
    });
    ```

3. **주의사항**

   * `invalidateQueries`는 첫 번째 인자로 **하나의** QueryKey 또는 필터 옵션 객체를 받음
   * 배열을 중첩하여 전달하면 멀티 키를 지원하지 않으므로 주의

## 코드 예제

```tsx
import { useQueryClient } from '@tanstack/react-query';

function refreshData() {
  const queryClient = useQueryClient();
  const keys: QueryKey[] = [['todos'], ['users']];

  // 올바른 방식: 각 키별로 호출
  keys.forEach(key => queryClient.invalidateQueries(key));
}
```

## 느낀 점

* API 사양을 정확히 이해해야 의도한 대로 동작시킬 수 있음을 다시 깨달음
* 여러 쿼리를 동시에 무효화할 때는 단일 호출이 아닌, 루프 또는 predicate 방식을 활용해야 함
* 문서화와 타입 설명을 꼼꼼히 확인하는 습관이 중요하다고 느꼈음

---
