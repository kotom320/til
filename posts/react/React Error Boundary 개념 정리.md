---

title: "React Error Boundary 개념 정리"
date: "2025-08-06"
tags: ["React", "Error Boundary", "Error Handling", "TIL"]
summary: "React의 Error Boundary 기능을 통해 컴포넌트 트리 내 오류를 포착하고, UI 붕괴를 방지하는 개념과 구현 방법을 정리합니다."
---

## 배경

* 일반적인 JavaScript `try...catch`로는 렌더링 중 발생한 예외를 전역에서 잡기 어려움
* React 컴포넌트 트리에서 자식 컴포넌트의 렌더 오류로 전체 앱이 크래시되는 문제를 해결하기 위해 **Error Boundary** 개념 도입

## 1. Error Boundary란?

* **Error Boundary**: 자식 컴포넌트에서 발생한 JavaScript 오류를 포착해서, 해당 오류가 UI 전체에 영향을 주지 않도록 격리하는 React 컴포넌트
* React 16 이상부터 지원하며, 렌더, 라이프사이클 메서드, 생성자에서 발생한 오류를 잡아냄

## 2. Error Boundary 동작 원리

1. 자식 컴포넌트 렌더/constructor/라이프사이클에서 오류 발생
2. 가장 가까운 상위 Error Boundary 컴포넌트의 `static getDerivedStateFromError(error)` 호출
3. 이어서 `componentDidCatch(error, info)` 호출
4. Error Boundary는 자체 상태를 업데이트해 \*\*폴백 UI(fallback UI)\*\*를 렌더링

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // 폴백 UI를 렌더링하기 위한 상태 업데이트
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 오류 로깅
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

## 3. `try...catch` vs Error Boundary

| 구분            | try...catch                           | Error Boundary                    |
| ------------- | ------------------------------------- | --------------------------------- |
| 적용 범위         | 함수 내부 동기 코드 블록                        | 컴포넌트 트리(렌더/라이프사이클)                |
| 비동기 코드 처리     | `async/await` 내부에서 catch 필요           | 비동기 API 콜백에 직접 적용 불가              |
| UI 복구         | 수동으로 상태 업데이트                          | `getDerivedStateFromError`로 자동 폴백 |
| 이벤트 핸들러 오류 처리 | `onClick={() => { try{}catch{} }}` 사용 | 이벤트 핸들러는 catch하지 않음(별도 처리 필요)     |

## 4. 팁과 권장 방식

* **최상위**에 루트 Error Boundary 배치: 전체 앱 크래시 최소화

* **영역별**로 여러 개 배치: 기능별 폴백 UI 제공

* **react-error-boundary** 라이브러리 활용

  ```jsx
  import { ErrorBoundary } from 'react-error-boundary';

  function Fallback({error, resetErrorBoundary}) {
    return (
      <div>
        <p>앗! 오류가 발생했습니다: {error.message}</p>
        <button onClick={resetErrorBoundary}>다시 시도</button>
      </div>
    );
  }

  <ErrorBoundary
    FallbackComponent={Fallback}
    onReset={() => {/* 초기 상태 리셋 */}}
  >
    <MyComponent />
  </ErrorBoundary>
  ```

* **이벤트 핸들러**나 **비동기 로직** 오류는 `try...catch` 또는 `.catch()`로 별도 처리

## 6. resetErrorBoundary 동작 원리

`react-error-boundary`의 `ErrorBoundary`에서 제공하는 `resetErrorBoundary`는 다음과 같은 로직을 수행합니다:

1. **상태 초기화**

   * 내부 상태 `hasError`를 `false`로 리셋하여 폴백 UI 상태에서 벗어남
2. **복구 콜백 호출**

   * `onReset`으로 전달된 콜백을 실행해, 애플리케이션 상태(예: 폼 입력, 로딩 상태 등)를 초기 상태로 복구
3. **재렌더링**

   * ErrorBoundary의 자식 컴포넌트를 다시 렌더링하여, 오류가 발생하기 전 상태로 돌아가 시도 재실행

```jsx
function Fallback({error, resetErrorBoundary}) {
  return (
    <div>
      <p>오류가 발생했습니다: {error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

<ErrorBoundary
  FallbackComponent={Fallback}
  onReset={() => {
    // 예: 에러 컨텍스트 리셋, 폼 초기화 등
  }}
>
  <MyComponent />
</ErrorBoundary>
```

---

## 5. 느낀 점

- Error Boundary를 사용하면, UI가 예기치 않게 깨지는 것을 방지하며 사용자 경험을 향상시킬 수 있음
- 컴포넌트 단위로 오류 격리 영역을 정의해, 복잡한 앱에서도 세부 기능 장애를 국지화 가능
- `try...catch`와 역할을 명확히 구분해 동기 코드, 비동기 코드, UI 오류 처리를 적절히 조합해야 함

---
