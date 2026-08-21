---
title: "GitHub Actions 봇 push가 막힐 때: App 권한과 Repository Ruleset"
date: "2026-08-05"
tags: ["github-actions", "github-app", "ruleset", "ci"]
summary: "봇 push 실패의 두 겹 원인 — App 권한과 Repository Ruleset"
---

## 문제 상황

상위 브랜치의 변경을 하위 브랜치로 자동 머지하는 워크플로를 만들었다. `main` → `alpha` → `develop` 순서로 흘려보내는 구조다.

```yaml
name: auto-merge-from-alpha
on:
  push:
    branches: [alpha]

jobs:
  merge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ secrets.ACTION_APP_ID }}
          private-key: ${{ secrets.ACTION_APP_PRIVATE_KEY }}

      - uses: actions/checkout@v4
        with:
          token: ${{ steps.app-token.outputs.token }}
          ref: develop
          fetch-depth: 0

      - run: |
          git config user.name "automation[bot]"
          git config user.email "automation[bot]@users.noreply.github.com"
          git merge --no-edit origin/alpha
          git push origin develop
```

도입 후 계속 실패했는데, 원인을 찾는 과정에서 함정을 네 번 밟았다.

## 원인 분석

### 함정 1 — `success`가 성공이 아니었다

실행 목록에 `success`가 하나 섞여 있어서 "가끔은 되는" 간헐적 문제로 보였다. 그 실행의 로그를 열어보니 이랬다.

```
origin/alpha -> origin/develop: 차이 없음, skip.
```

diff가 없어서 push 분기를 아예 안 탄 것이다. **실제로 push를 시도한 실행은 전부 실패했고, 이 워크플로는 도입 이후 한 번도 성공한 적이 없었다.**

조건부 push가 있는 워크플로는 `success` 하나만 보고 판단하면 안 된다. push 스텝이 실제로 실행됐는지 로그를 봐야 한다.

### 함정 2 — 로그 꼬리의 경고는 원인이 아니다

로그 맨 아래에 이게 보였다.

```
Cleaning up orphan processes
Warning: Node.js 20 is deprecated. The following actions target Node.js 20
but are being forced to run on Node.js 24: actions/checkout@v4, ...
```

에러처럼 보이지만 경고다. GitHub Actions는 성공·실패와 무관하게 run 레벨 annotation에 경고를 띄운다. 실제 실패 원인은 **스텝 내부**에 있다. `--log-failed`로 실패한 스텝만 보면 꼬리의 cleanup 로그만 나오는 경우가 있어서, 원인 라인을 찾으려면 전체 로그를 grep 하는 게 확실하다.

```bash
gh run view <run-id> --log | grep -iE "remote:|fatal|error|rejected|GH0"
```

### 진짜 원인 1 — GitHub App에 `contents: write`가 없었다

```
remote: Write access to repository not granted.
fatal: ... The requested URL returned error: 403
```

`ACTION_APP_ID`가 가리키는 App의 권한을 조회했다.

```bash
gh api /apps/<app-slug> --jq '.permissions'
# {"contents":"read","issues":"write","metadata":"read","pull_requests":"write"}
```

원래 PR 라벨링 용도로 만든 App이었다. 라벨링에는 `issues:write` / `pull_requests:write`만 있으면 되니 `contents`가 read여도 아무도 몰랐다. 나중에 push가 필요한 워크플로에 같은 App을 재사용하면서 드러난 것이다.

App이 어느 것인지 모를 때는 그 App이 남긴 흔적으로 역추적할 수 있다.

```bash
gh api repos/<owner>/<repo>/issues/<pr-number>/timeline \
  --jq '.[] | select(.actor.type=="Bot") | .actor.login' | sort -u
```

### 진짜 원인 2 — Repository Ruleset

권한을 고치자 403은 사라지고 다른 에러가 나왔다.

```
remote: error: GH013: Repository rule violations found for refs/heads/develop.
remote: - This branch must not contain merge commits.
remote: - Changes must be made through a pull request.
remote: - 3 of 3 required status checks are expected.
 ! [remote rejected] develop -> develop (push declined due to repository rule violations)
```

여기서 함정 3을 밟았다. 브랜치 보호를 확인한다고 이걸 돌렸다.

```bash
gh api repos/<owner>/<repo>/branches/develop/protection
# {"message":"Branch not protected","status":"404"}
```

404가 나와서 "보호 설정 없음"이라고 판단했는데 **틀렸다.**

**Rulesets는 classic branch protection과 별개의 기능이고 별개의 API다.** classic 쪽이 404여도 ruleset이 걸려 있을 수 있다. 조회는 이쪽으로 해야 한다.

```bash
gh api repos/<owner>/<repo>/rulesets
gh api repos/<owner>/<repo>/rulesets/<id> \
  --jq '{conditions, bypass_actors, rules: [.rules[] | {type, parameters}]}'
```

결과는 이랬다.

```json
{
  "conditions": {
    "ref_name": { "include": ["refs/heads/main", "refs/heads/develop", "refs/heads/alpha"] }
  },
  "bypass_actors": [
    { "actor_id": 2, "actor_type": "RepositoryRole", "bypass_mode": "always" },
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "required_linear_history" },
    { "type": "pull_request" },
    { "type": "required_status_checks" },
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ]
}
```

`bypass_actors`에 `RepositoryRole`만 있고 `Integration`(GitHub App) 항목이 없다. **사람은 역할 기반으로 우회되니까 수동 머지는 잘 됐고, 봇만 막혔다.** 그래서 문제가 늦게 발견됐다.

### 함정 4 — 머지 전략을 바꿔도 해결되지 않는다

"머지 커밋이 문제면 `--ff-only`로 바꾸면 되지 않나" 싶었는데 안 된다. 이유가 둘이다.

**`required_linear_history`는 부모가 2개인 커밋이 push되는 것 자체를 막는다.** 다른 레포에서 확인한 케이스인데, 이미 존재하던 머지 커밋이 깔끔한 fast-forward로 들어가는데도 거부됐다. 어떻게 들어오든 무관하다.

```
Updating 1a2b3c4d..5e6f7a8b
Fast-forward
 ...
remote: - This branch must not contain merge commits.
remote:   Found 1 violation:
remote:   5e6f7a8b...
```

그리고 `pull_request` 규칙이 **히스토리 모양과 무관하게 모든 직접 push를 막는다.**

## 해결 방법

App을 ruleset의 bypass 목록에 추가하는 것 외에 방법이 없다.

```
Settings → Rules → Rulesets → <ruleset 이름>
→ Bypass list → Add bypass → <App 선택>
→ Bypass mode: Always
```

**`Always`가 아니면 의미가 없다.** `Pull request` 모드는 PR을 통한 머지만 면제하고 직접 push는 그대로 막는다. 워크플로는 `git push`로 직접 밀기 때문에 똑같은 GH013이 다시 난다.

API로 넣을 때는 `actor_type`이 `Integration`이고 `actor_id`가 App ID다.

```json
{ "actor_id": <app-id>, "actor_type": "Integration", "bypass_mode": "always" }
```

단 `PUT /repos/{owner}/{repo}/rulesets/{id}`는 전체 페이로드를 요구한다. body를 일부만 보내면 기존 rules가 날아가므로 UI 쪽이 안전하다.

### bypass 범위를 좁히고 싶다면

**bypass는 ruleset 단위다. 특정 규칙만 골라서 면제할 수 없다.** 봇을 넣으면 삭제 금지·force push 금지까지 함께 열린다.

권한을 좁히려면 ruleset을 쪼갠다.

| Ruleset | 포함 규칙 | Bypass |
|---|---|---|
| `branches-protect` | `deletion`, `non_fast_forward`, `creation` | 없음 |
| `branches-review` | `pull_request`, `required_linear_history`, `required_status_checks` | App (Always) |

Ruleset은 여러 개가 동시에 적용되고 가장 엄격한 것이 이긴다. bypass는 ruleset별로 따로 평가된다. 이렇게 나누면 **봇은 정상 push는 되지만 브랜치 삭제와 force push는 여전히 막힌다.**

## 왜 이 방법인가

### `GITHUB_TOKEN`으로 바꾸면 되지 않나

`permissions: contents: write`를 준 기본 `GITHUB_TOKEN`을 쓰면 403은 사라진다. 실제로 같은 레포의 태그 생성 워크플로는 그렇게 동작하고 있었다.

그런데 이 경우엔 안 된다. **`GITHUB_TOKEN`으로 push하면 하위 워크플로가 트리거되지 않는다.** 무한 루프 방지를 위한 GitHub의 의도된 동작이다.

`main` → `alpha` → `develop` 연쇄가 성립하려면 `main` → `alpha` push가 `alpha`의 워크플로를 깨워야 한다. `GITHUB_TOKEN`을 쓰면 이 체인이 첫 단계에서 끊긴다. **App 토큰을 쓴 설계가 맞았고, 권한만 잘못 준 것이었다.**

### 부수효과는 받아들여야 한다

bypass를 걸면 대상 브랜치에 봇이 만든 머지 커밋이 계속 쌓인다. `required_linear_history`를 걸어놓고 봇만 영구 예외를 두는 셈이다. 이건 트레이드오프로 인정하고 넘어가는 수밖에 없다.

## 정리

- **조건부 push가 있는 워크플로는 `success` 하나로 판단하지 않는다.** skip 분기를 탔을 수 있다
- **로그 꼬리의 deprecation 경고는 실패 원인이 아니다.** run 레벨 annotation은 성공·실패와 무관하게 뜬다
- **`branches/*/protection`이 404여도 보호가 없는 게 아니다.** Rulesets는 별개 API(`/rulesets`)로 조회해야 한다
- **봇 push가 막히면 두 겹을 다 본다.** App installation 권한(`contents: write`)과 ruleset bypass 목록(`actor_type: Integration`, `bypass_mode: always`)
- **bypass는 ruleset 단위다.** 규칙별로 못 고르니, 범위를 좁히려면 ruleset을 보호용과 리뷰용으로 쪼갠다
- **`GITHUB_TOKEN` push는 하위 워크플로를 트리거하지 않는다.** 워크플로 연쇄가 필요하면 App 토큰을 써야 한다

---

- 이후 실제로 ruleset을 둘로 쪼개 봇에만 push를 허용한 과정과, 그 결정에서 비교한 대안은 [봇에게만 push를 허용하려고 Repository Ruleset을 둘로 쪼갠 이야기](/post/git/branch-sync-bot-ruleset-split)에 정리했다.
