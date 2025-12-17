# TIL (Today I Learned)

프론트엔드 개발자로서 겪은 문제를 기록하고,
**원인 → 해결 → 결과**의 흐름으로 정리한 개인 지식 베이스입니다.
단순한 학습 기록이 아니라, **실무에서 발생한 이슈를 재현 가능하게 정리하고 개선 과정을 남기는 것**을 목표로 운영하고 있습니다.

🔗 **Live Demo**: `https://til-git-main-kotom320s-projects.vercel.app`

---

## 목적

- 학습 내용을 **검색 가능하고 재사용 가능한 형태**로 축적
- 실무에서 발생한 프론트엔드 문제를 **맥락 중심으로 정리**
- 운영/배포/빌드 과정에서의 이슈를 기록하여 **동일한 문제를 반복하지 않기 위함**
- “기능 구현”보다 **문제 해결 과정과 판단 근거**를 남기는 개발 습관 정착

---

## 기술 스택

- **Framework**: Next.js / React / TypeScript
- **Styling**: Tailwind CSS
- **Lint / Format**: ESLint
- **Deployment**: Vercel
- **Package Manager**: pnpm

---

## 📂 프로젝트 구조

```bash
.
├── posts/          # 마크다운 기반 TIL 콘텐츠
├── public/
├── src/
│   ├── pages/      # 페이지 라우팅
│   ├── components/ # 공통 UI 컴포넌트
│   └── styles/     # 전역 스타일
└── ...
```

- 글은 `posts/` 디렉토리에서 **마크다운 기반으로 관리**
- 페이지 단위 렌더링 구조로 구성되어 있으며, **검색/카테고리 확장**을 고려해 구성

---

## 주요 기능

- 전체 글 목록 / 글 상세 페이지
- 마크다운 기반 콘텐츠 렌더링
- 카테고리(태그) 기반 분류
- 반응형 레이아웃

---

## 문제 해결 사례

이 프로젝트는 **문제 해결 경험을 정리하는 공간**입니다.
아래는 실제 실무/사이드 프로젝트에서 겪은 이슈를 정리한 글들입니다.

- **[Vite에서 public 디렉토리 에셋이 import되지 않는 문제 분석](posts/etc/Vite에서%20public%20디렉토리%20에셋이%20import되지%20않는%20문제%20분석.md)**
  → **문제**: `public/`의 SVG를 `?react`로 import하다 빌드 에러 발생 / **원인**: Vite는 `public/`을 번들링 대상으로 보지 않아 JS import 금지 / **해결**: `src/assets`로 이동 + alias를 실제 경로로 정합화

- **[파일 다운로드 방식 전환: Direct URL에서 Blob으로](posts/etc/파일%20다운로드%20방식%20전환:%20Direct%20URL에서%20Blob으로.md)**
  → **문제**: Presigned URL 다운로드에서 브라우저/환경별로 `download` 파일명이 무시됨(특히 한글) / **원인**: Cross-Origin 제약 + 파일명 결정 우선순위(Content-Disposition/URL) / **해결**: Blob으로 받아 same-origin처럼 다운로드 처리해 파일명 통제

- **[Jenkins로 mobile-webview 배포 파이프라인 구축하기](posts/etc/Jenkins로%20mobile-webview%20배포%20파이프라인%20구축하기.md)**
  → **문제**: 기존 AWS CodePipeline이 사라져 배포 경로가 끊김 / **원인**: 레거시 프로젝트 특성상 자동화가 빈약했고, 환경(dev/alpha/prod)·경로(서브폴더)·캐시 무효화가 엮여 실수 위험이 큼 / **해결**: 브랜치/환경 변수만 바꿔 재사용 가능한 Jenkins 파이프라인으로 재구축 + prod만 CloudFront invalidation 적용

> 모든 글은 “문제 인지 → 원인 분석 → 해결 → 배운 점” 구조로 작성하고 있습니다.

---

## 로컬 실행 방법

```bash
pnpm install
pnpm dev
```

---

## 이 프로젝트를 통해 얻은 것

- 프론트엔드 이슈를 **재현 가능하게 설명하는 능력**
- 단순 구현이 아닌 **구조적 원인 분석 습관**
- 운영/배포 관점에서 서비스를 바라보는 시야
- 작은 프로젝트라도 **프로덕션 서비스처럼 관리하는 경험**

---
