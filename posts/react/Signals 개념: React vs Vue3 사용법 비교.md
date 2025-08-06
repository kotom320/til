---

title: "Signals 개념: React vs Vue3 사용법 비교"
date: "2025-08-06"
tags: ["Reactivity", "Signals", "React", "Vue3"]
summary: "Signals(신호) 기반 반응성 모델을 React와 Vue3에서 어떻게 사용하고 있는지, React에서의 최적화 기법과 Vue3의 내장 reactivity를 비교 정리합니다."
-------------------------------------------------------------------------------------------------------------

## 1. Signals 개요

* **Signals**: 상태값(value)과 이를 구독(subscribe)하는 계산(computation)이 1:1로 연결된 반응형 모델
* 값 변경 시 대응 신호를 구독하는 로직만 재실행 → 부분 렌더링 최적화

## 2. React에서 Signals 사용 및 최적화 기법

React 표준에는 Signals API가 없으나, 외부 라이브러리와 메모이제이션 기법으로 비슷한 부분 최적화를 할 수 있습니다.

### 2.1 `@preact/signals-react` 예시

```bash
npm install @preact/signals-react
```

```jsx
import { signal, computed } from '@preact/signals-react';
const count = signal(0);
const double = computed(() => count.value * 2);
function Counter() {
  console.log('Rendering Counter');
  return (
    <button onClick={() => ++count.value}>
      Increment {count.value}
    </button>
  );
}
```

* **getter**(`count.value`) 호출 시 의존성 수집, **setter** 시 해당 컴포넌트만 리렌더

### 2.2 useMemo, useCallback, React.memo

React에서 Signals API가 없을 때 사용하는 최적화 기법입니다.

#### useMemo

```jsx
const memoizedValue = useMemo(() => computeExpensive(data), [data]);
```

* `data`가 변경되지 않으면 이전 결과 재사용

#### useCallback

```jsx
const handleClick = useCallback(() => doSomething(count), [count]);
```

* `count`가 변하지 않으면 함수 재생성 방지

#### React.memo

```jsx
const Child = React.memo(({ label }) => {
  console.log(`Rendering ${label}`);
  return <div>{label}</div>;
});
```

* 전달된 props가 동일하면 컴포넌트 리렌더링 방지

### 2.3 useState vs Signals: 부모-자식 리렌더링 비교

```jsx
// useState 예시: 모든 자식 리렌더
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment {count}</button>
      <Child label="A" />
      <Child label="B" />
      <Child label="C" />
    </>
  );
}

// Signals 예시: Counter만 리렌더
function App() {
  return (
    <>
      <Counter />
      <Child label="A" />
      <Child label="B" />
      <Child label="C" />
    </>
  );
}
```

* `useState` 변경 시 모든 자식 리렌더, Signals 사용 시 오직 `Counter`만 리렌더

### 2.4 React.memo 활용 예시

아래는 `useState`로 관리되는 `count` 값 변경 시, 모든 자식이 리렌더되는 기본 예시와 `React.memo`로 감싼 예시입니다.

```jsx
// Child.jsx
import React from 'react';

function Child({ label }) {
  console.log(`Rendering ${label}`);
  return <div>{label}</div>;
}

export default React.memo(Child);
```

```jsx
// Parent.jsx
import React, { useState } from 'react';
import Child from './Child';

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>
        Increment {count}
      </button>
      {/* label prop이 바뀌지 않으므로 React.memo가 막아줍니다 */}
      <Child label="A" />
      <Child label="B" />
      <Child label="C" />
    </>
  );
}
```

* **결과**: 부모의 `count`가 변경되어도 React.memo로 감싼 `Child` 컴포넌트는 첫 렌더 이후 리렌더되지 않습니다.

## 3. Vue3에서 Signals(reactivity) 사용

Vue3는 Signals 모델을 **내장**하고 있으며, `ref`와 `computed`로 구현됩니다.

```js
import { ref, computed } from 'vue';
export default {
  setup() {
    const count = ref(0);
    const double = computed(() => count.value * 2);
    return { count, double };
  }
};
```

```html
<template>
  <button @click="count++">Increment {{ count }}</button>
  <p>Double: {{ double }}</p>
</template>
```

* **`ref.value`** getter: track, setter: trigger
* 템플릿 컴파일러가 표현식 단위로 가상 DOM 블록을 분리하여 부분 렌더링 수행

## 4. React vs Vue3 비교

| 항목     | React (`signals-react` + memo)       | Vue3 (`ref`/`computed`) |
| ------ | ------------------------------------ | ----------------------- |
| 설치/내장  | 별도 라이브러리(`@preact/signals-react`)    | Vue3 내장 API             |
| 선언     | `signal`/`computed`                  | `ref`/`computed`        |
| 최적화 기법 | `useMemo`/`useCallback`/`React.memo` | 템플릿 블록 단위 부분 패치         |
| 부분 렌더링 | Signal 구독 컴포넌트만 리렌더                  | 표현식 블록만 패치              |

## 5. 느낀 점

* Signals 모델은 값 변경에 따른 **최소 단위 업데이트**를 보장해 복잡한 UI 성능 개선에 유리
* Vue3는 내장 reactivity로 간편, React는 외부 도입과 메모이제이션 기법 병행이 필요


---
