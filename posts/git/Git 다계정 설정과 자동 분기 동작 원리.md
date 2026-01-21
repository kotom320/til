---

title: "Git 다계정 설정과 자동 분기 동작 원리"
date: "2025-08-29"
tags: [Git, SSH, Config, 계정관리]
summary: "회사용과 개인용 Git 계정을 한 환경에서 동시에 쓰는 방법과, 레포별로 자동으로 올바른 계정이 적용되는 이유를 정리합니다."

---

## 1. 다계정 설정하기

회사 계정과 개인 계정을 같은 PC에서 쓰려면 **SSH 키 분리 + config 설정**이 핵심이다.

### 1.1 SSH 키 생성

```bash
# 회사 계정
ssh-keygen -t ed25519 -C "company@example.com" -f ~/.ssh/id_ed25519_company

# 개인 계정
ssh-keygen -t ed25519 -C "personal@example.com" -f ~/.ssh/id_ed25519_personal
```

### 1.2 SSH config 작성

`~/.ssh/config` 에서 Host 별칭으로 키를 나눠준다.

```
Host github.com-company
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_company

Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
```

### 1.3 Git remote 설정

레포별 remote 주소를 Host 별칭에 맞게 설정한다.

```bash
# 회사 레포
git remote set-url origin git@github.com-company:COMPANY/repo.git

# 개인 레포
git remote set-url origin git@github.com-personal:USERNAME/repo.git
```

### 1.4 includeIf (선택)

폴더 단위로 계정을 구분할 수도 있다.

```ini
# ~/.gitconfig
[includeIf "gitdir:~/work/"]
  path = ~/.gitconfig-company

[includeIf "gitdir:~/personal/"]
  path = ~/.gitconfig-personal
```

---

## 2. 왜 자동으로 계정이 적용될까?

push 할 때 별도 옵션을 주지 않아도 계정이 자동으로 분리되는 이유는 단순하다.

- **SSH config 매칭**
  → remote 주소의 Host(`github.com-company` / `github.com-personal`)가 SSH 설정과 연결된다.
- **레포별 .git/config 저장**
  → 각 프로젝트마다 다른 remote 주소를 기억한다.
- **includeIf 조건**
  → 디렉토리 경로별로 user.email / user.name 이 자동 지정된다.

즉, **remote + SSH config + includeIf** 덕분에 VS Code 같은 하나의 에디터에서도 알아서 계정이 분리된다.

---

## 3. 점검 방법

```bash
# 현재 remote 확인
git remote -v

# 현재 계정 확인
git config user.name
git config user.email

# 실제 연결 테스트
ssh -T git@github.com-company
ssh -T git@github.com-personal
```

---

## 4. 추가로 생각할 점

- 회사에서 **SSO + HTTPS**를 강제하는 경우 → Credential Manager(맥 Keychain, 윈도우 자격 증명 관리자)에서 계정 분리를 따로 관리해야 한다.

---

👉 정리하면, **SSH config와 remote 설정만 잘 해두면 자동으로 계정 분리**가 된다.
따라서 굳이 매번 계정을 바꿀 필요 없이, 프로젝트에 들어가서 그냥 `git push` 하면 끝.
