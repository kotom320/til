---

title: "CloudFront Invalidation 범위를 /*에서 /index.html로 변경했을 때 지표 변화 분석"
date: "2026-01-21"
tags: ["cloudfront", "s3", "cache-control", "cdn", "invalidation", "vite"]
summary: "배포 시 CloudFront Invalidation을 /*에서 /index.html로 축소한 뒤, Requests는 유지되지만 Data transfer가 상대적으로 낮아지는 구간이 관측되었다. 이를 캐시 HIT/MISS 관점에서 해석하고 배포 전략 개선 방향을 정리한다."
-------------------------------------------------------------------------------------------------------

## 1. 문제 인지 (상황 설명)

CloudFront 비용이 점진적으로 증가하고 있었고, 비용 항목 중 **Request Count 비중이 매우 크다**는 점을 확인했다. 기존 배포 파이프라인에서는 배포 시마다 CloudFront Invalidation을 `/*`로 수행하고 있었으며, 그 결과 배포 직후 CloudFront 지표에서 **Requests와 Data transfer가 동시에 급증하는 패턴**이 반복적으로 나타났다.

현재 프로젝트는 **Vite 기반 빌드 환경**이며, JS/CSS 등 정적 자산은 **해시 기반 파일명**으로 생성된다. 그럼에도 전체 캐시 무효화 전략이 유지되고 있었고, 이 전략이 여전히 필요한지 검증이 필요하다고 판단했다.

이에 개발 환경에서 먼저 Invalidation 범위를 `/*`에서 `/index.html`로 축소하는 실험을 진행했다.

---

## 2. 문제 정의 및 원인 분석

### 2.1 문제 정의

- 배포 시점마다 CloudFront **Requests**와 **Data transfer**가 동시에 급증한다.
- 전체 Invalidation(`/*`)이 해당 현상의 직접적인 원인인지 검증이 필요하다.
- 최소 범위로 Invalidation을 축소할 수 있다면 비용/트래픽을 줄일 수 있을 것으로 예상된다.

### 2.2 `/*` Invalidation이 만드는 강제 MISS 구조

CloudFront에서 Invalidation은 Edge 캐시에 저장된 객체를 명시적으로 제거한다. `/*` Invalidation을 수행하면 다음과 같은 흐름이 발생한다.

1. JS, CSS, 이미지, 폰트 등 **모든 정적 자산 캐시가 폐기**된다.
2. 배포 직후 사용자 요청은 대부분 캐시에 존재하지 않으므로 **MISS**가 된다.
3. MISS가 발생하면 CloudFront는 오리진(S3)에서 파일을 다시 가져온다.
4. 이 과정에서 **Data transfer가 크게 증가**한다.
5. 동시에 사용자 요청 자체도 증가하여 **Requests 역시 급증**한다.

이로 인해 기존 지표에서는 Requests 증가와 Data transfer 증가가 강하게 동행하는 패턴이 나타났다.

### 2.3 `/index.html` Invalidation 이후 관측된 변화 (HIT/MISS 관점)

Invalidation 범위를 `/index.html`로 제한하면 동작 방식이 달라진다.

- `index.html`만 캐시에서 제거되어 **MISS**가 된다.
- `index.html`이 참조하는 해시 기반 정적 자산(`/assets/*.hash.js`, `/assets/*.hash.css` 등)은 캐시에 남아 **HIT** 될 수 있다.
- 사용자의 요청은 계속 발생하므로 **Requests는 유지**된다.
- 하지만 많은 요청이 Edge 캐시 HIT로 처리되면, 오리진(S3)에서 다시 가져오는 데이터가 줄어 **Data transfer는 상대적으로 낮아질 수 있다**.

실제로 정책 변경 이후, Requests는 많지만 Data transfer는 상대적으로 낮게 유지되는 구간이 관측되었다. 이는 전체 캐시 무효화로 인해 발생하던 **강제 MISS 구간이 완화**되었음을 의미한다.

---

## 3. 해결 방법 (코드 예시)

### 3.1 AS-IS: 전체 캐시 무효화 (`/*`)

```groovy
withAWS(region: 'ap-northeast-2', credentials: 'iam/jenkins') {
  s3Upload(bucket: "${env.S3_BUCKET_NAME}", file: 'build')
  s3Upload(
    bucket: "${env.S3_BUCKET_NAME}",
    file: 'build/index.html',
    cacheControl: 'max-age=0, no-cache, no-store, must-revalidate'
  )
  cfInvalidate(
    distribution: "${env.CLOUD_FRONT_ID}",
    paths: ["/*"]
  )
}
```

### 3.2 TO-BE: 진입점만 무효화 (`/index.html`)

```groovy
withAWS(region: 'ap-northeast-2', credentials: 'iam/jenkins') {
  s3Upload(bucket: "${env.S3_BUCKET_NAME}", file: 'build')
  s3Upload(
    bucket: "${env.S3_BUCKET_NAME}",
    file: 'build/index.html',
    cacheControl: 'max-age=0, no-cache, no-store, must-revalidate'
  )
  cfInvalidate(
    distribution: "${env.CLOUD_FRONT_ID}",
    paths: ["/index.html"]
  )
}
```

---

## 4. 결과 (관찰 결과 요약)

- Invalidation 변경 이후에도 **Requests는 기존과 유사한 수준**으로 발생했다.
- 그러나 Requests 증가가 곧바로 Data transfer 증가로 이어지지 않는 **구간이 관측**되었다.
- 이는 요청이 오리진(S3)으로 전달되지 않고 CloudFront Edge 캐시에서 **HIT로 처리되는 비율이 증가**했음을 시사한다.
- 기존의 `/*` Invalidation 전략은 배포 직후 **대규모 MISS를 강제로 유발**했을 가능성이 높다.

---

## 5. 결론 (배운 점)

- Vite 기반 빌드 환경에서는 해시 파일명을 사용하는 정적 자산 덕분에 캐시 충돌 위험이 낮다.
- 전체 CloudFront Invalidation(`/*`)은 배포 안정성 측면에서는 안전하지만, 비용/트래픽 관점에서는 과도한 전략이 될 수 있다.
- `/index.html`만 무효화하는 방식으로도 최신 배포 결과를 정상적으로 제공할 수 있으며, 동시에 Data transfer 증가를 완화할 수 있다.
- 배포 전략의 핵심은 캐시를 무조건 비우는 것이 아니라, **어떤 파일이 진입점인지(`index.html`)를 명확히 구분**하는 데 있다.
- 다음 단계로는 해시 기반 정적 자산에 대해 **장기 캐시**(`Cache-Control: public, max-age=31536000, immutable`)를 명확히 적용하여 브라우저 재검증 요청(304) 자체를 줄이는 방향을 검토할 수 있다.