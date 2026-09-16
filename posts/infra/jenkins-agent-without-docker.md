---
title: "Jenkins 에이전트 이름에 docker가 있다고 docker를 쓸 수 있는 건 아니다"
date: "2026-09-16"
tags: ["Jenkins", "Docker", "AWS", "CI/CD"]
summary: "docker 없는 arm64 컨테이너 에이전트에서 겪은 것"
---

## 문제 상황

ECS 배포를 Jenkins로 옮기려고 파이프라인을 짰다. 기존 Job들이 모두 쓰던 에이전트를 그대로 지정했다.

```groovy
agent { label 'build-agent-docker' }
```

이름에 docker가 있으니 이미지 빌드도 당연히 될 거라 생각했다. 첫 실행 로그는 이랬다.

```
+ docker build --platform linux/amd64 --build-arg PORT=443 ... .
script.sh.copy: 1: docker: not found
```

## 원인 분석

에이전트 상태를 확인하는 스크립트를 한 번 돌렸다. Jenkins Job 설정을 바꿀 필요 없이 빌드 화면의 **Replay** 기능으로 스크립트만 갈아 끼우면 된다.

```groovy
pipeline {
    agent { label 'build-agent-docker' }
    stages {
        stage('Inspect Agent') {
            steps {
                sh '''
                    id
                    uname -m
                    cat /etc/os-release | head -3
                    for c in docker aws python3 jq curl zip unzip; do
                        printf "%-8s " "$c"; command -v $c || echo "(없음)"
                    done
                    ls -l /var/run/docker.sock 2>&1
                '''
            }
        }
    }
}
```

결과가 예상과 전부 달랐다.

| 항목 | 결과 |
|------|------|
| OS / CPU | Debian 13 / `aarch64` |
| 사용자 | 일반 사용자 (root 아님) |
| `docker` | 없음 |
| `/var/run/docker.sock` | 없음 |
| `aws`, `jq`, `zip`, `unzip` | 없음 |
| `python3`, `curl`, `git` | 있음 |

이 에이전트는 **빌드 서버 위에 떠 있는 리눅스 컨테이너**였다. 이름의 docker는 "docker를 쓸 수 있다"가 아니라 "docker로 실행되고 있다"는 뜻이었다.

그런데 왜 다른 레포들은 잘 됐을까. 기존 Job들의 배포 단계는 이런 모양이었다.

```groovy
sh 'pnpm run build'
withAWS(region: 'ap-northeast-2', credentials: 'aws-credentials') {
    s3Upload(bucket: "${env.S3_BUCKET_NAME}", file: 'build')
    cfInvalidate(distribution: "${env.CLOUD_FRONT_ID}", paths: ["/index.html"])
}
```

`s3Upload`와 `cfInvalidate`는 **Jenkins 플러그인 기능**이라 에이전트에 `aws` CLI가 없어도 동작한다. Node 빌드 + 플러그인 업로드 조합에서는 이 제약이 드러날 일이 없었던 것이다. 반면 Docker 이미지 빌드는 플러그인으로 대체할 수 없는 별도 프로그램을 요구한다.

## 해결 방법

### AWS CLI는 root 없이도 설치할 수 있다

이미지 빌드는 외부(CodeBuild)에 맡기더라도 `aws` CLI는 필요했다. 시스템 패키지는 설치할 수 없지만, 공식 설치 스크립트는 사용자 홈에 설치하는 옵션을 지원한다. 문제는 `unzip`도 없다는 점이었다.

```bash
export AWS_CLI_BIN="$HOME/.local/bin"
export PATH="$AWS_CLI_BIN:$PATH"

if [ -x "$AWS_CLI_BIN/aws" ]; then
    aws --version
    exit 0
fi

cd /tmp && rm -rf awscli-install && mkdir awscli-install && cd awscli-install
curl -sSfL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o awscliv2.zip

# unzip 이 없으니 python3 표준 모듈로 푼다
python3 -m zipfile -e awscliv2.zip .
# zipfile 모듈은 실행 권한을 보존하지 않으므로 직접 부여
chmod -R u+x aws

./aws/install -i "$HOME/.local/aws-cli" -b "$AWS_CLI_BIN" --update
aws --version
```

두 가지가 포인트다.

- `python3 -m zipfile -e`는 표준 라이브러리만으로 압축을 푼다. 다만 **실행 권한이 날아간다.** `chmod`로 복구하지 않으면 설치 스크립트 자체가 실행되지 않는다.
- 설치본이 홈 디렉터리에 남으므로, 다음 빌드에서는 `if [ -x ... ]`로 건너뛴다.

검증은 Jenkins에 올리기 전에 로컬에서 같은 조건의 컨테이너를 띄워서 했다.

```bash
docker run --rm --platform linux/arm64 debian:trixie bash -c '
  apt-get update -qq && apt-get install -y -qq python3 curl
  useradd -m builder
  su builder -c "<위 스크립트>"
'
```

한 번의 Jenkins 실행에 몇 분이 걸리니, 로컬에서 먼저 돌려보는 편이 훨씬 빠르다.

### 선언형 파이프라인에서 PATH 주의

`environment` 블록에 `PATH+AWSCLI` 같은 표기를 쓰려다 말았다. 확실하게 동작하는 방식은 각 `sh` 블록 첫 줄에서 직접 잡는 것이다.

```groovy
environment {
    AWS_CLI_BIN = '/home/jenkins/.local/bin'
}
// ...
sh '''
    export PATH="$AWS_CLI_BIN:$PATH"
    aws s3 cp ...
'''
```

## 왜 이 방법인가

에이전트 이미지에 docker CLI와 소켓을 붙이는 방법도 있지만 두 가지가 걸렸다.

- 에이전트 컨테이너 설정 변경이라 다른 모든 Job에 영향을 준다.
- CPU가 `aarch64`라서 배포 대상인 x86 서버용 이미지를 에뮬레이션으로 빌드해야 한다. 느리고 검증되지 않은 조합이다.

그래서 이미지 빌드는 이미 성공 이력이 있는 CodeBuild에 맡기고, Jenkins는 소스를 넘기고 결과를 기다리는 역할만 하도록 설계했다.

## 정리

- **에이전트 이름은 능력을 보장하지 않는다.** 새 도구를 쓰기 전에 `command -v`로 확인한다. Replay를 쓰면 Job 설정을 건드리지 않고 확인할 수 있다.
- 기존 Job이 잘 돈다고 내 Job도 돈다는 뜻이 아니다. Jenkins **플러그인 기능**(`s3Upload` 등)과 **에이전트에 설치된 프로그램**(`docker`, `aws`)은 다른 것이다.
- root가 없어도 홈 디렉터리 설치는 가능하다. `unzip`이 없으면 `python3 -m zipfile`, 대신 `chmod +x`를 잊지 않는다.
- CI 스크립트는 로컬에서 같은 베이스 이미지로 먼저 재현해 본다.
