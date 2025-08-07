---

title: "React Query: removeQueries vs invalidateQueries 비교"
date: "2025-08-07"
tags: ["React Query", "removeQueries", "invalidateQueries", "Cache"]
summary: "React Query의 removeQueries와 invalidateQueries 메서드 동작 차이와 사용 시나리오를 정리합니다."
-----------------------------------------------------------------------------------

## 1. 개요

React Query는 클라이언트 캐시를 효율적으로 관리하기 위해 다양한 도구를 제공합니다. 그중 `invalidateQueries`와 `removeQueries`는 캐시된 쿼리를 다루는 대표적인 메서드로, 각각의 목적과 동작이 다릅니다.

## 2. invalidateQueries

* **역할**: 지정한 쿼리 키에 해당하는 캐시를 **만료(invalidate)** 시켜, 다음에 해당 쿼리를 사용하는 컴포넌트에서 **재패칭(fetch)** 하도록 유도
* **동작 시점**: 즉시 만료 플래그를 세팅하고, 백그라운드에서 재요청 수행 가능
* **주요 옵션**:

  * `queryKey`: 만료할 대상 키 또는 부분 키 패턴
  * `refetchActive`: 활성화된(active) 쿼리만 재패칭(기본 `true`)
  * `refetchInactive`: 비활성(inactive) 쿼리도 재패칭(기본 `false`)

```ts
// 예시: 'todos' 쿼리 만료 및 재요청
queryClient.invalidateQueries('todos');

// 부분 키 매칭: ['todos', userId] 형태의 모든 todos 쿼리를 만료
queryClient.invalidateQueries(['todos']);
```

## 3. removeQueries

* **역할**: 지정한 쿼리 키에 해당하는 캐시를 **완전히 제거(remove)** 하여, 메모리에서 아예 삭제
* **동작 시점**: 즉시 삭제되고, 이후 쿼리를 사용하면 새로부터 fetch
* **주요 옵션**:

  * `queryKey`: 제거할 대상 키 또는 패턴
  * `exact`: 정확히 일치하는 키만 제거(기본 `false`)

```ts
// 예시: 'todos' 캐시 완전 삭제
queryClient.removeQueries('todos');

// 정확히 ['todos', 123] 쿼리만 삭제
queryClient.removeQueries(['todos', 123], { exact: true });
```

## 4. 핵심 비교

| 기능            | invalidateQueries      | removeQueries            |
| ------------- | ---------------------- | ------------------------ |
| 캐시 상태 변경      | 만료(mark as stale)      | 삭제(remove from cache)    |
| 재패칭(fetch) 유도 | 예 (자동 재패칭 가능)          | 아니오 (다음 사용 시 fetch)      |
| 메모리 사용량       | 유지                     | 해제                       |
| 사용 예시         | 데이터 갱신 후 UI 실시간 동기화 필요 | 더 이상 쓰지 않는 쿼리 정리, 메모리 회수 |

## 5. 사용 시나리오

* **invalidateQueries**

  * 데이터 변경(POST/PUT/DELETE) 직후, 최신 데이터 갱신을 위해 기존 쿼리 만료 → 백그라운드 재패칭
  * form submit 후 에러 없이 완료됐을 때 관련 리스트 refresh

* **removeQueries**

  * 사용자 로그아웃 시 개인 관련 캐시 전체 삭제
  * 대규모 일시적 쿼리(검색 결과 등)를 사용 후 명시적 메모리 해제

## 6. 주의사항

* 잦은 `removeQueries` 사용은 캐시 히트율을 떨어뜨려 불필요한 네트워크 요청 증가 유발 가능
* `invalidateQueries`는 만료 플래그만 설정하므로, 캐시에 여전히 메모리가 남음
* 패턴 매칭 시 의도치 않은 쿼리가 만료/삭제될 수 있으니, 키 구조를 설계할 때 주의

## 7. 느낀 점

* invalidate와 remove는 비슷해 보여도, **목적(fetch 유도 vs 메모리 해제)** 이 분명히 다름
* 적절한 캐시 관리 전략으로 네트워크 비용과 메모리 사용을 균형 있게 조절하는 것이 중요함

---
