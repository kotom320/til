---
title: "AWS CodePipeline에서 Jenkins로 배포 파이프라인 마이그레이션"
date: "2026-05-19"
tags: ["jenkins", "ci-cd", "bash", "env", "aws", "codepipeline"]
summary: "AWS CodeBuild/CodePipeline 기반 배포를 Jenkins Pipeline으로 전환하면서 겪은 env-setup.sh 버그 수정과 파이프라인 구성 과정"
---

## 배경

기존에 AWS CodeBuild + CodePipeline으로 운영하던 배포 프로세스를 Jenkins Pipeline으로 전환했다. 클라이언트 A와 클라이언트 B에 대해 각각 다른 환경 변수(S3 버킷, CloudFront ID, Cognito 설정 등)로 빌드를 돌려야 했고, 기존 코드베이스에 있던 `env-setup.sh`를 그대로 활용하려 했는데 스크립트에 버그가 있었다.

기존 `buildspec.yml` 구조는 단순했다.

```yaml
# buildspec.yml (기존 CodeBuild)
phases:
  pre_build:
    commands:
      - cd my-app
      - yarn install --frozen-lock
  build:
    commands:
      - yarn build
  post_build:
    commands:
      - aws s3 cp --recursive --acl public-read ./build s3://$S3_BUCKET_NAME/
      - aws s3 cp --acl public-read --cache-control="max-age=0, no-cache, no-store, must-revalidate" ./build/index.html s3://$S3_BUCKET_NAME/
```

클라이언트별 분기, env 파일 주입, CloudFront invalidation 등을 Jenkins에서 직접 제어하는 구조로 바꿨다.

## 문제 상황

### 1. env-setup.sh 인자 파싱 버그

다른 프로젝트에서 복사된 코드였는데, 처음부터 인자 파싱이 동작하지 않는 상태였다.

```bash
# 버그 있는 코드
ARGS=$(getopt -o AB --long client-a,client-b -- "$@")

while :
do
    case $1 in
        -A | --client-a)
            target_dir="client-a"
            break
            ;;
        -B | --client-b)
            target_dir="client-b"
            break
            ;;
        *)
            echo "WARN: No Argument"
            break
            ;;
    esac
done
```

세 가지 문제가 겹쳐 있었다.

- `ARGS`가 선언되었지만 `eval set -- "$ARGS"` 없이 미사용
- `shift`가 없어 루프를 돌아도 `$1`이 변하지 않음
- 모든 `case` 분기에 `break`가 있어 루프가 첫 번째 반복 후 즉시 종료

결과적으로 유효한 인자를 넘겨도 항상 `*)`(기본값) 분기가 실행되었다. CodeBuild 시절에는 클라이언트별 buildspec을 따로 두거나 환경 변수를 CodePipeline에서 직접 주입했기 때문에 이 버그가 드러나지 않았던 것이다.

### 2. prepare 훅이 자동 실행된다는 것을 몰랐다

파이프라인 구성 중 `package.json`의 `"prepare"` 훅에 `env-setup.sh`를 등록했다. 초기 설정용 스크립트니까 `prepare`라는 이름이 어울린다고 생각했는데, `prepare`는 `yarn install` / `npm install` 시 자동으로 실행되는 npm 생명주기 훅이었다.

인자 없이 자동 실행되다 보니 매번 경고 메시지가 출력되고 기본 클라이언트로 강제 설정되는 부작용이 발생했다.

### 3. yarn.lock --frozen-lockfile 이슈

기존 CodeBuild에서 쓰던 `--frozen-lock` 옵션을 그대로 가져와 `--frozen-lockfile`로 Jenkins에 적용했는데, `yarn.lock`이 최신 상태가 아니어서 설치가 실패했다. 옵션을 제거해 해결했다.

## 해결 방법

### env-setup.sh 수정

인자가 하나만 필요하므로 `while` 루프 없이 `case "$1"`으로 단순화했다.

```bash
#!/bin/bash
cd "$(dirname "$0")" || exit 1

target_dir="client-a"

case "$1" in
    -A | --client-a)
        target_dir="client-a"
        ;;
    -B | --client-b)
        target_dir="client-b"
        ;;
    *)
        echo "WARN: No Argument. Default: client-a"
        ;;
esac

if ! cp -r -- "$target_dir/." ../; then
    echo "ERROR: Failed to copy env files from '$target_dir'." >&2
    exit 1
fi

capitalized=$(printf '%s' "$target_dir" | tr '[:lower:]' '[:upper:]')
echo "SUCCESS: $capitalized env copied."
```

추가로 반영한 점:
- `cd` 실패 시 `|| exit 1`로 즉시 종료 (잘못된 위치에서 `cp` 실행 방지)
- `cp` 실패 시 에러 메시지 출력 후 `exit 1` (실패를 성공으로 흘려보내는 흐름 차단)
- 백틱 → `$(...)` 교체
- `--` 플래그로 경로가 `-`로 시작해도 `cp` 옵션으로 오인하지 않도록 방어

### prepare → setup으로 변경

Jenkins 파이프라인에서 스크립트를 직접 호출하므로 `prepare` 훅은 불필요하다. 자동 실행을 막고 명시적으로 호출하도록 이름을 변경했다.

```json
{
  "scripts": {
    "setup": "env/env-setup.sh"
  }
}
```

### Jenkins 파이프라인 구성

```groovy
pipeline {
    agent { label 'my-agent' }

    tools {
        nodejs "NodeJS 20.11.1"
    }

    environment {
        TARGET_BRANCH = 'develop'
    }

    stages {
        stage('Git Clone') {
            steps {
                git branch: "${TARGET_BRANCH}",
                    credentialsId: "github-jenkins",
                    url: 'https://github.com/your-org/your-repo'
            }
        }

        stage('Install') {
            steps {
                dir('my-app') {
                    sh 'yarn install'
                }
            }
        }

        stage('Setup Env - Build - Publish') {
            steps {
                script {
                    def clientList = ["client-a", "client-b"]

                    for (client in clientList) {
                        dir('my-app') {
                            sh "env/env-setup.sh --${client}"
                        }

                        loadVarsFromFile("my-app/.env.develop")

                        dir('my-app') {
                            withEnv(['CI=false']) {
                                sh 'yarn build-develop'
                            }
                        }

                        withAWS(region: 'ap-northeast-2', credentials: 'iam/jenkins') {
                            dir('my-app') {
                                s3Upload(bucket: "${env.S3_BUCKET_NAME}", file: 'build')
                                s3Upload(
                                    bucket: "${env.S3_BUCKET_NAME}",
                                    file: 'build/index.html',
                                    cacheControl: 'max-age=0, no-cache, no-store, must-revalidate'
                                )
                                if (env.CLOUD_FRONT_ID) {
                                    cfInvalidate(distribution: "${env.CLOUD_FRONT_ID}", paths: ["/index.html"])
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private void loadVarsFromFile(String path) {
    def file = readFile(path)
        .replaceAll("(?m)^\\s*\\r?\\n", "")
        .replaceAll("(?m)^#[^\\n]*\\r?\\n", "")
    file.split('\n').each { envLine ->
        def idx = envLine.indexOf('=')
        if (idx < 0) return
        def key = envLine.substring(0, idx)
        def value = envLine.substring(idx + 1).trim().replaceAll('^\"|\"$', '')
        env."${key}" = value ?: ''
    }
}
```

CodeBuild 대비 달라진 점:
- 클라이언트별 `buildspec.yml`을 따로 두는 대신, 하나의 파이프라인에서 `clientList`를 순회해 반복 빌드
- S3 업로드를 AWS CLI 대신 `s3Upload` 플러그인으로 처리
- `.env` 파일에서 S3 버킷명과 CloudFront ID를 직접 파싱해 사용 (`loadVarsFromFile`)

`clientList`를 `.split()`이 아닌 리스트 리터럴로 선언한 이유: `.split()`이 반환하는 Java `String[]`을 `for-in`으로 순회하면 Jenkins CPS 직렬화 오류가 발생할 수 있다.

### 4. 배포와 무관한 환경 변수를 배포에 필요한 것으로 착각했다

`.env.develop` 파일에 `REACT_APP_AWS_COGNITO_USER_POOL_ID`, `REACT_APP_AWS_COGNITO_USER_POOL_WEB_CLIENT_ID`, `REACT_APP_AWS_IDENTITY_POOL_ID` 같은 변수들이 선언되어 있었다. Jenkins로 전환하면서 이 값들이 없으면 배포 후 로그인이 안 될 것이라고 판단해 부랴부랴 권한을 요청하고 각 환경에 맞는 값을 채워 넣었다.

그런데 파이프라인 스크립트를 다시 살펴보니 이 변수들을 실제로 사용하는 곳이 없었다. 코드를 확인해보니 이 변수들은 `REACT_APP_` 접두사가 붙은 CRA(Create React App) 환경 변수로, 빌드 시 번들에 포함되어 **앱이 런타임에 Cognito에 직접 접근할 때** 사용하는 값이었다. 배포 파이프라인(S3 업로드, CloudFront invalidation)과는 전혀 무관했다.

`.env` 파일 안에 있다고 해서 모두 배포 프로세스에 필요한 변수가 아니다. 용도를 구분해야 한다.

| 변수 | 용도 | 배포 파이프라인 필요 여부 |
|------|------|--------------------------|
| `S3_BUCKET_NAME` | S3 업로드 대상 버킷 | 필요 |
| `CLOUD_FRONT_ID` | CloudFront invalidation 대상 | 필요 |
| `REACT_APP_AWS_COGNITO_*` | 빌드 번들에 포함, 앱 런타임 인증 | 불필요 (빌드 시 번들에 포함됨) |

## 정리

- CodeBuild에서 감춰져 있던 `env-setup.sh` 버그가 Jenkins 전환 시 드러났다. 파이프라인 마이그레이션은 기존 스크립트를 그대로 믿지 말고 검증해야 한다
- npm `prepare`는 `yarn install` / `npm install` 시 자동 실행된다. 인자가 필요한 스크립트는 등록하면 안 된다
- bash 인자 파싱이 단일 인자면 `while` + `getopt` 대신 `case "$1"`으로 충분하다
- Jenkins `for-in` 루프는 Java 배열 대신 Groovy 리스트 리터럴을 써야 CPS 오류를 피할 수 있다
- `REACT_APP_` 접두사 변수는 빌드 번들에 포함되는 앱용 변수다. 배포 파이프라인이 직접 사용하지 않는다
