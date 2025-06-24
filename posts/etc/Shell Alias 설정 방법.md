---

title: "Shell Alias 설정 방법"
date: "2025-06-24"
tags: \["Shell", "Alias", "Terminal", "bash", "zsh"]
summary: "자주 사용하는 명령어를 단축하기 위한 Shell alias 설정 방법을 Bash와 Zsh 환경에서 정리합니다."
------------------------------------------------------------------------

## 배경

* 터미널에서 `npm install`, `git status` 등 반복 입력이 번거로워 생산성이 저하됨
* 자주 쓰는 명령어를 짧은 단축키로 등록하여 빠르게 실행하고자 함

## 배운 내용

### 1. Bash에서 alias 설정

1. 홈 디렉토리(`~`)에 있는 `~/.bashrc` 또는 `~/.bash_profile` 파일을 엠에디터로 열기

   ```bash
   nano ~/.bashrc
   # 또는
   nano ~/.bash_profile
   ```
2. 파일 하단에 alias 구문 추가

   ```bash
   # npm install 단축
   alias ni='npm install'

   # git status 단축
   alias gs='git status'

   # 프로젝트 루트로 이동
   alias proj='cd ~/projects/my-app'
   ```
3. 변경사항 적용

   ```bash
   source ~/.bashrc
   # 또는
   source ~/.bash_profile
   ```
4. 테스트

   ```bash
   ni lodash     # npm install lodash 실행
   gs            # git status 실행
   proj          # 지정된 경로로 이동
   ```

### 2. Zsh에서 alias 설정

1. 홈 디렉토리의 `~/.zshrc` 파일을 염

   ```bash
   nano ~/.zshrc
   ```
2. alias 추가 후 저장

   ```bash
   alias ni='npm install'
   alias gs='git status'
   ```
3. 변경사항 적용

   ```bash
   source ~/.zshrc
   ```

### 3. 영구적 alias 관리 팁

* **별도 파일로 분리**: `~/.bash_aliases` 또는 `~/.zsh_aliases`를 만들어 alias만 관리

  ```bash
  # ~/.bashrc
  if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
  fi
  ```
* **버전 관리**: `~/.bash_aliases` 파일을 Git에 추가해 여러 환경에서 동일하게 사용
* **alias 목록 확인**:

  ```bash
  alias          # 현재 정의된 모든 alias 출력
  ```

## 느낀 점

* 자주 사용하는 명령어를 alias로 등록하니 타이핑 양이 줄어들어 개발 효율이 크게 향상됨
* 팀원과 공통 alias 파일을 공유하면 일관된 개발 환경을 유지할 수 있음
* alias와 함께 함수(`function`)를 등록해 더 복잡한 작업도 단축 가능함(예: `mkp() { mkdir -p "$1" && cd "$1"; }`)

---
