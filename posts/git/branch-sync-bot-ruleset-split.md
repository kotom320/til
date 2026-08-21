---
title: "봇에게만 push를 허용하려고 Repository Ruleset을 둘로 쪼갠 이야기"
date: "2026-08-21"
tags: ["github", "ruleset", "github-app", "branch-strategy", "ci"]
summary: "main 머지를 develop으로 자동 동기화하려는데 봇이 PR-only 규칙에 막혔다. 규칙을 없앨 것인가, 봇에게만 예외를 줄 것인가"
---

## 배경: 상위 브랜치 머지를 하위로 자동 동기화

배포 전략이 바뀌었다. 핫픽스는 `main`에 직접 들어가는데, 그 커밋이 `develop`에 반영되지 않으면 다음 릴리스에서 같은 버그가 되살아난다. 그래서 **상위 브랜치가 머지되면 하위 브랜치가 자동으로 따라오게** 만들기로 했다.

대상은 `main` → `develop` 한 쌍이다. 중간 환경(alpha 등)이 있으면 순서와 중복 동기화를 따로 설계해야 하지만, 여기서는 두 브랜치만 다룬다.

워크플로 자체는 단순하다. `main`에 push되면 `develop`을 체크아웃해서 머지하고 push한다.

```yaml
name: auto-merge-from-main

on:
  push:
    branches: [main]

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
          git merge --no-edit origin/main
          git push origin develop
```

## 문제: 봇도 규칙을 따른다

머지는 됐는데 push가 거부됐다.

```
remote: error: GH013: Repository rule violations found for refs/heads/develop.
remote: - Changes must be made through a pull request.
 ! [remote rejected] develop -> develop (push declined due to repository rule violations)
```

`main`과 `develop`은 **PR로만 머지할 수 있다**는 ruleset이 걸려 있었다. 그리고 봇도 이 규칙의 예외가 아니었다.

여기서 착각하기 쉬운 게 하나 있다. 러너 안에서 `git merge`는 멀쩡히 성공한다. 로그만 보면 "머지됐다"로 보인다. 하지만 그건 러너의 로컬 작업 트리에서 일어난 일이고, 원격에 반영되는 순간은 `git push`다. **머지 성공은 아무것도 보장하지 않는다.**

사람이 이걸 눈치채기 어려운 이유도 있다. ruleset의 bypass 목록에는 관리자 역할(RepositoryRole)이 들어 있어서 사람은 필요할 때 우회가 됐다. 규칙에 걸리는 건 봇뿐이라 도입 전에는 아무도 문제를 못 느꼈다.

봇 push가 막히는 원인은 App 권한과 ruleset 두 겹으로 나뉘는데, 진단 과정은 [GitHub Actions 봇 push가 막힐 때: App 권한과 Repository Ruleset](/post/git/github-actions-bot-push-blocked-rulesets)에 정리해뒀다. 이 글은 그다음, **원인을 알고 나서 무엇을 선택했는가**에 대한 기록이다.

## 두 갈래

| | 1안: 규칙을 연다 | 2안: 봇에게만 예외 |
|---|---|---|
| 방법 | `pull_request` 규칙 제거, 또는 모두에게 bypass | bypass 목록에 봇(App) 추가 |
| 영향 대상 | 사람 포함 전원 | 봇 하나 |
| 잃는 것 | 리뷰 없는 직접 push 차단 장치 | 설정이 두 곳으로 나뉨 |

1안이 훨씬 간단하다. 체크박스 하나면 끝난다. 문제는 **그 규칙이 봇을 막으려고 있는 게 아니라는 점**이다. PR-only 규칙은 사람이 급할 때 `develop`에 바로 밀어넣는 걸 막는 장치다. 자동화 하나 돌리자고 그걸 끄면, 봇 문제는 풀리지만 원래 막고 있던 것도 같이 열린다.

그래서 2안으로 갔는데, 여기서 GitHub ruleset의 제약을 하나 만난다.

## 제약: bypass는 규칙별이 아니라 ruleset 단위다

"봇에게 push만 허용"을 그대로 표현할 수가 없다. bypass 목록에 봇을 넣으면 **그 ruleset에 들어 있는 모든 규칙**에서 면제된다. 우리 ruleset에는 이런 것들이 한 덩어리로 들어 있었다.

```
deletion                 (브랜치 삭제 금지)
non_fast_forward         (force push 금지)
creation                 (브랜치 생성 제한)
pull_request             (PR로만 머지)
required_linear_history  (머지 커밋 금지)
required_status_checks   (체크 통과 필수)
```

봇을 이 목록의 bypass에 넣는 순간, 필요한 `pull_request` 면제뿐 아니라 **브랜치 삭제 금지와 force push 금지까지 함께 열린다.** 봇 토큰이 유출되거나 워크플로에 실수가 있으면 `develop`을 지우거나 히스토리를 날리는 것도 막을 게 없어진다.

## 해결: ruleset을 보호용과 리뷰용으로 쪼갠다

규칙별로 예외를 못 주니, **예외를 주고 싶은 규칙끼리 모아 별도 ruleset으로 분리**했다.

| Ruleset | 규칙 | Bypass |
|---|---|---|
| `major-branches` | `deletion`, `non_fast_forward`, `creation` | 관리자 역할만 |
| `major-branches-review` | `pull_request`, `required_linear_history`, `required_status_checks` | 관리자 역할 + App(Always) |

둘 다 `main`, `develop`에 동일하게 적용된다. Ruleset은 여러 개가 겹쳐서 적용되고, **bypass는 ruleset마다 따로 평가된다.** 그래서 결과가 이렇게 갈린다.

- 봇의 `git push origin develop`: `major-branches-review`에서 면제되고, `major-branches`의 규칙에는 걸리지 않으므로 통과
- 봇의 `git push --force` 또는 브랜치 삭제: `major-branches`에 그대로 걸려 거부
- 사람의 직접 push: 두 ruleset 모두 그대로 적용

봇에게 준 예외가 "정상 push"로 좁혀진 것이다.

bypass를 넣을 때 `bypass_mode`는 `always`여야 한다. `pull_request` 모드는 PR을 통한 머지만 면제하고 직접 push는 그대로 막기 때문에, 워크플로에서는 같은 GH013이 다시 난다.

설정 확인은 API로 한다. classic branch protection(`/branches/*/protection`)과는 별개의 엔드포인트다.

```bash
gh api repos/<owner>/<repo>/rulesets --jq '.[] | {id, name}'

gh api repos/<owner>/<repo>/rulesets/<id> \
  --jq '{bypass: [.bypass_actors[] | {actor_id, actor_type, bypass_mode}],
         rules: [.rules[].type]}'
```

App은 `actor_type`이 `Integration`으로 잡힌다.

```json
{ "actor_id": <app-id>, "actor_type": "Integration", "bypass_mode": "always" }
```

## 왜 이 방법인가

두 안의 차이는 "누가 불편해지는가"다.

1안은 봇을 위해 사람에게 적용되던 장치를 끈다. 규칙을 끄는 건 한 번의 클릭이지만, 그 뒤로 규칙이 잡아주던 실수는 아무도 안 잡아준다. 자동화 도입의 비용을 팀 전체가 나눠 지는 셈이다.

2안은 봇에게만 최소한의 구멍을 내고, 그 대가로 설정을 두 곳으로 나눠 관리한다. 비용이 명확히 자동화 쪽에 남는다. 여기서 실제로 지불하는 비용은 **"왜 ruleset이 두 개냐"를 모르는 다음 사람이 이걸 다시 합쳐버릴 수 있다**는 것이다. 그래서 이름을 `-review` 접미사로 나눠 의도가 이름에 드러나게 했다.

일반화하면 이렇다. **GitHub ruleset에서 예외는 주체 단위가 아니라 규칙 묶음 단위로 주어진다.** 그래서 "이 봇에게 이 규칙만 풀어주고 싶다"는 요구는 주체를 좁히는 게 아니라 **규칙 묶음을 좁혀서** 표현해야 한다. 이 모델을 모르면 "봇 하나 때문에 규칙을 다 열어야 하나"라는 잘못된 양자택일에 갇힌다.

## 남는 문제

- 봇에게 준 예외는 기한이 없다. 토큰이 유출되면 그 예외가 그대로 남는다. 쪼갠 덕분에 삭제·force push까지 열리지는 않지만, 리뷰 없는 push는 가능한 상태다.
- `required_linear_history`를 걸어두고 봇만 면제했으므로, `develop`에는 봇이 만든 머지 커밋이 계속 쌓인다.
- 자동 동기화는 충돌이 없을 때만 조용히 돌아간다. 충돌이 나면 워크플로가 실패하므로 실패 알림을 붙여두지 않으면 며칠씩 동기화가 밀린 걸 모른다.

## 정리

- **러너에서 `git merge`가 성공한 건 아무 의미가 없다.** 반영되는 순간은 `git push`이고, 규칙은 거기서 평가된다
- 봇이 규칙에 막혔을 때 선택지는 "규칙을 끈다"와 "봇에게 예외를 준다" 둘인데, **전자의 비용은 봇이 아니라 사람이 지불한다**
- **bypass는 ruleset 단위다.** 규칙별로 예외를 줄 수 없으니, 예외 범위를 좁히려면 ruleset을 보호용(삭제·force push)과 리뷰용(PR·체크)으로 쪼갠다
- Ruleset은 겹쳐서 적용되고 bypass는 각각 평가된다. 이 성질이 "봇은 push만 가능"을 만들어준다
- `bypass_mode`는 `always`. `pull_request` 모드로는 직접 push가 안 뚫린다
