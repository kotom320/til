---

title: "CSS Flexbox - flex-direction과 메인축/교차축 정리"
date: "2025-08-22"
tags: ["CSS", "Flexbox", "Layout"]
summary: "flex-direction에 따른 메인축과 교차축 개념을 정리하고, align-items와 align-self의 차이를 설명합니다."
------------------------------------------------------------------------------------

## 1. flex-direction에 따른 메인축과 교차축

### row (기본값)

* **메인축 (main axis)**: 가로 (왼쪽 → 오른쪽)
* **교차축 (cross axis)**: 세로 (위 → 아래)

### column

* **메인축 (main axis)**: 세로 (위 → 아래)
* **교차축 (cross axis)**: 가로 (왼쪽 → 오른쪽)

즉, `flex-direction`은 어떤 축이 메인축이 될지를 결정하고, `justify-content`는 메인축을, `align-items`는 교차축을 기준으로 정렬합니다.

---

## 2. align-items와 align-self 비교

### align-items

- **컨테이너 속성**
- 교차축을 기준으로 **모든 자식 요소**를 정렬합니다.

### align-self

- **개별 아이템 속성**
- 특정 아이템만 교차축에서 정렬을 다르게 할 수 있습니다.
- align-items보다 우선 적용됩니다.

---

## 3. 예시 코드

```css
.container {
  display: flex;
  flex-direction: row; /* 메인축: 가로, 교차축: 세로 */
  justify-content: center; /* 메인축 정렬 */
  align-items: flex-start; /* 교차축 정렬 */
}

.item {
  width: 100px;
  height: 100px;
  background: lightblue;
}

.item.special {
  align-self: flex-end; /* 특정 아이템만 교차축 끝으로 이동 */
}
```

---

## 정리

- `flex-direction`이 메인축/교차축을 결정한다.
- `justify-content`는 메인축, `align-items`는 교차축을 기준으로 정렬한다.
- `align-items`는 컨테이너 전체에 적용, `align-self`는 특정 아이템에만 적용된다.
