---
title: "devDependency + dynamic import로 특정 패키지를 프로덕션 번들에서 완전히 제외하기"
date: "2026-04-03"
tags: ["Vite", "번들링", "tree-shaking", "devDependency", "dynamic import"]
summary: "개발 환경에서만 쓰는 패키지를 static import하면 프로덕션 번들에도 포함된다. dynamic import + 환경 변수 조건 조합으로 완전히 제외할 수 있다."
---

## 배경 / 계기

개발·알파 환경에서만 사용하는 디버깅 SDK가 있었다. `package.json`의 `dependencies`에 추가하고 파일 상단에서 static import했더니, 프로덕션 빌드에도 해당 SDK(약 700KB)가 그대로 포함되는 문제가 생겼다.

## 핵심 개념

### 왜 static import는 안 되나

```ts
// ❌ 이렇게 하면 프로덕션 빌드에도 포함됨
import { initDebugSdk } from 'debug-sdk';

if (import.meta.env.VITE_APP_PROFILE === 'DEV') {
  initDebugSdk();
}
```

Vite(Rollup)는 `import` 구문을 빌드 시점에 정적으로 분석한다. 조건문 안에서 사용하더라도, import 자체가 파일 최상단에 있으면 번들에 포함된다.

### dynamic import + 환경 변수 조건

```ts
// ✅ 프로덕션에서 완전히 제외됨
if (import.meta.env.VITE_APP_PROFILE === 'DEV' || import.meta.env.VITE_APP_PROFILE === 'ALPHA') {
  import('debug-sdk')
    .then(({ initDebugSdk }) => initDebugSdk({ maxMinutes: 3 }))
    .catch((error) => console.error('SDK_INIT_FAILED', error));
}
```

Vite는 빌드 시 `import.meta.env.VITE_APP_PROFILE`을 실제 문자열 값으로 치환한다. 프로덕션 빌드에서 이 값이 `'DEV'`도 `'ALPHA'`도 아니라면 조건이 `if (false)`가 되고, Rollup이 dead code elimination으로 해당 블록 전체(dynamic import 포함)를 제거한다.

### devDependencies로 이동

```json
// package.json
{
  "dependencies": {
    // debug-sdk 제거
  },
  "devDependencies": {
    "debug-sdk": "0.1.4"  // 여기로 이동
  }
}
```

번들링에서 제외하는 것과 별개로, `devDependencies`로 이동하면 `npm install --production` 환경(CI 프로덕션 배포 등)에서 아예 설치되지 않는다.

## 왜 이 방법인가

| 방법 | 번들 제외 | 프로덕션 미설치 |
|------|----------|----------------|
| static import + if 조건 | ❌ | - |
| dynamic import + if 조건 | ✅ | ❌ |
| dynamic import + devDependencies | ✅ | ✅ |

두 가지를 함께 적용해야 완전히 분리된다.

## 정리

개발 전용 패키지는 `devDependencies` + `dynamic import` + 환경 변수 조건을 함께 써야 프로덕션에서 완전히 제외된다. 어느 하나만으로는 부족하다.
