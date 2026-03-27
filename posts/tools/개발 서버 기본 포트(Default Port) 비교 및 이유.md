---

title: "개발 서버 기본 포트(Default Port) 비교 및 이유"
date: "2025-07-15"
tags: ["Node", "Dev Server", "Port", "Create React App", "Next.js", "Vite", "Vue CLI"]
summary: "Create React App, Next.js, Vite, Vue CLI 등 주요 프레임워크가 사용하는 기본 개발 서버 포트의 차이와 배경, 변경 방법을 정리합니다."
---

## 배경

* 로컬 개발 서버 실행 시 `npm run dev` 또는 `npm start` 커맨드를 사용하며, 프레임워크마다 기본 포트가 상이함
* 포트 충돌을 방지하고, 문서 및 예제 코드의 일관성을 위해 기본값이 정해져 있으며, 그 이유를 이해하면 설정 변경 시 도움이 됨

## 1. 프레임워크별 기본 포트

| 프레임워크                        | 기본 포트 | 설명                             |
| ---------------------------- | ----- | ------------------------------ |
| Create React App             | 3000  | `react-scripts start` 기본 설정    |
| Next.js                      | 3000  | `next dev`의 기본 포트              |
| Vite                         | 5173  | CRA와 포트 충돌을 방지하기 위해 차별화한 번호 사용 |
| Vue CLI / webpack-dev-server | 8080  | 오랜 기간 웹팩 커뮤니티에서 사용되던 관례적 포트    |

## 2. 기본 포트 선택 이유

1. **루트 권한 회피**

   * 1024 미만 포트는 관리자(root) 권한이 필요 → 개발자의 번거로움을 줄임
2. **관례의 계승**

   * 초창기 Node.js 예제에서 `3000`을 자주 사용하던 관습이 CRA와 Next.js로 이어짐
3. **충돌 방지**

   * Vite는 인기 프레임워크와의 포트 충돌을 막기 위해 `5173`을 도입
4. **프레임워크 고유성**

   * Vue CLI는 기존 웹팩데브서버 디폴트 `8080`을 유지하여 문서·예제 통일

## 3. 기본 포트 변경 방법

### 3.1 환경 변수 설정

```bash
# Unix/macOS
PORT=4000 npm run dev

# Windows (PowerShell)
$env:PORT=4000; npm run dev
```

### 3.2 CLI 옵션 사용

```bash
# Create React App
npm start -- --port 4000

# Next.js
npx next dev -p 4000

# Vite
npx vite --port 4000
```

### 3.3 설정 파일 수정

* **Vite** (`vite.config.js`)

  ```js
  export default {
    server: { port: 4000 }
  }
  ```

* **Vue CLI** (`vue.config.js`)

  ```js
  module.exports = {
    devServer: {
      port: 4000
    }
  };
  ```


## 느낀 점

* 프레임워크별 기본 포트를 이해하고, 필요한 경우 즉시 변경할 수 있어야 로컬 개발 생산성이 올라감
* 충돌을 방지하려면 포트를 커스터마이징하는 습관이 중요하며, 특히 Vite 프로젝트에서 `3000` 사용 시 주의
* 문서화를 통해 팀 내 표준을 세우면, 신규 개발자 온보딩 시 혼선을 줄일 수 있음

---
