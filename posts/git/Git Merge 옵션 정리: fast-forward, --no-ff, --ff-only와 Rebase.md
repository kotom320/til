---

title: "Git Merge 옵션 정리: fast-forward, --no-ff, --ff-only와 Rebase"
date: "2025-08-04"
tags: ["Git", "Merge", "Rebase", "Workflow"]
summary: "Git merge 시 fast-forward(FF)와 --no-ff, --ff-only 옵션의 차이, 그리고 rebase 전략을 비교합니다."
-----------------------------------------------------------------------------------------

## 배경

* Git에서 feature 브랜치를 메인 브랜치에 합칠 때, merge 전략에 따라 히스토리 구조가 달라짐
* `--no-ff`, `--ff-only` 등의 옵션과 rebase 방식을 이해하면, 협업 히스토리를 깔끔하게 관리할 수 있음

## 1. Fast-forward(FF) 병합

* 기본 동작: **병합 커밋 없이** 브랜치 포인터만 이동

```bash
git checkout main
git merge feature
# feature가 main의 뒤를 곧장 이어가면, 새 커밋 없이 main이 feature 지점을 가리킴
```

* **장점**

  * 히스토리가 선형(linear)으로 유지되어 간단함
* **단점**

  * 브랜치별 작업 그룹이 구분되지 않아, 어떤 브랜치에서 작업했는지 파악 어려움

## 2. `--no-ff` (No Fast-forward)

* 항상 **병합 커밋**을 생성하여 두 브랜치의 관계를 명시적으로 기록

```bash
git checkout main
git merge --no-ff feature
# 병합 시마다 merge 커밋이 생성되어, feature 작업이 하나의 묶음으로 남음
```

* **장점**

  * 각 브랜치의 작업 단위를 명확히 구분
  * 나중에 merge 단위로 revert, cherry-pick 용이
* **단점**

  * 커밋 수 증가로 히스토리가 다소 복잡해 보일 수 있음

## 3. `--ff-only` (Fast-forward Only)

* **반드시 fast-forward** 가능한 경우에만 병합
* 충돌이나 두 갈래 이상의 브랜치가 있으면 병합 실패

```bash
git checkout main
git merge --ff-only feature
# feature가 main의 직계 뒤면 병합, 아니라면 에러
```

* **장점**

  * 히스토리를 절대 비선형으로 만들지 않음
* **단점**

  * 엄격한 기준으로, force merge를 위해 추가 작업 필요

## 4. Rebase 전략

* **Rebase**: feature 브랜치의 기반을 main의 최신 커밋으로 재설정하여, 선형 히스토리를 만듦

```bash
git checkout feature
git rebase main
# feature 커밋들을 main 위로 순차 재배치

git checkout main
git merge feature  # fast-forward 병합
```

* **장점**

  * 일관된 선형 히스토리
  * merge 없이 커밋 트리를 깔끔하게 유지
* **단점**

  * 이미 공유된(fetched/pushed) 브랜치를 rebase하면 히스토리 충돌 위험
  * 충돌 해결 시 commit hash가 변경되어 복잡해질 수 있음

## 5. 옵션 및 전략 비교

| 전략              | 병합 커밋 | 히스토리 형태         | 협업 권장 여부                                  |
| --------------- | ----- | --------------- | ----------------------------------------- |
| **FF default**  | 아니오   | 선형(linear)      | 소규모 팀, 간단한 브랜치 관리 시 적합                    |
| **--no-ff**     | 예     | 비선형(non-linear) | 작업 단위별 구분 필요, PR 단위 revert·추적이 중요할 때 추천   |
| **--ff-only**   | 아니오   | 선형(linear)      | 히스토리 절대 비선형 금지, 안정적 선형 히스토리 유지하고 싶을 때     |
| **Rebase + FF** | 아니오   | 선형(linear)      | 개인 브랜치 업데이트, OSS 기여 등 협업 전 풀리퀘 준비 단계에서 사용 |

## 느낀 점

* 프로젝트 성격에 따라 **선형 vs 비선형** 히스토리, **Merge commit 유무**를 결정해야 함
* `--no-ff`로 브랜치 경계를 명시하거나, rebase로 깔끔한 히스토리를 선택하는 전략을 상황에 맞게 조합하자
* 팀 컨벤션으로 merge 전략을 문서화하면, 협업 혼선을 줄이고 일관된 히스토리를 유지할 수 있음

---
