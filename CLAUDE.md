# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # 개발 서버 실행 (Turbopack, 포트 4000)
pnpm build        # 프로덕션 빌드 (SSG)
pnpm start        # 빌드된 앱 실행
pnpm lint         # ESLint 검사 (src/**/*.{js,jsx,ts,tsx})
pnpm typecheck    # TypeScript 타입 검사
pnpm validate:posts  # 마크다운 포스트 frontmatter 및 구조 검증
```

## 아키텍처 개요

Next.js Pages Router 기반의 마크다운 블로그. `posts/` 디렉토리에 있는 `.md` 파일들을 빌드 시 읽어 정적 페이지(SSG)로 생성한다.

### 데이터 흐름

```
posts/**/*.md
  → src/lib/posts.ts (gray-matter로 frontmatter 파싱, fs로 직접 파일 읽기)
  → pages/post/[...path].tsx (getStaticPaths + getStaticProps로 SSG 생성)
  → src/components/MarkdownViewer.tsx (react-markdown + rehype 플러그인으로 렌더링)
```

홈 페이지(`/`)는 런타임에 `/api/posts`를 fetch해 포스트 목록을 불러온다 (클라이언트 사이드).
카테고리/포스트 상세 페이지는 빌드 타임에 모두 사전 생성된다 (`fallback: false`).

### 핵심 모듈

- **`src/lib/posts.ts`**: 서버 전용. `posts/` 디렉토리를 재귀 탐색해 포스트 메타/본문 반환. `getAllPosts()`, `getPostBySlug()`, `getAllPostPaths()` 등.
- **`src/lib/posts-client.ts`**: 클라이언트 전용. API 라우트를 호출하는 래퍼 함수들.
- **`src/pages/post/[...path].tsx`**: 동적 라우팅. URL이 카테고리이면 해당 포스트 목록, 포스트 파일이면 본문을 렌더링.
- **`src/pages/api/`**: `posts.ts`, `categories.ts`, `search.ts` — 각각 포스트 목록, 카테고리 트리, 관련성 점수 기반 검색.

### 검색

`/api/search.ts`에서 전체 포스트를 스캔해 점수 기반으로 정렬 (제목 10점, 요약 5점, 태그 3점, 본문 1점). 결과는 상위 10개.

## 포스트 작성 규칙

포스트는 `posts/<category>/<slug>.md` 형식으로 저장한다. 중첩 카테고리는 `posts/react/react-query/` 처럼 하위 디렉토리로 구성.

**Frontmatter 필수 필드:**
```yaml
---
title: "제목"
date: "YYYY-MM-DD"
tags: ["tag1", "tag2"]
summary: "한 줄 요약"
---
```

**본문 규칙:**
- 첫 번째 헤딩은 반드시 `## `(H2)로 시작
- H1(`#`)은 사용하지 않음 (제목은 frontmatter `title` 사용)
- 한국어로 작성
- 코드 예시가 있으면 포함
- 분량: 핵심만 담되 맥락이 충분히 전달되도록 (너무 짧으면 나중에 기억 못함)

`pnpm validate:posts`를 실행하면 위 규칙 위반 여부를 검사한다.

---

## 보안 규칙

사내 정보가 외부에 노출되지 않도록 포스트 작성 시 반드시 검토한다.

- **회사명·브랜드명**: 변수명·URL·설명에 포함된 경우 일반화
  - 예) `companyAxios` → `apiClient`, `company.com` → `your-domain.com`
- **내부 URL·엔드포인트**: 실제 도메인 대신 플레이스홀더로 대체
  - 예) `https://your-project.supabase.co`
- **API 키·토큰·시크릿**: `YOUR_API_KEY` 형태로 대체
- **팀원 이름·계정**: `your-email@company.com` 으로 대체
- **내부 이슈 번호·프로젝트 키**: 제거 또는 일반화

---

## 포스트 유형별 구성

### 유형 A — 새로운 개념·기술을 알게 됐을 때

```
## 배경 / 계기
왜 이걸 찾아보게 됐는지

## 핵심 개념
몰랐던 내용, 알게 된 것

## 예시 코드 (있을 경우)

## 왜 이 방법인가
다른 대안과 비교하거나 선택 이유

## 정리
한 줄로 기억할 포인트
```

### 유형 B — 문제가 생겨서 해결했을 때

```
## 문제 상황
어떤 현상이 발생했는지, 재현 조건

## 원인 분석
왜 이런 일이 생겼는지

## 해결 방법
어떻게 고쳤는지 + 코드 예시

## 왜 이 방법인가
다른 접근과 비교, 트레이드오프

## 정리
다음에 같은 상황이 오면 기억할 것
```

---

## TIL vs 블로그 분리 기준

현재 `posts/`(TIL)와 `blog/`(블로그)를 분리하는 중. 지금은 모두 `posts/`에 작성하되 아래 기준을 참고한다.

| 구분 | TIL (`posts/`) | 블로그 (`blog/`) |
|------|---------------|----------------|
| 목적 | 빠른 개인 기록 | 포트폴리오, 외부 공유 |
| 분량 | 짧고 핵심만 | 기승전결, 충분한 서사 |
| 문체 | 메모 스타일 | 독자를 고려한 글쓰기 |
| 기준 | 오늘 배운 것 | 다른 사람에게도 가치 있는 것 |

블로그 포스트는 **왜 이 선택을 했는지**, **어떤 시행착오가 있었는지** 맥락과 서사를 담는다.

---

## Git 규칙

포스트 작성 후 아래 순서로 커밋·푸시한다.

```bash
pnpm validate:posts          # 반드시 오류 없이 통과 후 진행
git add posts/<작성한 파일>
git commit -m "til: <포스트 제목 요약>"
git push origin <현재 브랜치>
```

## 경로 별칭

`@/`는 `src/`를 가리킨다. 예: `import { getAllPosts } from '@/lib/posts'`
