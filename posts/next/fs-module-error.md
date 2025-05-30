---
title: "Next.js에서 fs 모듈 사용 시 발생하는 에러 정리"
date: "2025-05-28"
tags: ["Next.js", "fs", "TIL"]
summary: "Next.js 프로젝트에서 'fs' 모듈 사용 시 발생하는 에러의 원인과 해결 방안을 정리했습니다."
---

## 에러 상황 요약

`fs` 모듈을 클라이언트 코드에서 import 했을 때 다음과 같은 에러가 발생함:

```
Module not found: Can't resolve 'fs'
```

또는 Turbopack 환경에서는:

```
Error evaluating Node.js code
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
```

## 원인 분석

- `fs`는 Node.js의 내장 모듈로, **브라우저에서는 사용 불가**하다.
- Next.js는 `pages/`, `app/`, `components/` 등 모든 디렉토리의 코드를 클라이언트용으로 번들링 시도함.
- 따라서 **서버 사이드에서만 사용해야 하는 **\`\`** 코드는 클라이언트 코드와 분리되어야 함**.

## 해결 방법

1. `fs` 관련 코드를 반드시 `getStaticProps`, `getServerSideProps`, `API routes`, 또는 별도의 Node 전용 모듈로 분리할 것.
2. 예:

```ts
// src/lib/getCategoryTree.ts
import fs from "fs";
import path from "path";

export function getCategoryTree() {
  const POSTS_DIR = path.join(process.cwd(), "posts");
  const files = fs.readdirSync(POSTS_DIR);
  // ...
  return files;
}
```

```ts
// pages/index.tsx or getStaticProps
import { getCategoryTree } from "@/lib/getCategoryTree";

export async function getStaticProps() {
  const categories = getCategoryTree();
  return {
    props: { categories },
  };
}
```

> `getStaticProps`는 서버에서 실행되므로 `fs` 사용이 안전함

## 리마인드 포인트

- `fs`, `path` 등 Node 전용 모듈은 클라이언트와 명확히 분리할 것
- `useEffect`나 `fetch` 등 클라이언트 훅에서는 절대 사용 금지
- `.mjs` 확장자 또는 `"type": "module"`이 설정된 경우 import/export에 주의
