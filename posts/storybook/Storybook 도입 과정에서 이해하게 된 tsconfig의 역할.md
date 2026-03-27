---
title: "Storybook 도입 과정에서 이해하게 된 tsconfig의 진짜 역할"
date: "2026-02-19"
tags: ["typescript", "tsconfig", "storybook", "compiler", "architecture"]
summary: "Storybook 추가 과정에서 발생한 TypeScript 경고를 해결하며 include/exclude, public, rootDir, 그리고 tsconfig 분리 개념까지 이해하게 된 흐름을 정리한다."
---

## 1. 문제 인지 / 상황 설명

Storybook을 프로젝트에 추가한 뒤 TypeScript 컴파일 단계에서 경고가 발생하기 시작했다.
특히 `.stories.tsx` 파일과 `.storybook` 설정 파일에서 타입 관련 경고가 나타났다.

처음에는 단순 설정 문제라고 생각했고 다음과 같이 해결했다.

```json
{
  "exclude": ["**/*.stories.tsx", "**/*.stories.ts", ".storybook"]
}
```

이후 경고는 사라졌다.

하지만 여기서 자연스럽게 의문이 생겼다.

> 왜 `exclude`에 추가하면 해결되는가?

이 질문을 시작으로 `tsconfig`에 대한 이해가 단계적으로 확장되었다.

## 2. 문제 정의 및 원인 분석

### 2.1 include / exclude는 무엇인가?

TypeScript는 프로젝트 전체 파일을 자동으로 분석하지 않는다.
`tsconfig.json`을 기준으로 **TypeScript 프로젝트 범위(Project Scope)** 를 결정한다.

#### include

```json
{ "include": ["src"] }
```

의 의미:

> `src` 내부 파일만 TypeScript 프로젝트로 간주한다.

즉 TypeScript가 타입 체크하고 분석할 파일의 시작 범위를 정의한다.

#### exclude

```json
{ "exclude": ["**/*.stories.tsx"] }
```

의 의미:

> `include`로 선택된 파일 중 일부를 제거한다.

동작 순서는 다음과 같다.

```text
include → 파일 수집
exclude → 일부 제거
```

Storybook 파일을 제외하자 경고가 사라진 이유는, TypeScript 프로젝트 범위에서 해당 파일이 제거되었기 때문이다.

### 2.2 public 디렉토리는 왜 다르게 동작할까?

다음으로 생긴 의문은 이것이었다.

> `public`은 `include`에도 없는데 왜 빌드 결과에 포함될까?

결론:

> `public` 디렉토리는 TypeScript의 관리 대상이 아니다.

역할은 시스템별로 분리된다.

| 시스템        | 역할                   |
| ------------- | ---------------------- |
| TypeScript    | 코드 해석 및 타입 체크 |
| Bundler(Vite) | asset 처리 및 빌드     |

`public/*` 파일은 TypeScript가 아니라 bundler가 처리한다.

```text
public/* → dist로 그대로 복사(copy)
```

따라서 `tsconfig` 설정과는 무관하게 동작한다.

### 2.3 tsconfig의 진짜 역할

처음에는 다음과 같이 생각했다.

> `tsconfig = 빌드 설정`

하지만 실제 역할은 다르다.

> `tsconfig`는 TypeScript 컴파일러에게 “프로젝트를 설명하는 파일”이다.

즉,

- 어떤 파일이 프로젝트인가? (프로젝트 경계)
- 코드를 어떤 규칙으로 해석할 것인가? (컴파일러 규칙)

를 정의한다. 빌드는 bundler(Vite, Webpack, Next)의 역할이다.

### 2.4 rootDir 이해하기

```json
{
  "compilerOptions": {
    "rootDir": "src"
  }
}
```

`rootDir`의 역할:

> 컴파일 결과(outDir)의 기준 루트 디렉토리를 정의한다.

예:

```text
src/components/Button.tsx
↓
dist/components/Button.js
```

Storybook 관련 파일이 프로젝트 범위에 섞이면 TypeScript가 공통 루트를 다시 계산하게 되고,
출력 구조가 예상과 달라질 수 있다. 그래서 Storybook 관련 파일을 적절히 분리/제외하는 것이 구조적으로 안전하다.

### 2.5 왜 tsconfig는 여러 개인가?

프로젝트에 다음과 같은 파일이 존재하는 경우가 많다.

```text
tsconfig.app.json
tsconfig.node.json
tsconfig.storybook.json
```

핵심 개념:

> `tsconfig` 하나 = TypeScript 프로젝트 하나

#### 서로 다른 실행 환경

| 프로젝트              | 실행 환경   |
| --------------------- | ----------- |
| App                   | Browser     |
| Storybook             | Dev Runtime |
| Vite/Storybook Config | Node.js     |

각 환경은 사용하는 글로벌 타입이 다르다.

```text
window   → browser
process  → node
```

하나의 `tsconfig`로 처리하면 타입 충돌이 발생할 수 있다.
따라서 환경별 TypeScript 프로젝트를 분리한다.

구조 예시:

```text
tsconfig.base.json
  ├─ tsconfig.app.json
  ├─ tsconfig.node.json
  └─ tsconfig.storybook.json
```

## 3. 해결 방법

문제 해결 자체는 `exclude`로 Storybook 관련 파일을 TypeScript 프로젝트 범위에서 제외하는 방식이었다.

```json
{
  "exclude": ["**/*.stories.tsx", "**/*.stories.ts", ".storybook"]
}
```

하지만 최종적으로는 “단순히 경고를 숨겼다”가 아니라,
**TypeScript가 프로젝트를 어떻게 인식하는지(프로젝트 경계/실행 환경 분리)를 이해하고 정리한 것**이 핵심이었다.

## 4. 결과

이 경험을 통해 이해가 다음 순서로 확장되었다.

```text
storybook 추가 → 컴파일 경고 발생
  ↓
exclude 추가 → 경고 해결
  ↓
include/exclude는 뭐지?
  ↓
public은 왜 다르게 동작하지?
  ↓
tsconfig 역할은 무엇인가?
  ↓
include/exclude/rootDir 이해
  ↓
왜 tsconfig가 여러 개인가?
```

## 5. 결론 (배운 점)

- `tsconfig`는 빌드 설정이 아니라 **TypeScript 프로젝트 정의서**다.
- `include`/`exclude`는 프로젝트 경계를 정의한다.
- `public` 디렉토리는 TypeScript가 아닌 bundler 영역이다.
- `rootDir`은 출력 구조의 기준점이다.
- 여러 `tsconfig`는 “설정 분리”가 아니라 **실행 환경 분리**를 의미한다.

결국 이번 문제는 단순 경고 해결이 아니라,

> TypeScript가 프로젝트를 어떻게 인식하는지를 이해하는 과정이었다.
