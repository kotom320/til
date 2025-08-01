---

title: "Oh My Zsh에서 Alias & Shell 함수 설정 가이드"
date: "2025-08-01"
tags: ["Zsh", "Alias", "Shell Function", "sh", "Oh My Zsh"]
summary: "Oh My Zsh 환경에서 편리하게 alias를 만들고, 변수명·함수 선언 규칙과 sh 스크립트 사용법을 간단히 정리합니다."
--------------------------------------------------------------------------------

## 배경

* Oh My Zsh(omz)를 사용하며 자주 쓰는 명령들을 `alias`로 등록하니 반복 입력이 줄어들어 생산성이 상승
* 이 과정에서 변수명·함수 선언법, sh 스크립트 안에서의 활용법을 학습하게 되어 경험을 기록함

## 1. Alias 기본 문법

```sh
# alias 정의
alias gs='git status'
alias ll='ls -lah'

# 적용 방법: ~/.zshrc 혹은 ~/.zsh_aliases에 추가 후
# source ~/.zshrc
```

### 1.1. 변수 포함 alias

* **환경 변수**를 그대로 사용 가능

  ```sh
  export PROJECT_DIR="$HOME/projects/my-app"
  alias cdp='cd $PROJECT_DIR'
  ```
* **주의**: `export`된 변수를 사용하거나, 작은따옴표 대신 큰따옴표 안에서 확장

## 2. 변수명 설정 규칙

1. **대문자 + 언더스코어** (`UPPER_SNAKE_CASE`) 권장

   * 예: `export DEV_PROXY_URL="http://localhost:3000"`
2. **알파벳, 숫자, 언더스코어만 사용**

   * 변수명은 숫자로 시작 불가 (`1FOO` ❌, `FOO1` ✅)
3. **예약어 피하기**

   * `PATH`, `HOME` 등 시스템 변수와 겹치지 않도록 주의
4. **export 여부 결정**

   * 서브셸에서도 필요하면 `export`로 환경 변수로 만들기

## 3. Shell 함수 선언법

```sh
# 간단한 함수
mkcd() {
  mkdir -p "$1" && cd "$1"
}

# 함수 이름 규칙: 소문자 + 언더스코어 또는 하이픈
# (하이픈 사용 시 호출할 때는 중괄호 필요)
show_date() {
  date '+%Y-%m-%d %H:%M:%S'
}
```

### 3.1. 매개변수 사용

* `$1`, `$2` 등 위치 매개변수로 접근
* `$@` 전체, `$#` 개수 조회 가능

```sh
greet() {
  local name="$1"
  echo "Hello, ${name:-Guest}!"
}
```

### 3.2. 반환값 처리

* 함수 내부 `return N` 은 종료 코드(0\~255), 출력값은 `echo` 후 호출부에서 `$(fn)` 으로 캡처

```sh
add() {
  echo $(($1 + $2))
}
sum=$(add 2 3)  # sum=5
```

## 4. sh 스크립트 활용 팁

1. **실행 권한 부여**

   ```sh
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```
2. **스크립트 내 환경 로드**

   ```sh
   #!/usr/bin/env sh
   source ~/.zshrc  # alias·변수 로드
   ```
3. **모듈화**

   * `~/.zsh_aliases`, `~/.zsh_functions` 등 파일 분리 후 `source`하여 관리

## 느낀 점

* alias와 함수는 CLI 생산성 향상에 매우 유용하며, **명확한 네이밍**과 **단순 로직**을 지키면 유지보수도 편리함
* 변수는 `UPPER_SNAKE_CASE`로, 함수는 `lower_snake_case`로 일관성 있게 관리하는 것이 좋음
* sh 스크립트 안에서 alias·함수를 불러올 때는 반드시 `source`를 통해 환경을 로드해야 오류를 방지할 수 있음

---
