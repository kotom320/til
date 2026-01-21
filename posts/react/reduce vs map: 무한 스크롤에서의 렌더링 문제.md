---

title: "reduce vs map: 무한 스크롤에서의 렌더링 문제"
date: "2025-10-02"
tags: [React, Rendering, InfinityScroll, TIL]
summary: "reduce를 사용한 JSX 누적 렌더링이 무한 로딩 문제를 유발했고, map으로 전환해 해결한 경험"

---

## 배경

무한 스크롤 기반 페이지네이션 컴포넌트에서 divider를 아이템 사이에 렌더링해야 하는 상황이 있었다. 처음에는 `reduce`를 이용해 JSX를 누적하는 방식으로 구현했다.

```tsx
list.reduce((result, item) => (
  <>
    {result}
    {divider}
    {item}
  </>
));
```

겉으로 보기에는 깔끔해 보였으나, 실제로는 무한 스크롤 환경에서 의도치 않은 문제가 발생했다.

---

## 문제

- **무한 로딩 발생**: `reduce`로 JSX를 누적할 때 매번 새로운 중첩 구조가 만들어져 React가 형제 노드로 인식하지 못했다.
- **DOM 재마운트**: key 관리가 어려워 IntersectionObserver 센티넬이 재발화, 무한 요청이 이어졌다.
- **순서 꼬임**: divider 처리 로직이 불안정해 페이지네이션 순서가 뒤틀리는 현상 발생.

---

## 해결

`reduce` 대신 `map`을 사용하여 평평한(flat) 배열 구조로 렌더링을 전환했다.

```tsx
list.map((item, index) => (
  <React.Fragment key={item.id ?? index}>
    {item}
    {(endedWithDivider || index < list.length - 1) && divider}
  </React.Fragment>
));
```

- 각 item과 divider에 **안정적인 key** 부여
- 마지막 divider를 명시적 조건으로 제어
- DOM 구조 안정화 → 무한 스크롤 정상 동작 및 순서 보장

---

## 교훈

- **겉멋이 든 코드**란: 보기에는 깔끔하지만, 실제 동작 안정성과 가독성을 희생한 코드.
- `reduce`는 함수형적으로 멋있어 보였지만 React 렌더링 모델과는 맞지 않았다.
- **가독성, 안정성, React 친화적 구조가 진짜 깔끔한 코드**라는 점을 배움.

---
