---

title: "useState & useEffect로 condition 상태 업데이트 시 주의점"
date: "2025-07-07"
tags: ["React", "useState", "useEffect", "State Management"]
summary: "useEffect에서 조건부로만 setState를 호출할 때 발생할 수 있는 상태 동기화 누락 문제와 이를 방지하는 개선 방법을 정리합니다."
---

## 배경

* `useState`로 `condition` 상태를 `false`로 초기화하고,
* API 호출 결과를 `useEffect`에서 받아와 `data.status === 'IN_PROGRESS'`일 때만 `setCondition(true)`로 변경
* 하지만 이 방식은 **한 방향(true) 업데이트만 처리**하여, 다른 상태로 전환 시 `condition`이 다시 `false`로 설정되지 않는 이슈를 경험함

## 배운 내용

1. **문제 패턴**

   ```tsx
   const [condition, setCondition] = useState(false);

   useEffect(() => {
     if (data?.status === 'IN_PROGRESS') {
       setCondition(true);
     }
   }, [data]);
   ```

   * `data.status`가 `'IN_PROGRESS'`일 때만 `condition`을 `true`로 설정
   * 다른 상태(ex. `'DONE'`, `'FAILED'`)로 변경되어도 `setCondition(false)`가 호출되지 않아 **기대값과 불일치** 발생

2. **개선 1: 양방향 업데이트**

   ```tsx
   useEffect(() => {
     if (data?.status === 'IN_PROGRESS') {
       setCondition(true);
     } else {
       setCondition(false);
     }
   }, [data]);
   ```

   * `if/else`로 **true/false** 모두 명시적으로 설정

3. **개선 2: 직접 상태 파생**

   ```tsx
   // condition을 data.status에 직접 종속시켜 파생 상태로 관리
   const condition = data?.status === 'IN_PROGRESS';
   ```

   * `useState`와 `useEffect`를 제거하고, 렌더 시점에 **항상 최신 값** 계산
   * 상태 동기화 누락 위험 제거

4. **개선 3: useMemo 활용**

   ```tsx
   const condition = useMemo(
     () => data?.status === 'IN_PROGRESS',
     [data?.status]
   );
   ```

   * 복잡한 계산 로직이 있을 때, 캐싱과 성능 최적화를 위해 사용 가능

## 느낀 점

* **단방향 업데이트** 로직은 간단하지만, 상태 반전 시를 고려하지 않으면 버그로 이어질 수 있음
* 가능하면 **파생 상태(derived state)** 는 `useState` 대신 직접 표현하거나 `useMemo`로 관리해, 상태 일관성을 보장하는 것이 좋음
* `useEffect`를 사용할 때는 **true뿐 아니라 false 분기도 항상 포함**하여 상태 동기화 누락을 방지해야 함

---
