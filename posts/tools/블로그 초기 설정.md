---
title: "Next.js TIL 블로그 셋업"
date: "2025-05-27"
summary: "TIL 블로그를 Next.js와 Vercel을 활용해 처음부터 구축한 과정을 정리합니다."
---

## 1. 프로젝트 생성

- `pnpm create next-app`으로 프로젝트 생성
- `src/` 디렉토리 사용 설정

---

## 2. 폴더 구조 설계

- `/posts/category/yyyy-mm-dd-title.md` 형태로 Markdown 저장
- 예: `posts/javascript/2025-05-27-event-loop.md`

---

## 3. 마크다운 렌더링

- `gray-matter`로 front-matter 읽기
- `remark`, `remark-html`로 HTML로 변환

---

## 4. 카테고리 지원

- 다단계 slug를 처리하기 위해 `[...slug].tsx` 사용
- `getStaticPaths`와 `getStaticProps`에서 slug 배열 처리

---

## 5. 배포

- GitHub 저장소 생성 후 연동
- Vercel로 바로 배포

---

## TODO

- 글 목록에 카테고리 필터 추가
- 스타일 커스터마이징 (Tailwind CSS)
- 커스텀 도메인 연결
