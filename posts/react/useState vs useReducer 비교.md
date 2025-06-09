---
title: "useState vs useReducer 비교"
date: "2025-06-09"
tags: \["React", "Hooks", "useState", "useReducer"]
summary: "React Hooks인 useState와 useReducer의 사용 목적, 차이점, 객체 상태 관리 시의 장단점을 비교 정리합니다."
---

## 배경

- React 함수형 컴포넌트에서 상태를 관리할 때 주로 `useState`를 사용함
- 컴포넌트가 복잡해지면서 상태가 객체로 묶이거나, 여러 액션(증가, 감소, 초기화 등)에 따른 업데이트 로직이 분산되어 가독성이 떨어지는 문제 발생
- 이러한 복잡한 상태 관리에는 `useReducer`가 더 적합할 수 있어, 두 가지 방법을 비교해 보고자 함

## 배운 내용

1. **useState 기본 사용**

   - 단순 값(one primitive) 상태에 적합
   - 업데이트 함수를 직접 호출하여 새 값을 할당
   - 객체 상태를 사용할 때는 **수동 병합**이 필요함

     ```ts
     const [state, setState] = useState({ count: 0, step: 1 });
     // count만 변경할 때
     setState((prev) => ({ ...prev, count: prev.count + prev.step }));
     ```

   - `setState({ count: 1 })`처럼 객체를 넘기면 기존 속성이 사라짐

2. **useReducer 기본 사용**

   - 복잡한 상태 로직(action-based) 관리에 적합
   - 리듀서 함수 내에서 분기 처리하여 일관된 업데이트 보장
   - 액션 타입과 페이로드(payload)를 통해 상태 변화를 명확히 표현

     ```ts
     type Action =
       | { type: "increment" }
       | { type: "decrement" }
       | { type: "setStep"; payload: number };

     function reducer(state: State, action: Action): State {
       switch (action.type) {
         case "increment":
           return { ...state, count: state.count + state.step };
         case "decrement":
           return { ...state, count: state.count - state.step };
         case "setStep":
           return { ...state, step: action.payload };
         default:
           return state;
       }
     }

     const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });
     ```

3. **핵심 차이점**

   | 구분            | useState                          | useReducer                                                 |
   | --------------- | --------------------------------- | ---------------------------------------------------------- |
   | 상태 형태       | 단일 값 또는 객체(수동 병합 필요) | 객체 혹은 복합 구조(리듀서에서 일괄 병합)                  |
   | 업데이트 방식   | 직접 setter 호출                  | `dispatch(action)` → 리듀서 처리                           |
   | 복잡도          | 단순 상태에 간결                  | 복잡한 로직, 여러 액션, 조건 분기 처리에 유리              |
   | 가독성/유지보수 | 객체 병합 코드가 산발적일 수 있음 | 모든 업데이트 로직이 한곳에 모여 있어 명확하고 테스트 용이 |

4. **객체 상태 관리 시 유의점**

   - `useState`에서 객체를 업데이트할 때는 반드시 이전 상태를 복사(`...prev`)하여 병합
   - 놓치면 기존 속성이 제거되는 버그 발생
   - `useReducer`는 리듀서에서 객체 병합을 통일해 주므로, 실수 확률 감소

## 코드 예제

```tsx
// useState + 객체 관리
function CounterWithState() {
  const [state, setState] = useState({ count: 0, step: 1 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button
        onClick={() =>
          setState((prev) => ({ ...prev, count: prev.count + prev.step }))
        }
      >
        +
      </button>
      <button
        onClick={() =>
          setState((prev) => ({ ...prev, count: prev.count - prev.step }))
        }
      >
        –
      </button>
      <input
        type="number"
        value={state.step}
        onChange={(e) =>
          setState((prev) => ({ ...prev, step: Number(e.target.value) }))
        }
      />
    </div>
  );
}

// useReducer 관리
function CounterWithReducer() {
  type State = { count: number; step: number };
  type Action =
    | { type: "increment" }
    | { type: "decrement" }
    | { type: "setStep"; payload: number };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "increment":
        return { ...state, count: state.count + state.step };
      case "decrement":
        return { ...state, count: state.count - state.step };
      case "setStep":
        return { ...state, step: action.payload };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: "increment" })}>+</button>
      <button onClick={() => dispatch({ type: "decrement" })}>–</button>
      <input
        type="number"
        value={state.step}
        onChange={(e) =>
          dispatch({ type: "setStep", payload: Number(e.target.value) })
        }
      />
    </div>
  );
}
```

## 느낀 점

- 상태가 단순하거나 한두 개일 때는 `useState`가 편리하고 코드가 간결함
- 상태 업데이트 로직이 복잡해지거나 여러 액션을 처리할 때는 `useReducer`가 가독성과 유지보수성을 크게 개선함
- 객체 상태를 `useState`로 관리할 때 병합 누락 실수가 종종 발생했는데, `useReducer`는 리듀서 안에서 일관적으로 병합해 주어 안정적임
- 프로젝트 초기에는 `useState`로 시작하되, 상태가 늘어나거나 로직이 복잡해지면 `useReducer`로 자연스럽게 전환하는 패턴이 유용함
