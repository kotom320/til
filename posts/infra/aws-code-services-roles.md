---
title: "CodePipeline, CodeBuild, CodeDeploy는 각자 뭘 하는가"
date: "2026-09-16"
tags: ["AWS", "CodePipeline", "CodeBuild", "CI/CD"]
summary: "지휘자 하나와 연주자 셋, 그리고 아티팩트 버킷"
---

## 배경 / 계기

ECS 배포 파이프라인을 손보면서 CodePipeline, CodeBuild, CodeDeploy, CodeCommit이 계속 등장했다. 이름이 비슷해서 헷갈렸는데, 역할을 나눠 보니 단순했다.

## 핵심 개념

| 서비스 | 하는 일 | 비유 |
|--------|---------|------|
| CodeCommit | 코드 저장소 | 원고 보관함 |
| CodeBuild | 빌드 명령 실행 | 인쇄소 |
| CodeDeploy | 결과물을 서버에 반영 | 배송 기사 |
| CodePipeline | 위 셋을 순서대로 호출 | 공정 관리자 |

핵심은 **CodePipeline 자체는 아무것도 만들지 않는다**는 점이다. "이제 네 차례"라고 부르고, 앞 단계 결과물을 다음 단계로 넘기는 일만 한다.

내가 본 파이프라인은 이렇게 구성돼 있었다.

```
[Source]        [Build]                [approval]   [Deploy]
GitHub     →    CodeBuild         →    사람 승인  →  CodeDeploy
(코드)          (Docker 이미지                       (ECS 서비스에
                 → ECR에 저장)                        새 이미지 반영)
```

- Source가 CodeCommit이 아니라 GitHub인 경우가 많다. 이때는 GitHub 연결(Connection)이 필요하다.
- approval은 별도 서비스가 아니라 CodePipeline 자체 기능이다. 승인 버튼을 누를 때까지 멈춘다.
- 네 서비스를 다 쓸 필요는 없다. 정적 사이트라면 CodeBuild가 빌드 후 S3에 복사하고 끝나기도 한다. CodeDeploy는 **실행 중인 서버나 컨테이너를 교체**할 때 필요하다.

### 설정 파일이 여러 개인 이유

각 서비스가 자기 설명서를 따로 읽는다. 레포 루트에 흩어져 있던 파일들의 정체가 이거였다.

| 파일 | 읽는 주체 | 내용 |
|------|-----------|------|
| `buildspec.yml` | CodeBuild | 어떤 명령으로 빌드할지 |
| `appspec.yaml` | CodeDeploy | 어떤 컨테이너를 어떤 포트로 붙일지 |
| `taskdef.json` | ECS | 어떤 이미지를 어떤 설정으로 띄울지 |

### 단계 사이는 S3로 주고받는다

각 단계는 서로 직접 대화하지 않는다. **아티팩트 버킷**을 거친다.

```
Source: 코드를 zip으로 S3에 저장        → SourceArtifact
Build:  그 zip을 받아 빌드,
        appspec/taskdef 를 S3에 저장    → BuildArtifact
Deploy: 그 파일들을 받아 배포
```

그래서 파이프라인 설정에 `codepipeline-<region>-<숫자>` 형태의 버킷이 붙어 있다.

## 예시 코드

Source 단계를 Jenkins로 대체해 보려고, 이 버킷에 소스 zip을 직접 올려봤다. 첫 시도는 거부당했다.

```
upload failed: ./source.zip to s3://codepipeline-ap-northeast-2-XXXXXXXXXXXX/...
An error occurred (AccessDenied) when calling the PutObject operation:
... is not authorized to perform: s3:PutObject
... with an explicit deny in a resource-based policy
```

`explicit deny in a resource-based policy`가 힌트다. IAM 권한이 부족한 게 아니라 **버킷 정책이 막은 것**이다. 콘솔이 만든 아티팩트 버킷에는 "KMS 암호화 없는 업로드는 거부"라는 정책이 기본으로 붙는다. 헤더를 붙이니 통과했다.

```bash
# git 추적 파일만 zip 으로 묶기
git archive --format=zip -o source.zip HEAD

# 아티팩트 버킷 정책이 KMS 암호화를 요구한다
aws s3 cp source.zip "s3://$ARTIFACT_BUCKET/$KEY" --sse aws:kms
```

같은 AccessDenied라도 메시지에 따라 대응이 완전히 다르다.

| 메시지 | 원인 | 대응 |
|--------|------|------|
| `explicit deny in a resource-based policy` | 버킷 정책이 조건으로 거부 | 요구 조건(암호화 등)을 맞춘다 |
| `no identity-based policy allows ...` | IAM 사용자에게 권한 없음 | 권한을 추가받는다 |

## 왜 이 방법인가

결국 Jenkins로 옮기지 않고 끊어진 GitHub 연결을 복구하는 쪽으로 정리됐다. 그래도 각 서비스의 역할과 아티팩트 전달 구조를 이해하니, 파이프라인 화면을 볼 때 어느 칸에서 무엇이 오갔는지 읽을 수 있게 됐다.

## 정리

- CodePipeline은 **순서를 관리하고 결과물을 넘기는 역할**만 한다. 실제 작업은 CodeBuild와 CodeDeploy가 한다.
- 설정 파일이 여러 개인 이유는 읽는 주체가 다르기 때문이다.
- AccessDenied는 **메시지를 끝까지 읽는다.** `explicit deny`면 리소스 정책, `no identity-based policy`면 IAM 권한이다.
