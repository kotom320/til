---

title: "얕은 복사 vs 깊은 복사"
date: "2025-08-22"
tags: [JavaScript, Copy, Object, Array]
summary: "JavaScript에서 자주 혼동되는 얕은 복사와 깊은 복사의 개념, 구현 방법, 성능 차이를 정리합니다."

---

## 1. 얕은 복사 (Shallow Copy)

* **특징**: 1차원(바로 아래 레벨)의 속성만 복사, 중첩 객체는 참조만 복사
* **영향**: 복사된 객체에서 중첩 객체를 수정하면 원본에도 반영됨

### 사용 예시

```ts
// 객체 얕은 복사
const obj = { a: 1, b: { c: 2 } };
const shallowCopy1 = { ...obj }; // spread
const shallowCopy2 = Object.assign({}, obj);

shallowCopy1.b.c = 42;
console.log(obj.b.c); // 42 (원본도 바뀜)

// 배열 얕은 복사
const arr = [1, 2, [3, 4]];
const shallowArr1 = arr.slice();
const shallowArr2 = [...arr];

shallowArr1[2][0] = 99;
console.log(arr[2][0]); // 99
```

### 성능

* 얕은 복사는 속성이 많아도 **빠르고 메모리 효율적**임
* 대부분의 경우 얕은 복사로 충분

---

## 2. 깊은 복사 (Deep Copy)

- **특징**: 모든 중첩 객체/배열까지 완전히 새로운 참조로 복사
- **영향**: 복사본을 수정해도 원본에 영향 없음

### 사용 예시

```ts
const obj = { a: 1, b: { c: 2 } };

// 1. JSON 방법 (단점: 함수, undefined, Symbol은 무시됨)
const deepCopy1 = JSON.parse(JSON.stringify(obj));

// 2. structuredClone (최신 브라우저/Node.js 지원)
const deepCopy2 = structuredClone(obj);

// 3. 라이브러리 사용 (lodash)
import cloneDeep from "lodash/cloneDeep";
const deepCopy3 = cloneDeep(obj);

deepCopy2.b.c = 42;
console.log(obj.b.c); // 2 (원본 유지)
```

### 성능

- 깊은 복사는 구조가 복잡할수록 **성능 저하와 메모리 부담**이 있음
- JSON 방법은 간단하지만 제한적
- `structuredClone`이나 `cloneDeep`은 더 정확하지만 속도 저하 가능

---

## 3. 요약

- **얕은 복사**: 빠르고 메모리 효율적, 중첩 객체는 공유됨
- **깊은 복사**: 안전하게 완전 분리, 하지만 성능 비용이 있음

일반적인 UI 상태 관리나 간단한 객체에서는 얕은 복사로 충분.
데이터 변경 추적이나 독립성이 중요한 경우에는 깊은 복사를 고려.
