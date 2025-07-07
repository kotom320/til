---

title: "useEffect와 useCallback 의존성 관리"
date: "2025-06-04"
tags: ["React", "useEffect", "useCallback", "Hooks"]
summary: "useEffect 내에서 함수를 호출할 때 의존성 배열에 함수를 포함하고, 해당 함수를 useCallback으로 감싸며 발생할 수 있는 무한 루프 등 부작용을 정리합니다."
----------------------------------------------------------------------------------------------------------

## 배경

* React의 `useEffect` 훅은 의존성 배열에 명시된 값이 변경될 때마다 콜백을 실행함
* 종종 내부에서 함수를 호출하기 위해 함수 자체를 의존성 배열에 추가해야 하지만,
  함수가 매 렌더마다 새로 생성되면 `useEffect`가 무한히 실행되는 문제가 발생함
* 이를 해결하기 위해 `useCallback`으로 함수를 메모이제이션하지만,
  `useCallback`의 의존성 관리 실수로도 무한 루프나 최신 상태 미반영 문제가 생길 수 있음
* 이 문서에서는 이러한 상황에서 고려해야 할 점과 예제 코드를 통해 해결 방법을 정리함

## 문제점: 매 렌더마다 새로 생성되는 함수와 무한 루프

```tsx
import React, { useState, useEffect } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  // 컴포넌트 렌더 때마다 새로 생성되는 함수
  const fetchData = () => {
    // API 호출 로직 (생략)
    console.log('fetchData called, count =', count);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData가 매 렌더마다 새로 생성되므로, 의존성 변경 감지 → 무한 루프

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

* `fetchData` 함수가 컴포넌트가 렌더링될 때마다 새로운 참조로 생성됨
* 의존성 배열에 `fetchData`를 넣으면, 참조가 바뀔 때마다 `useEffect`가 다시 실행되어 무한 루프 발생

## 해결 방법 1: 함수 정의를 useCallback으로 감싸기

```tsx
import React, { useState, useEffect, useCallback } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  // 의존성 배열에 count만 넣어, count가 변경될 때만 함수 재생성
  const fetchData = useCallback(() => {
    // API 호출 로직 (생략)
    console.log('fetchData called, count =', count);
  }, [count]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData는 count가 변경될 때만 새로 생성되므로, 무한 루프 방지

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

* `useCallback`으로 `fetchData`를 메모이제이션하고, 의존성으로 `count`만 넣음
* 결과적으로 `count`가 바뀔 때만 새로운 함수 참조로 생성되고, 그때만 `useEffect`가 실행됨

## 고려 사항 1: useCallback 의존성 관리

* `fetchData` 내부에서 참조하는 값들을 모두 의존성 배열에 포함해야 최신 값을 사용함
* 예를 들어, 함수 내에서 `count`뿐 아니라 다른 상태나 props를 사용하면 그 값도 의존성에 넣어야 함

```tsx
const fetchData = useCallback(() => {
  console.log('count =', count, 'userId =', userId);
  // ...
}, [count, userId]);
```

* 의존성 누락 시, 의도치 않게 stale closure(오래된 값 참조) 문제가 발생할 수 있음

## 고려 사항 2: useCallback 자체로 무한 루프 유발 가능성

* `useCallback` 안에 참조하는 값이 많아지거나 객체/함수를 직접 의존성으로 넣으면,
  그 값들이 매 렌더마다 새로 생성되면 `useCallback`이 매번 새로운 함수를 반환하고,
  의존성 배열에 따라 `useEffect`가 반복 실행될 수 있음

```tsx
function Example({ filters }) {
  // filters가 매번 새로운 객체로 전달되면
  const fetchData = useCallback(() => {
    // filters를 사용한 API 호출
    console.log('filters =', filters);
  }, [filters]); // filters가 바뀔 때마다 새로운 함수 생성 → useEffect 무한 실행

  useEffect(() => {
    fetchData();
  }, [fetchData]);
}
```

* **해결 방안**:

  * 부모 컴포넌트에서 `filters`를 useMemo 혹은 useCallback으로 메모이제이션해 전달
  * `filters`가 빈번히 변하지 않는 값인지 확인하고, 불필요하게 자주 새 객체를 생성하지 않도록 조정

## 해결 방법 2: 함수 호출을 useEffect 내부로 직접 작성하고, 의존성을 최소화하기

* 꼭 함수를 의존성 배열에 넣어야 할 필요가 없다면, 함수 호출 로직을 `useEffect` 안에 직접 작성할 수 있음

```tsx
import React, { useState, useEffect } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 의존성 배열에 함수 없이, 필요한 값만 넣기
    console.log('fetchData called, count =', count);
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

* 이 방법은 내부 로직이 단순할 때 유용하며, `useCallback` 없이도 의도치 않은 루프를 피할 수 있음

## 요약

1. `useEffect` 내에서 함수를 호출하려면, 함수 참조가 바뀔 때마다 실행되는 점을 고려해야 함
2. `useCallback`으로 함수를 메모이제이션하면 무한 루프를 막을 수 있지만,

   * `useCallback` 의존성 배열에 필요한 모든 값(상태, props 등)을 포함해야 함
   * 부모 컴포넌트에서 전달되는 값이 매 렌더마다 새로 생성되지 않도록 주의해야 함
3. 함수 호출 로직이 간단하다면, `useEffect` 안에 직접 작성하여 의존성 배열을 최소화하는 것도 좋은 방법임

## 느낀 점

* 함수의 참조(identity)가 React Hooks 실행 조건에 얼마나 민감한지 다시 한번 확인할 수 있었음
* `useCallback`을 남용하기보다는, 로직 복잡도에 따라 직접 `useEffect`에 작성하거나 적절히 메모이제이션하는 균형이 필요함
* 협업 시 다른 개발자와 의존성 누락이나 stale closure에 대한 공감을 바로 나눌 수 있을 만큼, 이 개념을 명확히 이해하는 것이 중요하다고 느꼈음

---
