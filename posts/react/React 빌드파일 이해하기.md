---

title: "React 빌드(dist) 파일 이해하기"
date: "2025-09-23"
tags: [React, Build, Babel, Webpack, Vite, Dist]
summary: "React 프로젝트에서 작성한 JSX/TSX 코드가 빌드 과정을 거쳐 dist 폴더의 최종 HTML/CSS/JS로 변환되는 과정을 정리합니다."
------------------------------------------------------------------------------------------

## 배경

React로 개발할 때는 `npm run dev` 또는 `pnpm dev`로 개발 서버를 띄우지만, 실제 배포 시에는 `npm run build` 명령으로 `dist` 또는 `build` 폴더가 생성됩니다.
이 폴더가 어떻게 만들어지는지, 어떤 변환 과정을 거치는지 궁금하여 정리했습니다.

---

## 빌드 과정 요약

1. **작성 코드 (JSX/TSX)**
   우리가 작성하는 JSX, TypeScript 코드는 브라우저가 직접 이해할 수 없음.

   ```tsx
   <div className="box">Hello</div>
   ```

2. **Transpile (Babel/TypeScript)**

   - JSX → `React.createElement`
   - TypeScript → JavaScript

   ```js
   React.createElement("div", { className: "box" }, "Hello");
   ```

3. **Bundle (Webpack, Vite 등)**

   - 여러 파일을 하나(or 여러 개)의 JS 파일로 합침.
   - import/export를 브라우저가 이해 가능한 구조로 변환.

4. **Optimize (최적화)**

   - Minify (공백, 주석 제거)
   - Tree-shaking (안 쓰는 코드 제거)
   - Code splitting (동적 import 분리)

5. **ReactDOM Rendering**

   - `className` 속성이 브라우저 DOM에선 `class`로 변환됨.
   - 실제 HTML 출력 예시:

     ```html
     <div class="box">Hello</div>
     ```

---

## dist 폴더 구조 예시

### CRA(Create React App)

```
build/
 ├── index.html
 ├── static/
 │    ├── css/main.8c8a8f9a.css
 │    └── js/main.5f8a9e7c.js
 └── ...
```

### Vite

```
dist/
 ├── index.html
 └── assets/
      ├── index.7d3a1d2.css
      └── index.a81f2a7.js
```

- `index.html` → React가 마운트될 루트 DOM (`<div id="root"></div>`) 포함
- JS/CSS 파일명에 해시가 붙어 캐싱 문제 방지
- 모든 리소스는 최적화된 상태로 서버 배포 가능

---

## 결론

- **개발자 코드**: JSX/TSX (가독성 ↑, 브라우저 이해 X)
- **빌드 후 코드**: 순수 JS/CSS (가독성 ↓, 브라우저 이해 O)
- **dist 폴더**: 배포 가능한 최종 산출물

즉, `dist`는 React 코드가 브라우저가 이해할 수 있는 HTML/CSS/JS로 변환된 **최종 결과물**이다.
