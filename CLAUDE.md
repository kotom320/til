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

`pnpm validate:posts`를 실행하면 위 규칙 위반 여부를 검사한다.

## 경로 별칭

`@/`는 `src/`를 가리킨다. 예: `import { getAllPosts } from '@/lib/posts'`
