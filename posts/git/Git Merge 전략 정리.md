---

title: "Git Merge 전략 정리"
date: "2025-09-29"
tags: [Git, Merge, Branch]
summary: "Git에서 사용하는 다양한 merge 전략(Fast-Forward, Recursive, --no-ff, Squash, Rebase)을 정리하고, 각 전략의 히스토리를 그래프로 시각화하여 이해를 돕습니다."

---

## 1. Fast-Forward Merge (FF)

* **조건**: 현재 브랜치에 새로운 커밋이 없고, 대상 브랜치가 단순히 앞서 있을 때만 가능
* **동작**: 단순히 브랜치 포인터를 앞으로 이동
* **특징**:

  * merge commit이 생기지 않음 → 히스토리가 깔끔함
  * 하지만 브랜치 분기 시점을 추적하기 어려움

### 예시 흐름

```text
A---B---C (main)
         \
          D---E (feature)
```

Fast-forward로 합치면:

```text
A---B---C---D---E (main)
```

```bash
git checkout main
git merge feature   # fast-forward로 합쳐짐
```

---

## 2. Recursive Merge (3-Way Merge)

- **조건**: 양쪽 브랜치가 모두 새로운 커밋을 가진 경우
- **동작**:

  - Git은 두 브랜치의 **공통 조상(merge base)** 을 찾음
  - 세 방향을 비교하여 새로운 병합 커밋 생성

    1. merge base (공통 조상)
    2. 현재 브랜치 (HEAD)
    3. 병합 대상 브랜치

- **특징**:

  - 각 브랜치의 변경 사항을 모두 보존
  - 충돌(conflict)이 발생하면 사용자가 수동으로 해결해야 함

### 예시 흐름

```text
A---B---C   (main)
     \
      D---E (feature)
```

- `C`와 `E`를 merge하면 `B`가 merge base
- Git은 `B→C`, `B→E`의 차이를 반영해 새 커밋 `F` 생성

```text
A---B---C---------F (main)
     \           /
      D---E----- (feature)
```

- **장점**: 협업 시 히스토리 보존, 브랜치 병합 과정을 추적 가능
- **단점**: merge commit이 많아지면 히스토리가 복잡해짐

---

## 3. `--no-ff` (강제 Merge Commit)

- fast-forward가 가능하더라도 merge commit을 강제로 생성
- **특징**: 브랜치 작업 흔적을 보존할 수 있음

### 예시 흐름

```text
A---B---C (main)
     \
      D---E (feature)
```

`--no-ff`로 merge하면:

```text
A---B---C---------F (main)
     \           /
      D---E----- (feature)
```

여기서 `F`는 의도적으로 생성된 merge commit.

```bash
git checkout main
git merge --no-ff feature
```

---

## 4. Squash Merge

- feature 브랜치의 모든 커밋을 **하나의 커밋**으로 합쳐서 반영
- **특징**:

  - 히스토리가 깔끔
  - 하지만 개별 커밋 기록은 main에 남지 않음

### 예시 흐름

```text
A---B---C (main)
     \
      D---E (feature)
```

Squash merge 후:

```text
A---B---C---F (main)
```

여기서 `F`는 `D, E`를 합친 하나의 커밋.

```bash
git checkout main
git merge --squash feature
git commit -m "Feature merged as single commit"
```

---

## 5. Rebase + Merge

- 엄밀히 말하면 merge 전략은 아님
- feature 브랜치를 main 위로 재배치 후 fast-forward로 합침
- **특징**:

  - 히스토리가 직선형으로 깔끔
  - 협업 시 충돌 처리 및 강제 푸시 필요

### 예시 흐름

```text
A---B---C (main)
     \
      D---E (feature)
```

`feature`를 rebase하면:

```text
A---B---C (main)
          \
           D'---E' (feature)
```

그 후 fast-forward merge:

```text
A---B---C---D'---E' (main)
```

```bash
git checkout feature
git rebase main
git checkout main
git merge feature   # fast-forward
```

---

## 결론

- **Fast-Forward**: 깔끔하지만 브랜치 흔적 사라짐
- **Recursive (3-Way)**: 충돌 처리 가능, 협업에 적합
- **--no-ff**: 브랜치 병합 기록 보존
- **Squash**: 개별 커밋은 사라지지만 main은 단순화
- **Rebase**: 히스토리 직선화, 협업 시 주의 필요
