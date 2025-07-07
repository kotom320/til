---

title: "TanStack Query staleTime & cacheTime 정리"
date: "2025-07-03"
tags: ["TanStack Query", "Caching", "staleTime", "cacheTime", "TIL"]
summary: "staleTime과 cacheTime의 기본 동작, 함께 쓰면서 겪은 문제, cacheTime은 자동 리패칭에 영향을 주지 않는다는 점을 사례와 함께 정리합니다."
-----------------------------------------------------------------------------------------------------

## 배경

* TanStack Query의 **staleTime**과 **cacheTime**을 설정해 서버 데이터 호출을 제어하려 했으나, 두 옵션의 역할이 혼동되어 문제를 겪음
* 특히 cacheTime 기본값(5분) 덕분에 캐시는 남았지만 staleTime이 만료되어 재요청이 발생하거나, 반대로 staleTime이 길어 갱신이 전혀 되지 않아 오래된 데이터가 노출됨
* 이 두 가지 이슈를 한 번에 짚고 넘어가기 위해 핵심 동작과 해결책을 정리함

## 1. staleTime vs cacheTime 기본 동작

| 구분     | staleTime                       | cacheTime               |
| ------ | ------------------------------- | ----------------------- |
| 역할     | 데이터를 **fresh** 상태로 간주할 기간       | 언마운트 후 **캐시를 보관**하는 기간  |
| 자동 리패칭 | **stale** 상태 전까지는 자동 리패칭 트리거 없음 | 전혀 관여하지 않음 (GC 시점에만 영향) |
| 기본값    | `0` (즉시 stale)                  | `5분` (5 \* 60\_000 ms)  |

* 🕑 **staleTime**: 컴포넌트 마운트, 윈도우 포커스 등에서 **재호출 여부**를 결정
* 🗑️ **cacheTime**: 쿼리가 언마운트된 뒤 메모리에 데이터를 **얼마 동안 유지**할지 결정

## 2. 문제 사례

1. **staleTime이 너무 길어 갱신이 안 됨**

   * `staleTime`을 10분으로 설정했으나, 그 사이 포커스 복귀나 마운트 시 fetch가 실행되지 않아 **오래된 데이터**가 사용됨
2. **cacheTime 기본 5분에 캐시는 남지만 fetch가 발생**

   * `staleTime: 0` 상태에서는 stale처리 즉시 자동 재호출 → 캐시가 살아 있어도 매번 API 호출됨
3. **queryKey는 다르나 queryFn이 동일한 두 개의 useQuery**

   * 서로 다른 키로 캐시 분리 시도했지만 fetch 함수가 같아 헷갈려, **정작 staleTime 설정이 문제**였다는 사실을 파악하는 데 오래 걸림

## 3. cacheTime와 API 호출 관계

> **질문**: cacheTime(5분) 동안 캐시가 남아 있는데도 API는 매번 호출되나요?

* **답변**: 예. 캐시 보존 기간은 **메모리에서의 유지**를 의미할 뿐, stale 여부와 리패칭 트리거를 제어하지 않음.
* 실제 **API 호출 여부**는 **staleTime**과 **refetchOn… 옵션**에 따라 결정됨.

  ```ts
  useQuery(['todos'], fetchTodos, {
    staleTime: 0,         // 즉시 stale → 매 mount마다 refetch
    cacheTime: 5 * 60_000, // 캐시 5분 보존
  });
  ```

## 4. 해결책 요약

* **갱신 방지**: `staleTime`을 충분히 길게 설정하면, 캐시가 남아 있는 동안엔 자동 리패칭이 일어나지 않음

  ```ts
  useQuery(['todos'], fetchTodos, { staleTime: 5 * 60_000 });
  ```
* **불필요 호출 방지**: `refetchOnWindowFocus`, `refetchOnMount` 옵션을 조절

  ```ts
  useQuery(['todos'], fetchTodos, {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  ```
* **캐시 관리**: `cacheTime`은 필요에 따라 늘이거나, `queryClient.removeQueries`로 수동 GC 수행

## 느낀 점

* **cacheTime과 staleTime**을 혼동하면, 캐시가 살아 있어도 리패칭이 반복되거나, 반대로 데이터 갱신이 전혀 되지 않는 문제가 발생함
* 캐시 전략을 설계할 때는 **두 옵션의 역할을 명확히 분리**하고, refetch 옵션까지 함께 고려해야 함
* 앞으로는 **기본값**부터 꼼꼼히 확인하고, 문제가 생기면 staleTime/ cacheTime 설정을 가장 먼저 점검하려 함

---
