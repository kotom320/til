#!/usr/bin/env node
// 일회성 마이그레이션 스크립트: TIL posts/ 의 특정 파일들을 blog/ 로 .mdx 로 이동.
// frontmatter에 portfolio cross-link와 series 메타를 추가한다.
// 실행 후 삭제 권장.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const POSTS = path.join(ROOT, "posts");
const BLOG = path.join(ROOT, "blog");

// 포트폴리오 slug ↔ 제목 매핑
const PORTFOLIO = {
  cloudfront: {
    slug: "cloudfront-optimization",
    title: "CloudFront 비용 최적화",
  },
  dx: { slug: "dx-pipeline", title: "FE 개발 생산성 인프라" },
  qa: { slug: "qa-recording-sdk", title: "세션 레코딩 SDK" },
};

// 이전 규칙: [source path, new slug, extra frontmatter]
const TRACK_A = [
  [
    "devops/CloudFront Invalidation 범위 최적화.md",
    "cloudfront-invalidation-scope",
    { portfolio: PORTFOLIO.cloudfront },
  ],
  [
    "devops/CloudFront invalidate 결과.md",
    "cloudfront-invalidation-result",
    { portfolio: PORTFOLIO.cloudfront },
  ],
  [
    "devops/Jenkins로 mobile-webview 배포 파이프라인 구축하기.md",
    "jenkins-webview-pipeline",
    { portfolio: PORTFOLIO.dx },
  ],
  [
    "storybook/design-system-storybook-chromatic-til.md",
    "storybook-chromatic-design-system",
    { portfolio: PORTFOLIO.dx },
  ],
  [
    "storybook/Storybook 도입 과정에서 이해하게 된 tsconfig의 역할.md",
    "storybook-tsconfig",
    { portfolio: PORTFOLIO.dx },
  ],
  [
    "library/rrweb-visibility-change-chunk.md",
    "rrweb-long-chunk-bug",
    { portfolio: PORTFOLIO.qa },
  ],
  // qaroom 시리즈 — 포트폴리오는 qa, 시리즈 마킹
  [
    "project/qaroom-01-planning.md",
    "qaroom-01-planning",
    { portfolio: PORTFOLIO.qa, series: { name: "QA 기록방 개발기", order: 1 } },
  ],
  [
    "project/qaroom-02-sdk.md",
    "qaroom-02-sdk",
    { portfolio: PORTFOLIO.qa, series: { name: "QA 기록방 개발기", order: 2 } },
  ],
  [
    "project/qaroom-03-viewer.md",
    "qaroom-03-viewer",
    { portfolio: PORTFOLIO.qa, series: { name: "QA 기록방 개발기", order: 3 } },
  ],
  [
    "project/qaroom-04-firebase.md",
    "qaroom-04-firebase",
    { portfolio: PORTFOLIO.qa, series: { name: "QA 기록방 개발기", order: 4 } },
  ],
  [
    "project/qaroom-05-supabase.md",
    "qaroom-05-supabase",
    { portfolio: PORTFOLIO.qa, series: { name: "QA 기록방 개발기", order: 5 } },
  ],
  [
    "project/qaroom-06-jira.md",
    "qaroom-06-jira",
    { portfolio: PORTFOLIO.qa, series: { name: "QA 기록방 개발기", order: 6 } },
  ],
];

const TRACK_B = [
  [
    "javascript/파일 다운로드 방식 전환: Direct URL에서 Blob으로.md",
    "file-download-blob",
  ],
  ["javascript/state-link-flag-pattern.md", "state-link-flag-pattern"],
  [
    "javascript/dev-dependency-dynamic-import.md",
    "dev-dependency-dynamic-import",
  ],
  ["react/reduce vs map: 무한 스크롤에서의 렌더링 문제.md", "reduce-vs-map-infinite-scroll"],
  [
    "tools/Vite에서 public 디렉토리 에셋이 import되지 않는 문제 분석.md",
    "vite-public-assets",
  ],
  ["git/Git 다계정 설정과 자동 분기 동작 원리.md", "git-multi-account"],
  [
    "git/Git Cherry-pick 심층 정리: Copy vs Cut, 이동 패턴, 다중 커밋 적용.md",
    "git-cherry-pick",
  ],
  ["tools/SonarQube 사용 및 경고 관리.md", "sonarqube"],
  ["library/Lexical.js.md", "lexical-js"],
  ["library/chart.js.md", "chart-js"],
];

function migrate([rel, slug, extra = {}]) {
  const src = path.join(POSTS, rel);
  const dst = path.join(BLOG, `${slug}.mdx`);
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  not found: ${rel}`);
    return;
  }
  const raw = fs.readFileSync(src, "utf-8");
  const parsed = matter(raw);
  const newData = { ...parsed.data, ...extra };
  const output = matter.stringify(parsed.content, newData);
  fs.writeFileSync(dst, output);
  fs.unlinkSync(src);
  console.log(`✓ ${rel} → blog/${slug}.mdx`);
}

if (!fs.existsSync(BLOG)) fs.mkdirSync(BLOG, { recursive: true });

console.log("\n=== Track A (포트폴리오 동반) ===");
TRACK_A.forEach(migrate);

console.log("\n=== Track B (독립 기술 아티클) ===");
TRACK_B.forEach(migrate);

console.log("\n마이그레이션 완료.");
