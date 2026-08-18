---
title: "Jenkins NodeJS 툴을 20에서 24로 올리기"
date: "2026-08-18"
tags: ["jenkins", "nodejs", "ci-cd", "corepack", "pnpm"]
summary: "빌드는 성공하는데 경고만 쌓이던 Node 20 파이프라인을 24로 올리면서 확인한 것들"
---

## 문제 상황

배포는 성공한다. 실패한 스테이지도 없다. 그런데 빌드 로그를 열어보면 서로 다른 도구 세 개가 같은 말을 하고 있었다.

pnpm install 단계:

```
 WARN  Unsupported engine: wanted: {"node":">=20.19.0"} (current: {"node":"v20.11.1","pnpm":"8.9.0"})
```

OpenAPI 스펙을 합치는 단계:

```
⚠️ Warning: failed to satisfy expected node version.
   Expected: ">=22.12.0 || >=20.19.0 <21.0.0", Current "v20.11.1"

openapi-joined.yaml: join processed in 2246ms
```

Vite 7을 쓰는 서브모듈 빌드 단계:

```
You are using Node.js 20.11.1. Vite requires Node.js version 20.19+ or 22.12+.
Please upgrade your Node.js version.
✓ built in 9.37s
```

세 개 모두 "요구사항을 못 맞췄다"고 말하면서 그냥 돈다. 즉 깨진 상태가 아니라 경고를 무시하며 굴러가는 상태다. Jenkins 파이프라인의 tools 블록에는 이렇게 박혀 있었다.

```groovy
tools {
    nodejs "NodeJS 20.11.1"
}
```

## 원인 분석

### 왜 하필 20.19.0이 하한선인가

경고에 나오는 숫자가 전부 `20.19.0` 아니면 `22.12.0`이다. 임의로 정한 값이 아니다. CommonJS에서 ESM 모듈을 `require()`할 수 있게 하는 기능이 Node 22에 들어간 뒤 20.19.0으로 백포트됐고, 그 시점부터 생태계가 `^20.19.0 || >=22.12.0`을 하한으로 잡기 시작했다. Vite, Redocly 같은 도구가 내부적으로 ESM 전용 패키지를 CJS 경로에서 불러오기 때문이다.

20.11.1은 이 선 바로 아래다. 지금 안 터지는 이유는 아직 아무도 그 경로를 밟지 않았기 때문이지, 안전해서가 아니다. 의존성 하나만 올려도 `ERR_REQUIRE_ESM`으로 빌드가 죽을 수 있다.

### Jenkins는 .nvmrc를 읽지 않는다

레포의 `.nvmrc`는 이미 `24`였다. 그런데도 빌드는 20.11.1에서 돌았다. NodeJS 플러그인은 Jenkins 전역 도구 설정에 등록된 installation을 이름으로 가져다 쓸 뿐, 저장소 안의 `.nvmrc`나 `engines` 필드를 보지 않는다. 로컬과 CI는 `.nvmrc`를 읽고, 빌드 서버만 자기 설정을 본다. 여기서 드리프트가 생긴다.

### Node 20은 이미 EOL

| 버전 | LTS 시작 | EOL |
|------|---------|-----|
| 20 (Iron) | 2023-10-24 | 2026-04-30 (지남) |
| 22 (Jod) | 2024-10-29 | 2027-04-30 |
| 24 (Krypton) | 2025-10-28 | 2028-04-30 |

상용 빌드를 만드는 런타임인데 보안 패치가 끊긴 상태였다. 22로 가면 8개월 뒤에 또 해야 해서 24를 택했다.

## 해결 방법

Jenkins 관리 > Tools에 NodeJS installation을 하나 더 등록하고(기존 20.11.1은 다른 잡이 쓰고 있으므로 지우지 않는다), 파이프라인의 tool 이름을 바꿨다.

```groovy
tools {
    nodejs "NodeJS 24.18.1"
}

environment {
    COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
}
```

그리고 빌드 스텝에서 이 줄을 지웠다.

```groovy
sh 'corepack prepare pnpm@latest-8 --activate'   // 삭제
```

빌드를 돌리면 에이전트가 해당 버전을 받아서 푼다.

```
[Pipeline] tool
Unpacking https://nodejs.org/dist/v24.18.1/node-v24.18.1-linux-arm64.tar.gz to
/home/jenkins/tools/jenkins.plugins.nodejs.tools.NodeJSInstallation/NodeJS_24.18.1
```

## 왜 24.18.1인가

24.x 중에서 최신은 24.19.0이었지만 릴리스된 지 이틀밖에 안 됐고 SEMVER-MINOR 기능이 13개 들어가 있었다. 그중 TLS 관련 변경(`certificateCompression` 옵션, OpenSSL 빌드 설정)이 걸렸다. 빌드 파이프라인은 스펙 다운로드, S3 업로드, 소스맵 업로드까지 TLS를 계속 쓴다.

24.18.1은 그 직전 릴리스인데 기능 변경이 0이고 CVE 11건을 막는 보안 패치 전용이다. 메이저를 20에서 24로 넘기는 상황이라, 그 위에 얹는 변화 폭은 가장 작은 쪽을 골랐다.

## corepack이 12단계 점프한다

Node를 20.11.1에서 24.18.1로 옮기면 번들된 corepack도 0.23.0에서 0.35.0으로 건너뛴다. 이 사이에 동작이 바뀐 지점이 있다.

- **0.25.0**: 패키지 매니저를 내려받기 전에 프롬프트를 띄우는 동작이 생겼다. 발동 조건은 "stdin이 TTY이고 CI가 감지되지 않을 때"라 Jenkins의 `sh` 스텝은 해당되지 않지만(non-TTY이고 `JENKINS_URL`로 CI가 감지된다), 상용 배포가 프롬프트 대기로 멈추는 건 최악이라 `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`으로 못박았다.
- **0.27.0**: 레지스트리 서명 검증이 의무화됐다. `packageManager` 값에 해시가 없으면 걸릴 수 있어서 확인이 필요했다.

`corepack prepare pnpm@latest-8 --activate`를 지운 근거는 로그에 있었다.

```
+ corepack prepare pnpm@latest-8 --activate    ← 8.15.9를 받음
+ pnpm install
 WARN Unsupported engine: ... (current: {"pnpm":"8.9.0"})   ← 실제로 돈 건 8.9.0
```

`package.json`의 `packageManager: "pnpm@8.9.0"`이 우선하기 때문에, prepare가 받아둔 8.15.9는 쓰이지도 않았다. 원래부터 하는 일이 없는 줄이었다.

## 순서가 거꾸로였다

여기까지 하고 나서 문제를 하나 깨달았다. Jenkins 도구 설정은 전역이지만 파이프라인마다 이름으로 참조하므로, 24로 올린 건 이 파이프라인 하나다. 그런데 정작 `.nvmrc`가 24인 레포는 이 레포뿐이었고, 나머지 레포들은 20.11.1이거나 20.19.6이었다.

정리하면 이런 상태가 된다.

| 층 | 버전 |
|----|------|
| Jenkins (상용 빌드) | 24 |
| 레포 선언(`.nvmrc`) | 20 |
| CI 검증 | 20이거나 아예 없음 |

**상용 빌드가 도는 런타임을 아무도 검증하지 않는 상태**다. 이 간극은 코드를 바꿔서 생긴 게 아니라 빌드 서버가 먼저 움직여서 생겼다. 처음 24로 올릴 때 근거였던 "이 레포는 CI가 `.nvmrc`=24를 계속 검증해왔다"가 다른 레포에는 없는 근거였던 것이다.

그래서 나머지 레포도 `.nvmrc`를 24로 올리고 CI 워크플로에 `setup-node`를 추가해, CI가 실제 배포 런타임과 같은 버전을 검증하도록 맞췄다. 순서를 다시 밟자면 CI에서 먼저 검증하고 빌드 서버가 따라가는 쪽이 맞다.

## .nvmrc에 24.18.1을 박지 않은 이유

Jenkins가 24.18.1이니 `.nvmrc`도 24.18.1로 고정하면 맞춰지지 않을까 싶었는데, 그렇지 않다. `.nvmrc`는 Jenkins를 고정하지 못한다. 플러그인 도구 설정을 쓰기 때문에 나중에 누가 Jenkins 툴을 24.19.0으로 올려도 `.nvmrc`는 24.18.1인 채로 아무도 잡아주지 않는다. 고치려던 드리프트가 그대로 재현되면서 맞춰진 것처럼 보이기만 한다.

반면 비용은 확실하다. 정확히 박으면 Node 보안 패치가 자동으로 들어오지 않는다. 20을 떠나는 이유 자체가 패치가 끊겨서인데 24에서 같은 상태를 자초하는 셈이다. 이번에 실제로 물린 것들도 24.x 패치 사이의 차이가 아니라 메이저 이동에서 나왔다. 그래서 `.nvmrc`는 `24`로 뒀다.

## 곁다리: DEP0190

Node 24로 올린 뒤 일부 빌드 로그에 `DEP0190` 런타임 deprecation이 뜨기 시작한다. Node 24에서 추가된 것이라 22에서는 재현되지 않는다. 확인해보니 우리 코드가 아니라 `vite-plugin-checker` 같은 의존성에서 나오는 것이었다. 무해하지만 버전을 올린 직후에 새 경고가 뜨면 회귀로 오인하기 쉬우니, 미리 원인을 확인해두는 편이 낫다.

## 정리

- 빌드 성공은 런타임이 적절하다는 증거가 아니다. `Unsupported engine`, `failed to satisfy expected node version` 같은 경고는 "아직 안 터졌다"는 뜻이다.
- 툴체인이 요구하는 `^20.19.0 || >=22.12.0`은 `require(esm)` 백포트 시점이다. 20.11.1처럼 그 아래에 있으면 의존성 하나 올릴 때 `ERR_REQUIRE_ESM`으로 죽을 수 있다.
- Jenkins NodeJS 플러그인은 `.nvmrc`를 읽지 않는다. 빌드 서버 버전은 별도로 관리되고 있다고 봐야 한다.
- Node 메이저를 옮기면 번들 corepack도 같이 점프한다. `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`을 넣어두면 프롬프트로 배포가 멈추는 사고를 막는다.
- 버전은 CI가 검증하는 곳부터 올리고 빌드 서버가 따라가야 한다. 빌드 서버를 먼저 올리면 아무도 검증하지 않은 런타임에서 상용 빌드가 나간다.
