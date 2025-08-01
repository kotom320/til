---

title: "Git Push vs Publish Branch 이해하기"
date: "2025-08-01"
tags: ["Git", "VSCode", "GitHub Desktop", "Branch Management"]
summary: "로컬 브랜치와 원격 브랜치 생성 시 ‘push’와 ‘publish’의 차이, upstream 설정, VSCode/GitHub Desktop에서의 동작 방식을 정리합니다."
---------------------------------------------------------------------------------------------------------

## 배경

* 평소 VSCode나 GitHub Desktop 같은 GUI 도구로만 Git을 사용하다 보니, **CLI 명령어**(`git branch`, `git commit`, `git push`)에 익숙하지 않았음
* 터미널에서 `git branch feature/foo`로 새 브랜치를 만들고 `git push`만 입력했더니 원격에 브랜치가 생성되지 않아 당황
* 이후 upstream 설정이 필요하다는 것을 알게 되어, CLI에서 해결한 과정을 기록하고자 함

## 1. 로컬 브랜치 vs 원격 브랜치

* **로컬 브랜치**: 내 컴퓨터 저장소(working copy)에서만 존재
* **원격 브랜치**: GitHub/GitLab 등 서버 저장소에 존재

로컬에서 브랜치를 만들고 커밋하면, 해당 브랜치는 **내 로컬 저장소**에만 반영된 상태입니다.

## 2. `git push`만으로는? (upstream 미설정)

```bash
# 로컬에서 새 브랜치 생성 후
git checkout -b feature/foo
# 커밋
git commit -m "Add foo"
# 단순 push 시
git push
# ▶ 오류: No upstream configured for branch 'feature/foo'
```

* **upstream(원격 추적 브랜치)** 가 설정되지 않았기 때문
* `git push origin feature/foo`처럼 원격 브랜치 이름을 명시해야 원격에 브랜치가 생성됨

## 3. Publish Branch의 역할

* **Publish** 버튼은 내부적으로 다음을 수행:

  1. `git push --set-upstream origin feature/foo` 실행
  2. `feature/foo` 브랜치를 원격에 생성하고, 로컬 브랜치의 upstream을 설정

* 한 번 publish하면 이후에는 `git push`만으로도 커밋을 원격에 올릴 수 있음

## 4. VSCode vs GitHub Desktop

| 도구                 | Push 버튼                                 | Publish Branch 버튼               |
| ------------------ | --------------------------------------- | ------------------------------- |
| **VSCode**         | `git push` 실행 (upstream 설정된 경우만)        | 로컬 브랜치를 원격으로 생성 + upstream 설정   |
| **GitHub Desktop** | Push origin 브랜치 (upstream 미설정 시 prompt) | 자동으로 브랜치 publish (명시적 버튼 이름 없음) |

## 5. 수동 설정 방법

1. **로컬에서 직접**

   ```bash
   git push --set-upstream origin feature/foo
   # or git push -u origin feature/foo
   ```
2. **VSCode 터미널**에서도 동일하게 실행 가능

## 6. 느낀 점

* **Publish**는 단순 push 이상의 의미(원격 브랜치 생성 + upstream 설정)를 지님
* upstream을 한 번 설정해 두면, 이후 `git pull`, `git push` 명령이 편리해짐
* 브랜치 관리 시 로컬과 원격의 구분, upstream 개념을 명확히 이해하는 것이 중요함

---
