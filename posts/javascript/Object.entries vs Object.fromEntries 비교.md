---

title: "Object.entries vs Object.fromEntries 비교"
date: "2025-06-10"
tags: ["JavaScript", "Object", "ES2019"]
summary: "Object.entries와 Object.fromEntries의 기능·용도·예제를 비교하여 키-값 변환 패턴을 정리합니다."
-------------------------------------------------------------------------------

## 배경

* 복잡한 객체 변환 로직을 작성할 때 키-값 쌍을 배열로 다루거나 다시 객체로 재조합해야 하는 경우가 많았음
* ES2019에서 도입된 `Object.entries`와 `Object.fromEntries`를 사용하면, 이러한 변환을 보다 선언적이고 가독성 높게 처리할 수 있어 학습해 보고자 함

## 배운 내용

1. **Object.entries**

   * 객체의 열거 가능한 프로퍼티 키와 값을 `[key, value]` 형태의 2차원 배열로 반환
   * 순회(iteration)나 필터링, 매핑에 유용
   * 예: `{ a: 1, b: 2 }` → `[['a',1], ['b',2]]`

2. **Object.fromEntries**

   * `Object.entries`나 비슷한 형태의 `[key, value]` 배열을 받아 다시 객체로 재조합
   * `Map` 객체, 필터 후 재구성 등 다양한 키-값 변환 패턴에 사용
   * 예: `[['a',1], ['b',2]]` → `{ a: 1, b: 2 }`

3. **핵심 차이점 및 용도**

   | 기능                        | 입력                        | 출력               | 주 사용처               |
   | ------------------------- | ------------------------- | ---------------- | ------------------- |
   | `Object.entries(obj)`     | 객체 (`{}`)                 | `[key, value][]` | 객체 순회, 필터, 매핑       |
   | `Object.fromEntries(arr)` | `[key, value][]` 또는 `Map` | 객체 (`{}`)        | 배열 필터/매핑 결과 객체로 재조합 |

## 코드 예제

```js
// 1) 객체를 배열로 변환하여 필터링
const user = { name: 'Alice', age: 0, admin: false };
const definedEntries = Object.entries(user)
  .filter(([_, value]) => Boolean(value));
// --> [['name','Alice']]

// 2) 다시 객체로 재조합
const filteredUser = Object.fromEntries(definedEntries);
console.log(filteredUser); // { name: 'Alice' }

// 3) Map과 조합하여 키-값 스왑
const swapped = Object.entries(user)
  .map(([key, value]) => [value, key]);
console.log(Object.fromEntries(swapped));
// --> { 'Alice':'name', '0':'age', 'false':'admin' }
```

## 느낀 점

* `Object.entries`로 객체를 배열처럼 다루면, `map`, `filter`, `reduce` 등 친숙한 배열 메서드를 직접 활용할 수 있어 로직이 직관적으로 바뀜
* `Object.fromEntries`를 통해 배열 기반 처리 후 다시 객체로 복원할 수 있어, 중간 변환 과정이 자연스러움
* 이 두 메서드를 조합하면 객체 키-값 변환, 필터링, 스왑 등 다양한 패턴을 단 몇 줄로 처리할 수 있어 매우 유용함
* 구형 환경 지원이 필요할 때는 폴리필을 추가하거나, Lodash의 `_.fromPairs` 등 대체 방법을 고려해야 함

---
