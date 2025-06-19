---

title: "SSR / SSG / CSR / SPA 개념 정리"
date: "2025-06-19"
tags: \["Web", "Rendering", "SSR", "SSG", "CSR", "SPA", "Next.js"]
summary: "SSR, SSG, CSR, SPA의 정의와 주요 차이점을 한눈에 비교하고, Next.js 및 React 예시로 각 전략의 사용법을 정리합니다."
------------------------------------------------------------------------------------------

## 배경

* 웹 애플리케이션을 개발하면서 **SSR**, **SSG**, **CSR**, **SPA** 용어가 헷갈림
* 각 렌더링 전략의 동작 시점과 장단점을 명확히 파악하고, 상황에 맞는 선택 기준을 정리하고자 함

## 렌더링 전략 비교

|   구분   | SSR (Server-Side Rendering) | SSG (Static Site Generation) | CSR (Client-Side Rendering) | SPA (Single Page Application) |
| :----: | :-------------------------- | :--------------------------- | :-------------------------- | :---------------------------- |
| 렌더링 시점 | 요청 시 서버에서 HTML 생성           | 빌드 시점에 정적 HTML 생성            | 클라이언트에서 JS 로드 후 렌더링         | 초기 로드 후 클라이언트 내 뷰 전환          |
|  초기 응답 | 완성된 HTML 전달 → 빠른 첫 페인트      | 정적 HTML + CDN 캐싱 → 최고 성능     | 빈 HTML + JS 번들 로드 → 로딩 UI   | 빈 HTML + JS 번들 로드             |
| SEO 지원 | 우수                          | 우수                           | 제한적                         | 제한적                           |
| 사용자 경험 | 서버 부하 ↑ / 매 요청마다 렌더링        | 빠르고 비용 절감 / 재빌드 필요           | 초기 로드 지연 / 이후 상호작용 빠름       | 뷰 전환이 매끄럽고 즉각적                |

## Next.js 예시

### 1) SSR

```js
// pages/ssr.js
export async function getServerSideProps() {
  const res = await fetch('https://api.example.com/data');
  const data = await res.json();
  return { props: { data } };
}
export default function SSRPage({ data }) {
  return <div>{data.title}</div>;
}
```

### 2) SSG

```js
// pages/ssg.js
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/data');
  const data = await res.json();
  return { props: { data }, revalidate: 60 };
}
export default function SSGPage({ data }) {
  return <div>{data.title}</div>;
}
```

## React 예시

### 3) CSR

```jsx
// App.js
import { useState, useEffect } from 'react';
export default function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);
  return <div>{data ? data.title : 'Loading...'}</div>;
}
```

### 4) SPA

```jsx
// routes.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## 느낀 점

* **전략 선택**: 페이지 특성(SEO, 데이터 갱신 빈도, 사용자 경험)에 따라 적절히 선택
* **Next.js 장점**: SSR, SSG, CSR을 혼합하여 사용할 수 있어 유연함
* **종합 고려**: SEO, 초기 렌더링 속도, 서버 비용, 개발 복잡도를 모두 고려해야 함

---
