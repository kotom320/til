---
title: "private npm 패키지에서 git submodule로: 버전 관리와 CI 토큰"
date: "2026-07-07"
tags: ["Git", "submodule", "CI/CD", "TIL"]
summary: "submodule은 SHA로 고정 → 배포 불필요, CI는 토큰이 별도로 필요한 이유"
---

## 배경 / 계기

기존에는 공용 패키지(에디터, UI 키트 등)를 사내 private npm 레지스트리에 배포해서 각 앱이 버전으로 설치했다. 이때 레지스트리 인증 토큰이 `.npmrc` 파일에 평문으로 들어가 있었다.

그동안은 "git 레포도 private, 레지스트리도 private라 git이 뚫리지 않는 이상 토큰이 노출될 일은 거의 없다"고 판단해왔다. 그런데 보안 검토에서 이 전제가 깨졌다. **AI 코딩 도구처럼 로컬 파일에 접근하는 환경이 일상화되면서, `.npmrc`의 토큰은 이미 "노출된 것"으로 봐야 한다**는 지적이었다.

처음 떠올린 해결책은 "토큰을 파일에서 빼서 GitHub Actions·Jenkins 시크릿으로 관리하자"였다. 그런데 이건 토큰을 **더 잘 숨기는** 것일 뿐, 토큰 자체는 여전히 존재하고 관리·로테이션 대상으로 남는다. 그래서 나온 대안이 **git submodule로 전환해서 레지스트리 토큰을 아예 없애버리는** 방법이었다. submodule은 git 자격증명으로 소스를 받으므로 별도 레지스트리 토큰이 필요 없다.

전환 과정에서 두 가지가 헷갈렸다.

1. npm은 버전으로 관리했는데, submodule도 버전을 관리해야 하나? 배포는 안 해도 되나?
2. 로컬에서는 그냥 받아지는데, Jenkins·GitHub Actions에서는 토큰을 넣어야만 동작했다. 왜?

## 핵심 개념

### submodule은 "버전"이 아니라 "커밋 SHA"로 고정한다

npm 방식은 package.json이 레지스트리의 특정 **버전**을 가리켰다.

```jsonc
// 기존: 레지스트리에 publish 된 tarball이 있어야 함
"@your-org/editor": "0.11.10"
```

submodule 방식은 부모 레포의 git tree에 **정확한 커밋 해시(gitlink)** 를 저장한다.

```bash
$ git submodule status
 83b64b37139d20af1b34975baac731fc2786e004 packages/editor (v0.11.10)
#└─ 이 SHA가 실제 고정 대상            └─ 그 커밋에 달린 가장 가까운 태그(사람용 라벨일 뿐)
```

즉 부모 레포는 "`packages/editor`는 이 커밋을 가리킨다"는 포인터만 갖는다.
`(v0.11.10)`은 참고용 라벨이고, **실제 잠금은 SHA가 한다.**

### 그래서 별도 배포(npm publish)가 사라진다

pnpm workspace에서 submodule을 로컬 소스로 직접 링크하면, 레지스트리 배포 단계 자체가 필요 없다.

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "packages/qa-tools/packages/*"   # submodule 안이 또 workspace인 중첩 케이스
```

```jsonc
// package.json — 레지스트리 버전 대신 로컬 workspace를 링크
"@your-org/editor": "workspace:*"
```

버전을 "올리는" 흐름은 이렇게 바뀐다.

```bash
# 1. submodule 안에서 최신 커밋으로 이동
cd packages/editor && git pull origin main && cd -

# 2. 부모가 "새 SHA를 가리키도록" 커밋한다 — 이게 곧 버전 업 커밋
git add packages/editor
git commit -m "chore: bump editor to <sha>"
```

태그(`v0.11.10`)는 필수는 아니지만 여전히 유용하다. SHA만 보면 사람이 "지금 뭘 물고 있는지" 알 수 없어서, 읽기 쉬운 라벨로 submodule 레포에 태그를 남겨둔다.

### 로컬은 되는데 CI가 토큰을 요구하는 이유

로컬에는 이미 내 git 자격증명(SSH 키 / HTTPS credential helper)이 있어서 private submodule도 그냥 clone된다. CI는 **깨끗한 환경 + 그 private 레포에 대한 접근권이 없는** 상태다. 그래서 자격증명을 명시적으로 넘겨야 한다.

## 예시 코드

### GitHub Actions

```yaml
- uses: actions/checkout@v4
  with:
    submodules: recursive
    token: ${{ secrets.SUBMODULE_PAT }}
```

핵심: 기본 `GITHUB_TOKEN`은 **현재 레포에만** 권한이 있다. submodule은 별도의 private 레포라 기본 토큰으로는 못 받는다. 그래서 조직 레포 접근이 되는 **PAT를 `token`으로 따로 넘긴다.**

### Jenkins

```groovy
checkout scmGit(
    branches: [[name: "*/${SOURCE_BRANCH_NAME}"]],
    userRemoteConfigs: [[credentialsId: 'my-git-cred',
                         url: 'https://github.com/your-org/your-app']],
    extensions: [
        submodule(recursiveSubmodules: true,   // 중첩 submodule까지 재귀
                  parentCredentials: true,      // 부모 clone에 쓴 자격증명 재사용
                  trackingSubmodules: false)    // branch 최신이 아니라 부모가 고정한 SHA 체크아웃
    ]
)
```

- `parentCredentials: true` → 별도 credential 등록 없이, 부모 레포 clone에 쓴 자격증명을 submodule에도 그대로 사용. (Actions의 `token`과 같은 목적)
- `recursiveSubmodules: true` → submodule 안에 또 submodule/workspace가 있으면 재귀로 받아야 함.
- `trackingSubmodules: false` → `.gitmodules`의 branch 최신을 따라가지 않고, **부모가 커밋으로 고정한 SHA를 정확히** 체크아웃 (재현성 보장).

## 왜 이 방법인가

| 항목 | private npm (Nexus) | git submodule |
|------|--------------------|---------------|
| 고정 단위 | 버전(semver) | 커밋 SHA |
| 배포 | `npm publish` 필요 | 불필요 (커밋 push만) |
| 소스 접근 | tarball만 | 소스 전체 (수정·디버깅 쉬움) |
| CI 인증 | 레지스트리 인증 | git 자격증명(토큰) |

submodule은 소스를 그대로 링크하므로 배포 파이프라인이 사라지고, 앱에서 바로 소스를 수정·디버깅할 수 있다. 대신 "부모가 어느 커밋을 가리키는지"를 커밋으로 관리해야 하고, CI에는 private 레포 접근 토큰을 반드시 넣어줘야 한다.

보안 관점에서 더 중요한 점: 레지스트리 토큰을 CI 시크릿으로 옮기는 건 토큰을 **더 잘 숨기는** 것이지 **없애는** 게 아니다. 파일·로그·설정 어딘가로 다시 새어나올 여지가 남고, 만료·로테이션도 계속 관리해야 한다. submodule 전환은 레지스트리 토큰이라는 관리 대상 자체를 제거하고, 이미 CI에 존재하는 git 자격증명 하나로 인증을 통일한다. "숨길 비밀을 줄이는" 방향의 해결이다.

## 정리

- **계기는 보안.** `.npmrc`의 레지스트리 토큰은 AI 도구가 파일에 접근하는 환경에선 이미 노출된 것으로 봐야 한다. 토큰을 CI 시크릿으로 숨기는 대신, submodule로 전환해 토큰이라는 관리 대상 자체를 없앴다.
- **submodule = 버전이 아니라 커밋 SHA로 고정.** publish 없이 "부모가 가리키는 커밋"을 커밋으로 관리한다.
- **CI는 기본 토큰이 다른 private 레포를 못 받는다.** Actions는 PAT를 `token`으로, Jenkins는 `parentCredentials: true`로 넘겨야 한다.
