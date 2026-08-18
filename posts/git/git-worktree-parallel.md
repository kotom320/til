---
title: "git worktree로 브랜치 여러 개를 동시에 펼쳐놓기"
date: "2026-08-18"
tags: ["git", "worktree", "branch", "workflow"]
summary: "stash와 checkout 없이 브랜치마다 별도 디렉터리를 두고 병렬로 작업하는 방법"
---

## 배경 / 계기

기능 브랜치에서 한창 작업 중인데 급한 버그 수정 요청이 들어오는 상황이 반복됐다. 그때마다 하던 일을 `git stash`로 밀어놓고 `git checkout hotfix`, 고치고 다시 돌아와 `git stash pop`을 했다. 리뷰 요청이 오면 또 한 번 왕복해야 한다.

작업 트리가 하나뿐이라 생기는 문제다. `git worktree`는 저장소 하나에 작업 디렉터리를 여러 개 붙일 수 있게 해준다.

## 핵심 개념

`git worktree add <경로> <브랜치>`를 실행하면 그 경로에 브랜치가 체크아웃된 디렉터리가 새로 생긴다. 저장소를 다시 클론하는 것과는 다르다. 커밋 객체와 브랜치 참조는 원본 저장소와 그대로 공유하고, 체크아웃된 내용만 분리된다.

```bash
# 새 브랜치를 만들면서 ../feat-a 디렉터리에 펼치기
git worktree add ../feat-a -b feature/a

# 이미 있는 브랜치를 펼치기
git worktree add ../hotfix hotfix/login

# 현재 붙어 있는 작업 트리 목록
git worktree list
# /path/to/main-repo  3736192 [master]
# /path/to/feat-a     417bb6f [feature/a]
```

새로 생긴 디렉터리의 `.git`은 디렉터리가 아니라 원본을 가리키는 파일이다.

```bash
cat ../feat-a/.git
# gitdir: /path/to/main-repo/.git/worktrees/feat-a
```

이제 `../feat-a`와 원본 디렉터리에서 각각 에디터를 열고, 각각 dev 서버를 띄우고, 각각 커밋할 수 있다. 브랜치를 오갈 일이 없으니 stash도 필요 없다.

## 무엇이 분리되고 무엇이 공유되는가

worktree마다 따로 갖는 것:

- HEAD와 체크아웃된 브랜치
- 인덱스(스테이징 영역)와 작업 디렉터리 파일

원본 저장소와 공유하는 것:

- 커밋 객체, 태그, `refs/heads`의 브랜치들
- stash

한 worktree에서 커밋하면 다른 worktree에서 즉시 `git log feature/a`로 보인다. 반면 stash는 공유라서, `../feat-a`에서 `git stash`한 것이 원본 디렉터리의 `git stash list`에도 그대로 뜬다. worktree별로 격리된다고 생각하고 pop하면 엉뚱한 곳의 변경을 꺼내게 된다.

## 같은 브랜치는 두 곳에서 체크아웃할 수 없다

```bash
git worktree add ../feat-a2 feature/a
# fatal: 'feature/a' is already checked out at '/path/to/feat-a'
```

브랜치 참조가 공유되기 때문에 생기는 제약이다. 같은 커밋 내용을 다른 곳에서 열어보기만 하면 되는 경우에는 `--detach`로 우회한다.

```bash
git worktree add --detach ../peek feature/a
```

## 정리할 때

```bash
git worktree remove ../feat-a
```

커밋하지 않은 변경이나 untracked 파일이 남아 있으면 거부한다.

```
fatal: '../feat-b' contains modified or untracked files, use --force to delete it
```

디렉터리를 손으로 지워버렸다면 `git worktree prune`으로 메타데이터를 정리한다.

## 실무에서 걸리는 지점

새 worktree에는 gitignore된 파일이 따라오지 않는다. 추적 대상 파일만 체크아웃되기 때문이다.

```bash
git worktree add ../feat-b -b feature/b
ls -a ../feat-b
# .  ..  .git  .gitignore  a.txt      # node_modules 없음
```

즉 Node 프로젝트라면 worktree마다 `pnpm install`을 다시 해야 하고, `.env.local` 같은 로컬 설정 파일도 직접 복사해야 한다. 여러 브랜치의 dev 서버를 동시에 띄운다면 포트도 서로 다르게 잡아야 한다.

worktree 디렉터리는 저장소 안이 아니라 형제 경로(`../feat-a`)에 두는 편이 낫다. 저장소 내부에 만들면 추적 대상에 잡히거나 빌드 도구가 훑어버린다.

## 왜 이 방법인가

같은 목적을 stash나 추가 클론으로도 달성할 수 있다.

| 방법 | 비용 | 문제 |
|------|------|------|
| stash + checkout | 없음 | 왕복이 잦고, pop 충돌·유실 위험 |
| 추가 clone | 히스토리 전체 복제 | 브랜치·커밋이 저장소마다 따로 놀아 fetch를 또 해야 함 |
| worktree | 체크아웃된 파일만 | gitignore 파일은 각자 준비 |

worktree는 히스토리를 공유하면서 파일만 분리하기 때문에, 한쪽에서 만든 커밋을 다른 쪽에서 바로 rebase나 cherry-pick 대상으로 쓸 수 있다. 이 점이 추가 클론과 갈리는 지점이다.

## 정리

- `git worktree add ../dir -b branch`로 브랜치마다 디렉터리를 따로 둔다. checkout 왕복이 사라진다.
- HEAD와 인덱스는 분리, 커밋과 브랜치와 stash는 공유. 같은 브랜치를 두 곳에 체크아웃할 수는 없다(`--detach`로 우회).
- gitignore된 파일은 따라오지 않는다. worktree마다 의존성 설치가 필요하다.
- 정리는 `git worktree remove`, 디렉터리를 손으로 지웠다면 `git worktree prune`.
- 브랜치 이름을 로컬에서 임시로 짓고 원격에는 다른 이름으로 올리고 싶다면 [로컬 브랜치와 다른 이름으로 원격에 push하기](/post/git/git-push-different-branch-name) 참고.
