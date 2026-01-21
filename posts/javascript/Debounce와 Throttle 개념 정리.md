---

title: "Debounce와 Throttle 개념 정리"
date: "2025-07-10"
tags: ["JavaScript", "Performance", "Debounce", "Throttle"]
summary: "연속 이벤트 처리 시 불필요한 함수 호출을 방지하는 Debounce와 Throttle의 정의, 동작 원리, 코드 예시를 정리합니다."
---

## 배경

* **검색 입력**, **윈도우 리사이즈**, **스크롤 이벤트** 등 빠르게 반복 발생하는 이벤트에 즉시 응답하면 성능이 저하될 수 있음
* Debounce와 Throttle은 이러한 연속 이벤트를 제어하여 **불필요한 함수 호출**을 줄이고 **CPU 부하**를 낮추는 도구임

## 배운 내용

### 1. Debounce

* **정의**: 마지막 이벤트 발생 후 일정 시간이 지난 뒤에 **한 번만** 함수가 실행되도록 하는 기법
* **동작 원리**:

  1. 이벤트가 발생하면 타이머를 설정
  2. 동일 이벤트가 타이머 만료 전에 다시 발생하면 타이머를 **리셋**
  3. 지정된 대기시간(ms) 동안 이벤트가 없으면 콜백 실행
* **사용 예**: 사용자 검색어 입력 창에서 **마지막 입력 후** 300ms 뒤에 API 호출
* **코드 예제**:

  ```js
  function debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // 사용
  const onSearch = debounce((e) => {
    fetch(`/search?q=${e.target.value}`);
  }, 300);
  document.getElementById('input').addEventListener('input', onSearch);
  ```

### 2. Throttle

* **정의**: 함수 실행 간 최소 간격을 설정하여, 지정된 시간(ms)마다 **최대 한 번**만 실행되도록 하는 기법
* **동작 원리**:

  1. 최초 이벤트 발생 시 즉시 실행
  2. 이후 지정된 간격이 지나기 전까지는 추가 호출을 무시
  3. 간격이 지나면 다시 실행 가능
* **사용 예**: 스크롤 위치 추적, 리사이즈 핸들러 등에 200ms 간격으로 실행
* **코드 예제**:

  ```js
  function throttle(fn, interval) {
    let lastTime = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastTime >= interval) {
        lastTime = now;
        fn.apply(this, args);
      }
    };
  }

  // 사용
  const onScroll = throttle(() => {
    console.log(window.scrollY);
  }, 200);
  window.addEventListener('scroll', onScroll);
  ```

### 3. Debounce vs Throttle 비교

| 특성    | Debounce            | Throttle              |
| ----- | ------------------- | --------------------- |
| 실행 시점 | 마지막 이벤트 후 대기시간 뒤 실행 | 이벤트 발생 시점 기준 주기마다 실행  |
| 호출 패턴 | 이벤트가 멈춘 뒤에 단일 실행    | 지정 간격 내 다수 이벤트 중 첫 실행 |
| 사용 예  | 검색 입력, 자동 저장        | 스크롤, 리사이즈, 애니메이션 업데이트 |

## 느낀 점

* Debounce는 **최종 사용자 입력 완료** 시점을 포착하기에 적합하지만, 너무 긴 delay는 반응성을 저하시킴
* Throttle은 **일정 간격**으로 꾸준히 이벤트를 처리할 때 유리하나, 마지막 이벤트 이후 즉시 실행되지 않을 수 있음
* 적절한 delay/interval 값을 선택하는 것이 중요하며, lodash 같은 검증된 라이브러리를 사용하면 구현 실수를 줄일 수 있음

---

