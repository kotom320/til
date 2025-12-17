---

title: "GitHub Actions로 CI 구성하기"
date: "2025-12-17"
tags: ["github-actions", "ci", "pnpm", "nextjs", "typescript"]
summary: "개인 TIL 프로젝트에 GitHub Actions 기반 CI를 도입하며, 최소한의 품질 게이트(lint/typecheck/build)를 구성한 과정을 정리한다."
----------------------------------------------------------------------------------------------------

## 1. 문제 인지 / 상황 설명

개인 프로젝트(TIL)를 운영하면서 `main` 브랜치에 바로 커밋하고 배포하는 방식으로 작업해왔다. 혼자 개발하는 프로젝트라는 이유로 별도의 브랜치 전략이나 CI 없이 진행했지만, 점점 다음과 같은 불안 요소가 생겼다.

* 빌드가 깨진 상태로 배포될 가능성
* 타입 에러를 놓친 채 머지될 가능성
* 변경 사항을 검증할 최소한의 안전장치 부재

특히 서비스 운영 경험을 강조하는 이력서를 준비하면서, "운영 가능한 코드"에 대한 최소 기준이 필요하다고 느꼈다.

---

## 2. 문제 정의 및 원인 분석

문제의 핵심은 **코드 품질을 자동으로 검증하는 단계가 전혀 없다는 점**이었다.

* lint, typecheck, build는 로컬에서만 수동으로 실행
* PR 단위 검증이 없어 실수로 깨진 코드를 `main`에 반영할 수 있는 구조
* 배포는 Vercel에 의해 자동으로 이뤄지지만, 사전 검증은 없음

따라서 목표는 다음과 같이 정의했다.

* PR 단위로 최소한의 품질 게이트를 자동으로 통과하도록 구성
* 복잡한 테스트나 환경 구성은 제외하고, **lint / typecheck / build**만 우선 도입
* 개인 프로젝트에 과하지 않은, 이해 가능한 수준의 CI 구성

---

## 3. 해결 방법 선택

CI 도구로는 GitHub Actions를 선택했다.

* GitHub 저장소와 자연스럽게 통합됨
* 별도 서버나 토큰 설정 없이 사용 가능
* 개인 프로젝트에서도 부담 없이 도입 가능

패키지 매니저는 이미 사용 중이던 `pnpm`으로 통일하고, Node.js 20 환경에서 CI를 실행하도록 구성했다.

---

## 4. 적용 내용

### 4.1 브랜치 전략

* `main`: 프로덕션 배포 브랜치
* `feat/*`, `fix/*`, `chore/*`: 작업 브랜치
* 모든 변경은 PR을 통해서만 `main`에 병합

PR 생성 시 CI가 실행되고, 통과한 경우에만 merge하도록 하는 흐름을 목표로 했다.

---

### 4.2 package.json 스크립트 정리

CI에서 실행할 명령을 명확히 하기 위해 스크립트를 정리했다.

```json
{
  "scripts": {
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "build": "next build"
  }
}
```

---

### 4.3 GitHub Actions 워크플로우 구성

`.github/workflows/ci.yml` 파일을 추가했다.

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build
```

이 설정으로 PR을 생성하면 자동으로 다음 순서가 실행된다.

1. 의존성 설치
2. ESLint 검사
3. TypeScript 타입 검사
4. Next.js 빌드

---

## 5. 결과

* PR 단위로 코드 품질이 자동 검증됨
* 빌드가 깨진 상태로 `main`에 병합되는 것을 사전에 차단
* 배포 전 최소한의 안정성을 확보
* 혼자 개발하는 프로젝트에서도 "운영한다"는 감각을 체감

---

## 6. 결론 (배운 점)

CI를 도입하며 느낀 가장 큰 점은, **자동화는 거창하지 않아도 충분히 의미가 있다는 것**이었다.

* 테스트가 없어도 lint/typecheck/build만으로도 안정성이 크게 올라감
* 개인 프로젝트라도 PR + CI 구조를 만들면 작업 흐름이 달라짐
* 이력서에 적을 수 있는 "운영 경험"은 코드보다 프로세스에서 만들어진다는 점을 체감

앞으로는 핵심 사용자 흐름에 대한 간단한 E2E 테스트를 추가해 CI를 점진적으로 확장해볼 계획이다.

---
