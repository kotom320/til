---

title: "Git Cherry-pick 심층 정리: Copy vs Cut, 이동 패턴, 다중 커밋 적용"
date: "2025-08-04"
tags: ["Git", "Cherry-pick", "Rebase", "Workflow"]
summary: "`git cherry-pick`의 동작(복사 여부), 완전한 이동(커밋 잘라내기) 구현법, 여러 커밋 동시 적용 방법을 한 번에 정리합니다."
---

## 1. Cherry-pick: 복사(Copy)인가, 잘라내기(Cut)인가?

* **결론**: cherry-pick은 **커밋을 복사(copy)** 합니다.

  * 원본 브랜치의 히스토리는 그대로 유지되어, 해시값이 다른 새 커밋이 생성됨
  * 기본 메시지에 `cherry picked from commit <hash>`가 자동 추가

```bash
# 예시: feature 브랜치의 abc123 커밋을 main에 복사
git checkout main
git cherry-pick abc123
# 원본 feature 브랜치에는 abc123이 그대로 남아 있음
```

## 2. "커밋 잘라내기"(Cut) 패턴 구현

Git에 cherry-cut 명령은 없으므로, **복사 후 삭제**하거나 **rebase --onto** 방식으로 잘라내기 이동을 구현합니다.

### 2.1. 복사 후 삭제

1. **복사**: target-branch에서 cherry-pick

   ```bash
   git checkout target-branch
   git cherry-pick <commit-hash>
   ```
2. **삭제**: source-branch로 돌아가 reset이나 interactive rebase로 제거

   ```bash
   git checkout source-branch
   # 마지막 커밋이면
   git reset --hard HEAD~1
   # 중간 커밋이면
   git rebase -i <commit-hash>^
   # 에디터에서 해당 줄을 'drop'으로 변경
   ```

### 2.2. rebase --onto로 한 번에 이동

```bash
# source-branch에서 A 커밋만 target-branch 위로 재배치
git checkout source-branch
git rebase --onto target-branch A^ A
```

* `A^ A` 범위(A를 포함한 단일 커밋)를 떼어내어 target-branch 위에 붙임
* source-branch에는 A가 제거되고, target-branch에 A가 fast-forward 적용됨

## 3. 여러 커밋 한번에 cherry-pick하기

### 3.1. 해시 나열

```bash
git checkout main
git cherry-pick hash1 hash2 hash3
```

* 지정된 순서대로 diff 적용, 새 커밋 생성

### 3.2. 범위 지정

```bash
git checkout main
git cherry-pick A..B
```

* A 이후(배타적)부터 B까지 모든 커밋을 순차 적용

### 3.3. 유용 옵션

* `-x`: 원본 해시 주석 추가
* `-n`/`--no-commit`: 스테이징만 수행, 마지막에 한 번에 커밋

```bash
# 예시: 세 커밋 스테이징만, 수동 커밋
git cherry-pick -n h1 h2 h3
git commit -m "cherry-pick multiple commits"
```

## 4. 결론 및 팁

* **cherry-pick은 복사(copy)**: 원본 유지, 안전한 커밋 적용
* **잘라내기(cut)**: cherry-pick + 삭제 또는 `rebase --onto` 패턴으로 이동 효과 구현
* **다중 적용**: 해시 나열이나 범위 지정으로 생산성 향상
* 협업 브랜치에서 리베이스/force-push는 위험하니 사전 협의 필수

---
