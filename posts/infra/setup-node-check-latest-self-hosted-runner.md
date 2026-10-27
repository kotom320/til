---
title: "self-hosted 러너에서 .nvmrc 가 24 인데도 옛 Node 를 쓰는 이유"
date: "2026-10-27"
tags: ["github-actions", "setup-node", "nodejs", "security"]
summary: "러너 tool cache 와 check-latest: true"
---

## 문제 상황

Node 에 보안 수정판이 나왔다. 번들된 CA 저장소에서 문제가 된 중간 CA 를 빼는 수정이라, 빌드와 배포에 쓰는 Node 를 22.23.4, 24.22.1, 26.12.1 이상으로 올려야 했다. npm, pnpm 도 레지스트리에 붙을 때 이 CA 저장소를 쓴다.

레포의 `.nvmrc` 는 `24` 한 줄이고, CI 는 이 파일을 읽는다.

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
```

메이저만 적어 두었으니 최신 24.x 를 받아올 거라고 생각했다. 그런데 수정판이 나온 뒤에도 CI 로그는 이렇게 찍혔다.

```
Found in cache @ /home/runner/_work/_tool/node/24.21.0/arm64
```

24.21.0 은 수정판 이전 버전이다.

## 원인 분석

`setup-node` 는 버전 범위(`24`)를 받으면 **먼저 러너의 tool cache 를 본다.** 범위에 맞는 버전이 캐시에 있으면 그걸 쓰고 끝낸다. 네트워크로 최신 버전을 확인하지 않는다.

- GitHub 호스티드 러너는 run 마다 새 머신이라 캐시가 이미지에 들어 있는 버전으로 정해지고, 이미지가 주기적으로 갱신된다
- self-hosted 러너는 `_tool` 디렉터리가 run 사이에 그대로 남는다. 한 번 받은 24.21.0 이 계속 "24 에 맞는 버전"으로 선택된다

그래서 `.nvmrc` 를 아무리 `24` 로 두어도, self-hosted 러너에서는 처음 캐시에 들어간 버전에 사실상 고정된다.

## 해결 방법

`check-latest: true` 를 넣으면 캐시를 보기 전에 범위에 맞는 최신 버전을 확인하고, 캐시에 없으면 받아온다.

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
    check-latest: true
```

여러 워크플로에 한 번에 넣을 때는 `node-version-file` 줄 바로 아래에 같은 들여쓰기로 추가했다.

```bash
perl -0pi -e "s/^(\s*)(node-version-file: '\.nvmrc'\n)/\$1\$2\$1check-latest: true\n/mg" .github/workflows/*.yml
```

적용 후 로그:

```
Resolved as '24.22.1'
node: v24.22.1
```

## 왜 이 방법인가

| 방법 | 장점 | 단점 |
|---|---|---|
| `.nvmrc` 를 `24.22.1` 로 고정 | 재현성 | 다음 수정판마다 손으로 올려야 한다 |
| 러너의 `_tool/node` 캐시 삭제 | 설정 변경 없음 | 다시 받은 버전이 또 고정된다. 일회성 |
| `check-latest: true` | 수정판이 나오면 자동 반영 | run 마다 버전 확인 요청이 한 번 더 간다 |

보안 수정판이 계속 나오는 상황이라 마지막 방법을 골랐다. `.nvmrc` 는 `24` 그대로 둔다.

### 같이 볼 것: setup-node 없이 도는 잡

setup-node 를 쓰지 않고 바로 `pnpm install` 하는 잡은 러너 머신에 설치된 Node 를 쓴다. 로그에 버전이 찍히지 않아서 놓치기 쉽다. `node -v` 를 찍거나 setup-node 를 붙인다.

## 덤: 개발 PC 는 신뢰 저장소가 여러 개다

로컬에서 직접 배포하는 레포(firebase deploy, cdk deploy 등)는 개발 PC 의 Node 가 곧 배포 Node 다. 같이 점검해 보니 도구마다 CA 저장소를 따로 들고 있었다.

| 도구 | 신뢰 저장소 | 조치 |
|---|---|---|
| nvm 으로 깐 Node | 버전마다 번들 | 옛 버전(12~20, 옛 22/24) 삭제, 22.23.4 / 24.22.1 만 남김 |
| Homebrew node, openjdk | Homebrew `ca-certificates` | `brew upgrade ca-certificates node openjdk` |
| pip | 자체 번들(certifi) | `pip.conf` 의 `cert` 를 Homebrew 번들로 지정 |
| 별도 설치한 JDK | JDK 의 `cacerts` | 수정판 JDK 로 패치, 안 쓰는 버전 삭제 |
| AWS CLI v2 | botocore 번들 | 최신판 재설치 |
| Docker Desktop | 엔진 VM 안의 저장소 | 앱 업데이트. 옛 버전 엔진은 테스트용 위조 인증서와 TLS 연결을 맺었다 |

macOS 키체인을 정리했다고 끝나지 않는다. 도구마다 자기 저장소를 업데이트해야 한다.

## 정리

self-hosted 러너에서 `node-version` 에 범위를 쓰면 캐시에 처음 들어간 버전에 고정된다. 최신 수정판을 따라가려면 `check-latest: true` 를 넣는다.
