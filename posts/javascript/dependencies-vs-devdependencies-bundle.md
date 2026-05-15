---
title: "devDependencies가 번들에 포함될 수 있다"
date: "2026-05-15"
tags: ["npm", "Vite", "번들링", "devDependencies"]
summary: "번들 포함 여부는 package.json 분류가 아니라 import 연결 여부로 결정된다"
---

## 배경 / 계기

보안 점검에서 Storybook이 취약점으로 보고됐다. devDependencies에 있으니 상용 번들에 포함되지 않을 거라고 생각했는데, 원리를 따져보니 그 가정이 틀렸다.

## 핵심 개념

### dependencies vs devDependencies의 실제 의미

`devDependencies`는 "빌드·테스트 도구"라는 **의도를 표현**하는 것이지, 프론트엔드 빌드 결과물에서 자동으로 빠지는 것이 아니다.

```
pnpm install
  → dependencies + devDependencies 모두 설치
  → vite, tsc 같은 빌드 도구가 devDependencies에 있기 때문에 함께 설치해야 함

vite build
  → import를 따라가며 필요한 코드만 번들에 포함
  → package.json 분류는 이 단계에서 관계없음

dist/
  → node_modules는 배포되지 않음
  → import된 코드가 인라인으로 번들에 녹아 있음
```

**번들 포함 여부를 결정하는 것은 `import` 연결 여부지, `package.json`의 분류가 아니다.**

### devDependencies가 번들에 들어가는 케이스

디자인 시스템처럼 컴포넌트와 stories 파일이 같은 디렉토리에 있을 때:

```
bds/
  Button/
    Button.tsx
    Button.stories.ts   ← @storybook/react import 있음
    index.ts            ← Button.stories도 re-export
```

```ts
// index.ts
export * from './Button';
export * from './Button.stories'; // ← 이 한 줄로 storybook이 번들에 딸려옴
```

`@storybook/react`는 devDependencies에 있지만, import 경로가 연결되어 있으므로 Vite가 번들에 포함시킨다.

### 제외하는 방법

**1. vite.config.ts에서 stories 파일 자체를 외부로 선언**

```ts
build: {
  rollupOptions: {
    external: (id) => id.includes('.stories.'),
  }
}
```

**2. barrel 파일에서 stories re-export 제거**

```ts
// index.ts
export * from './Button';
// export * from './Button.stories'; ← 제거
```

**3. stories 파일을 컴포넌트와 분리된 디렉토리로 이동**

```
bds/src/Button.tsx
bds/stories/Button.stories.ts
```

### 구분이 실제로 의미있는 경우

| 상황 | devDependencies 효과 |
|------|----------------------|
| 프론트엔드 빌드 | 의미 없음 (번들은 import로 결정) |
| Node.js 서버 배포 | `--production` 설치 시 제외되어 서버 경량화 |
| npm 라이브러리 배포 | 사용자에게 설치되지 않음 |

### 보안 스캐너 오탐 확인 방법

보안 스캐너가 `package-lock.yaml`을 기준으로 스캔하면 devDependencies의 패키지도 취약점으로 보고한다. 실제 번들에 포함됐는지는 아래로 확인:

```bash
grep -r "storybook" dist/assets/*.js | wc -l
# 0이면 오탐 → 소명 가능
```

## 정리

`devDependencies`는 의도의 표현이고, 번들 제외는 별도로 설정해야 한다. import가 연결되어 있으면 무조건 번들에 포함된다.

→ dynamic import로 특정 패키지를 완전히 제외하는 방법: [devDependency + dynamic import로 특정 패키지를 프로덕션 번들에서 완전히 제외하기](/post/javascript/dev-dependency-dynamic-import)
