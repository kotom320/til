---

title: "JavaScript Array.prototype.every의 빈 배열 처리"
date: "2025-06-03"
tags: \["JavaScript", "Array", "Method Behavior"]
summary: "Array.prototype.every 메서드가 빈 배열에 대해 true를 반환하는 이유와 사용 시 주의점을 정리합니다."
------------------------------------------------------------------------------

## 배경

* 자바스크립트 배열 메서드 중 `every`는 배열의 모든 요소가 주어진 조건을 만족하는지 검사함
* 빈 배열(`[]`)에 `every`를 호출하면 직관적으로는 검사할 요소가 없으니 `false` 같지만, 실제로는 `true`를 반환함
* 예전에는 `!array.some(x => !condition)` 형태로 조건을 확인했으나, 가독성을 위해 `every`로 변경하면서 빈 배열 처리 동작을 알게 됨
* 이 동작이 헷갈릴 수 있어, 실제 동작 원리와 빈 배열 처리 규칙을 확인해 보고자 함

## 배운 내용

1. **`every` 메서드 기본 동작**

   * 배열의 각 요소에 대해 콜백 함수를 호출하고, 그 반환값이 모두 `true`여야 최종 결과가 `true`
   * 콜백 함수가 한 번이라도 `false`를 반환하면 순회 즉시 중단하고 `false` 반환

2. **빈 배열에 대한 처리**

   * 빈 배열은 “모든 요소”라는 개념이 비어 있는 집합과 같음(set.empty)
   * 수학적 논리에서 빈 집합에 대해 전체 명제가 항상 참(True)으로 간주됨(공집합의 전체명제)
   * 따라서 `[].every(...)`는 콜백 함수를 한 번도 호출하지 않고, 기본적으로 `true` 반환

3. **사용 시 주의점**

   * 검사 대상이 빈 배열인지 미리 체크하지 않으면, 조건 로직에서 의도치 않게 `true`가 나올 수 있음
   * 예: 사용자 입력에서 필터링 결과가 빈 배열일 때, `every` 결과가 `true`로 나오면 마치 모든 요소가 조건을 만족한 것처럼 처리할 위험이 있음
   * 빈 배열 여부를 확인하려면 `.length === 0` 또는 `Array.isArray(arr) && arr.length === 0`를 먼저 검사하는 패턴 사용 고려

## 코드 예제

```ts
// 빈 배열에 every 호출
const emptyArr: number[] = [];
const result1 = emptyArr.every((x) => x > 0);
console.log(result1); // true, 콜백이 한 번도 실행되지 않음

// 일반 배열에서 every 호출
const nums = [2, 4, 6];
const result2 = nums.every((x) => x % 2 === 0);
console.log(result2); // true, 모든 요소가 짝수이므로

const mixed = [2, 3, 4];
const result3 = mixed.every((x) => x % 2 === 0);
console.log(result3); // false, 3이 조건을 만족하지 않아 순회 중단

// 빈 배열 체크 후 조건 적용 예시
function allPositive(arr: number[]): boolean {
  if (!Array.isArray(arr) || arr.length === 0) {
    console.warn("배열이 비었거나 유효하지 않은 입력입니다.");
    return false; // 빈 배열일 때 false 처리
  }
  return arr.every((x) => x > 0);
}

console.log(allPositive([]));       // false (빈 배열일 때 false 반환)
console.log(allPositive([1, 2, 3])); // true
console.log(allPositive([-1, 2]));   // false
```

## 느낀 점

* 자바스크립트의 `every`가 빈 배열에 대해 `true`를 반환하는 것은 수학적 논리에 따른 것임을 이해함
* 실제 코드 작성 시, 빈 배열인지 여부에 따라 로직을 분기하지 않으면 의도치 않은 결과를 초래할 수 있음을 깨달음
* 앞으로 조건 검사를 할 때는 배열 길이를 먼저 검사하거나, 빈 배열을 별도 처리를 통해 `false`로 강제 분기하는 패턴을 사용하기로 함

---
