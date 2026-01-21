---
title: "getStaticProps 정리"
date: "2025-05-27"
summary: "Next.js의 SSG를 위한 getStaticProps 함수 개념을 정리합니다."
---

## 배경

Next.js에서 `getStaticProps`는 **정적 생성(Static Generation)** 에 사용되는 함수입니다.

- 페이지가 빌드될 때 실행됩니다
- 결과로 반환된 props는 컴포넌트로 전달됩니다
- 데이터를 미리 가져와 빠르게 보여줘야 할 때 유용합니다

## 예시 코드

```ts
export async function getStaticProps() {
  return {
    props: {
      message: "Hello from getStaticProps!",
    },
  };
}
```

---

## 요약

- SSG(Static Site Generation)에서 데이터 미리 준비
- 자주 바뀌지 않는 데이터에 적합 (예: 블로그, 문서)
- 빌드할 때만 실행됨
