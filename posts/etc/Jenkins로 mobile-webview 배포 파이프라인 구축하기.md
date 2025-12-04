---

title: "Jenkins로 mobile-webview 배포 파이프라인 구축하기"
date: "2025-12-04"
tags: ["Jenkins", "CI/CD", "Pipeline", "S3", "CloudFront"]
summary: "AWS CodePipeline이 사라진 상황에서 Jenkins 기반으로 mobile-webview 배포 파이프라인을 재구축한 과정을 정리한다."
------------------------------------------------------------------------------------------

## 배경

기존에는 AWS CodePipeline을 통해 `mobile-webview` 프로젝트가 배포되고 있었지만, 어느 순간 파이프라인 전체가 사라져버렸다. 프로젝트 특성상 1년에 한두 번만 배포되는 레거시에 가까운 서비스라, 복잡한 자동화보다는 **단순하고 실수 없는 파이프라인**을 만드는 것이 우선 목표였다.

또한, 레포 루트가 아닌 `blue-web` 폴더에서 실제 웹앱이 존재하며, dev/alpha/prod 용 S3 버킷이 모두 분리되어 있어 **버킷명을 잘못 설정하면 상용 배포 사고가 날 위험**이 있었다.

---

## 목표

1. Jenkins에서 브랜치만 다르게 설정해 dev/alpha/prod 환경을 공통 파이프라인으로 처리
2. 레포 클론 후 `blue-web` 내부에서 install & build 수행
3. prod 환경에서만 CloudFront Invalidation 동작
4. 전체 파이프라인은 최대한 단순하게 유지

---

## Jenkinsfile 구성 요약

### 1. 환경값 분리

Jenkins Job에서 오직 아래 두 값만 조절하도록 구조화했다.

```groovy
TARGET_BRANCH = 'master'   // develop / alpha / master
BUILD_ENV     = 'prod'     // dev / alpha / prod
```

### 2. 실제 프로젝트는 `blue-web` 폴더에 존재

```groovy
dir('blue-web') {
  npm ci
  npm run ${BUILD_ENV}-build
}
```

### 3. 빌드 스크립트 매핑

- dev → dev-build
- alpha → alpha-build
- prod → build

### 4. S3 업로드

```groovy
s3Upload(bucket: bucketName, file: 'build')
s3Upload(bucket: bucketName, file: 'build/index.html', cacheControl: 'max-age=0, no-cache, no-store, must-revalidate')
```

### 5. prod 환경일 때만 CloudFront Invalidation

```groovy
if (BUILD_ENV == 'prod') {
  cfInvalidate(distribution: cloudfrontId, paths: ["/*"])
}
```

---

## 실수할 뻔한 부분

초기에 dev 배포를 구성하면서 **bucketName을 prod 버킷으로 잘못 설정**해 S3 상용 버킷에 올릴 뻔했다. 즉시 발견해서 막았지만 꽤 위험한 순간이었다.

이후 Jenkinsfile 내부에서 dev/alpha/prod 버킷이 섞이지 않도록 구조를 재정비하고, 잘못 입력할 가능성을 줄이는 방식으로 개선했다.

---

## 최종 Jenkinsfile 특징

- dev/alpha/prod 환경 모두 공통 파이프라인 사용
- prod만 CloudFront invalidation 적용
- 실제 앱 위치인 `blue-web`를 반영하여 정확한 경로에서 빌드
- 불필요한 자동화 최소화 → 단순하고 직관적인 설계

“레거시” 기준으로는 가장 실용적인 수준의 파이프라인이라고 평가할 수 있다.

---

## 오늘의 배움

- Jenkins 파이프라인은 복잡하게 만들수록 나중에 내가 고통받는다.
- 환경별로 바뀌는 변수(TARGET_BRANCH, BUILD_ENV)만 수정 가능한 구조가 유지보수에 가장 좋다.
- CloudFront ID나 BucketName을 Jenkinsfile에 넣어도 치명적이진 않지만, 필요하면 `.env` 로 분리하는 것도 가능하다.
- 배포 자동화는 **기능보다 실수 방지 구조**가 훨씬 중요하다.

---

다음 배포가 언제일지는 모르지만, 이 문서를 보면 1년 후의 나도 쉽게 기억을 되살릴 수 있을 것이다.
