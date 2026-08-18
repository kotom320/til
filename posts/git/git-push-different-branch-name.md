---
title: "로컬 브랜치와 다른 이름으로 원격에 push하기"
date: "2026-08-18"
tags: ["git", "push", "refspec", "branch"]
summary: "git push origin <로컬>:<원격> refspec과 upstream 이름이 어긋났을 때 생기는 에러"
---

## 배경 / 계기

로컬에서는 `wip`, `tmp`, `test-2` 같은 대충 지은 이름으로 작업하다가, 원격에는 컨벤션에 맞는 `feature/PROJ-123-login` 같은 이름으로 올려야 할 때가 있다. 반대로 원격 브랜치 이름을 잘못 지어서 다시 올려야 하는 경우도 있다.

브랜치 이름을 바꾸고(`git branch -m`) push하는 방법도 있지만, push할 때 이름을 지정하는 편이 간단하다.

## 핵심 개념: refspec

`git push`의 인자는 `<원격>:<원격에 만들 이름>` 형태의 refspec을 받는다. 콜론 왼쪽이 보낼 대상, 오른쪽이 원격에 만들어질 이름이다.

```bash
# 로컬 feature/a 를 원격에는 review/a 라는 이름으로
git push origin feature/a:review/a
# * [new branch]      feature/a -> review/a

# 현재 브랜치를 원격에는 다른 이름으로
git push origin HEAD:brand-new
# * [new branch]      HEAD -> brand-new
```

오른쪽 이름이 원격에 없어도 새로 만들어진다. `refs/`로 시작하지 않으면 git이 알아서 `refs/heads/`를 붙인다. 다만 이름이 태그와 겹치는 등 모호한 상황을 피하려면 전체 경로를 쓰는 편이 안전하다.

```bash
git push origin HEAD:refs/heads/other-name
```

같은 문법으로 원격 브랜치 삭제도 된다. 왼쪽을 비우면 "아무것도 아닌 것"을 그 이름에 밀어넣는 셈이다.

```bash
git push origin :review/a     # git push origin --delete review/a 와 같음
```

## 함정: upstream 이름이 어긋나면 그냥 push가 막힌다

`-u`를 붙이면 upstream이 원격 쪽 이름으로 잡힌다.

```bash
git push -u origin HEAD:refs/heads/other-name
# branch 'feature/a' set up to track 'origin/other-name'.
```

여기까지는 의도한 대로다. 그런데 다음번에 인자 없이 `git push`를 하면 실패한다.

```
fatal: The upstream branch of your current branch does not match
the name of your current branch.  To push to the upstream branch
on the remote, use

    git push origin HEAD:other-name

To push to the branch of the same name on the remote, use

    git push origin HEAD

To choose either option permanently, see push.default in 'git help config'.
```

git의 기본값인 `push.default=simple`은 로컬 브랜치 이름과 원격 브랜치 이름이 같을 때만 인자 없는 push를 허용한다. 이름이 어긋난 채로 그냥 push하면 어느 쪽 의도인지 알 수 없기 때문에, 추측하는 대신 멈추고 두 가지 선택지를 알려준다.

해결은 둘 중 하나다.

```bash
# 1. 매번 명시한다
git push origin HEAD:other-name

# 2. upstream 이름을 따르도록 설정한다 (해당 저장소만)
git config push.default upstream
git push
#   417bb6f..d5e65e2  feature/a -> other-name
```

`push.default=upstream`은 "로컬 이름이 뭐든 upstream에 설정된 브랜치로 보낸다"는 뜻이다. 이름이 다른 상태를 계속 유지할 거라면 이쪽이 편하다. 전역으로 바꾸면 다른 저장소의 push 동작까지 달라지므로 저장소 단위로 거는 편이 낫다.

## 왜 이 방법인가

로컬 이름을 원격 이름에 맞추는 방법(`git branch -m new-name` 후 push)과 비교하면:

- 로컬 이름을 바꾸면 이름이 항상 일치하므로 `push.default` 문제가 없다. 원격 이름을 확정한 뒤에는 이쪽이 깔끔하다.
- refspec push는 로컬 이름을 그대로 두고 싶을 때 쓴다. 같은 커밋을 원격의 여러 이름으로 올려야 하거나, 로컬 이름이 내 작업 순서에 맞춰져 있어 유지하고 싶을 때다.

## 정리

- `git push origin <로컬>:<원격>`으로 원격 브랜치 이름을 다르게 지정한다. `git push origin :<원격>`은 삭제.
- 오른쪽 이름이 원격에 없으면 새로 만들어진다. 모호함이 걱정되면 `refs/heads/`까지 쓴다.
- `-u`로 이름이 다른 upstream을 잡으면 이후 인자 없는 `git push`가 `push.default=simple`에서 막힌다. 매번 명시하거나 `git config push.default upstream`으로 푼다.
- 브랜치별로 디렉터리를 나눠 병렬 작업하는 방법은 [git worktree로 브랜치 여러 개를 동시에 펼쳐놓기](/post/git/git-worktree-parallel) 참고.
