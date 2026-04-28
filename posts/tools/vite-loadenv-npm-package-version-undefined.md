---
title: "vite loadEnv가 process.env를 머지한다: npm_package_version이 CI에서만 undefined가 된 이유"
date: "2026-04-27"
tags: ["Vite", "Node.js", "CI", "TIL"]
summary: "loadEnv 빈 prefix는 process.env까지 머지하고, npm_package_version은 패키지 매니저 경유 시에만 주입된다"
---

## 문제 상황

로컬에서는 잘 동작하던 코드가 CI 빌드에서만 `undefined`가 찍히는 현상.

```ts
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      sentryVitePlugin({
        release: {
          name: `my-app@${env.npm_package_version}`, // CI에서 "my-app@undefined"
        },
      }),
    ],
  };
});
```

로컬에서 `console.log(env)`를 찍으면 `npm_package_version`이 정상 출력되는데, 같은 코드가 CI에서만 사라진다. CI 로그도 똑같은 빌드 명령을 실행하는 것처럼 보였다.

## 원인 분석

핵심은 두 가지 사실의 결합이었다.

### 사실 (a): `loadEnv`는 빈 prefix일 때 `process.env`도 머지한다

Vite의 `loadEnv(mode, dir, prefixes)`는 흔히 "`.env*` 파일만 읽는다"고 알려져 있지만 정확하지 않다. Vite 소스를 보면:

```js
// vite/dist/node/chunks/dep-*.js (loadEnv 구현 일부)
for (const key in process.env) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
        env[key] = process.env[key];
    }
}
```

prefix가 빈 문자열(`''`)이면 `key.startsWith('')`가 모든 키에 대해 true가 되어, **`process.env` 전체가 결과 객체에 복사**된다. 즉 `loadEnv(mode, dir, '')`는 사실상 `.env` + `process.env` 머지본을 반환한다.

→ `env.npm_package_version`을 읽으려면 결국 `process.env.npm_package_version`이 존재해야 한다.

### 사실 (b): `npm_package_version`은 패키지 매니저가 주입하는 변수다

이 변수는 OS나 Node가 자동으로 만들어주지 않는다. **`npm run` / `pnpm run` / `yarn` 스크립트 실행 시점에 패키지 매니저가 `process.env`에 주입**한다. 패키지 매니저를 거치지 않고 바이너리를 직접 호출하면 주입이 일어나지 않는다.

```bash
# 주입됨
pnpm build
pnpm run build

# 주입 안 됨
./node_modules/.bin/vite build
node ./node_modules/vite/bin/vite.js build
```

### 두 사실이 만나면

| 실행 방식 | `process.env.npm_package_version` | `env.npm_package_version` |
|----------|---|---|
| `pnpm build` (로컬) | ✅ pnpm이 주입 | ✅ |
| CI: `pnpm run build` | ✅ pnpm이 주입 | ✅ |
| CI: `./node_modules/.bin/vite build` | ❌ pnpm 미경유 | ❌ undefined |

CI 파이프라인을 빌드 속도 최적화 차원에서 `pnpm run build` → `vite` 직접 호출로 바꾸자, **pnpm이 콜 체인에서 사라지면서 주입이 끊겼다.** 로컬은 여전히 `pnpm build`로 돌리니 증상이 안 보였을 뿐.

## 해결 방법

`process.env`나 `loadEnv` 결과에 의존하지 말고, `package.json`을 직접 읽는다.

```ts
import { createRequire } from 'node:module';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const { version: packageVersion } = require('./package.json') as {
  version: string;
};

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      sentryVitePlugin({
        release: {
          name: `my-app@${packageVersion}`, // 항상 동작
        },
      }),
    ],
  };
});
```

## 왜 이 방법인가

- **실행 방식과 무관**하게 항상 동작 (pnpm/npm/yarn/직접 바이너리 호출)
- `package.json`을 single source of truth로 사용 (버전이 한 곳에만 정의됨)
- 정적 import라서 IDE/타입체커가 검증 가능
- "패키지 매니저가 환경 변수를 주입해 줄 것"이라는 암묵적 의존이 사라짐

대안인 `process.env.npm_package_version`을 그대로 쓰는 방식은 **빌드 명령이 항상 패키지 매니저를 경유해야 한다**는 약속에 의존한다. 빌드 도구나 CI 설정 변경 한 번으로 깨질 수 있는 약한 가정이다.

## 정리

- vite의 `loadEnv(mode, dir, '')`는 `.env*` 파일뿐 아니라 `process.env`도 합쳐서 돌려준다. 빈 prefix는 사실상 "필터 없음"
- `npm_package_version` 같은 npm 주입 변수는 **패키지 매니저를 경유한 실행에서만** 채워진다
- "로컬에선 되는데 CI에선 안 되는" 증상을 만났을 때, **실행 경로 차이(패키지 매니저 경유 여부)를 1차 의심 대상**으로 삼자
- 빌드 메타데이터(버전 등)는 `package.json`을 직접 import하는 게 실행 방식과 무관하게 가장 견고하다
