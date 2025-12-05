---

title: "파일 다운로드 방식 전환: Direct URL에서 Blob으로"
date: "2025-12-05"
tags: ["download", "blob", "S3", "frontend"]
summary: "Direct URL 방식에서 Blob 기반 방식으로 전환하기까지, 브라우저 환경에 따라 한글 파일명이 정상적으로 적용되지 않는 문제를 분석하고 두 방식의 차이를 정리한다."
----------------------------------------------------------------------------------------------------------

## 1. 문제 인지 / 상황 설명

한글 파일명을 정규화(NFC)하여 `<a download="파일명">` 방식으로 지정하는 다운로드 로직을 사용하고 있었다. 대부분의 환경에서는 정상적으로 동작했으나, 특정 시점부터 **브라우저에 따라 download 속성이 무시되거나**, S3 Presigned URL을 그대로 사용하는 경우 **Cross-Origin 제약으로 인해 파일명이 적용되지 않는 문제**가 발생하기 시작했다.

이러한 문제로 인해 기존의 “URL 직접 다운로드” 방식 대신, **Blob 변환 후 다운로드 방식**으로 전환할 필요성을 인식하게 되었다.

## 2. 문제 정의 및 원인 분석

### 문제 정의

* Presigned URL을 `<a href>`에 직접 넣어 다운로드하면 파일명을 일관되게 제어할 수 없었다.
* 특히 한글 파일명의 경우 브라우저·OS 환경에 따라 정상적으로 적용되지 않았다.

### 원인 분석

1. **브라우저의 파일명 결정 우선순위**
   브라우저는 파일명을 아래 순서로 결정한다.

   1. 서버의 Content-Disposition 헤더
   2. `<a download="...">` 속성
   3. URL 경로의 마지막 segment

   Cross-Origin URL에서는 1) 또는 3)가 우선되어 2)가 무시될 가능성이 높았다.

2. **Presigned URL 특성**

   * S3 Presigned URL에는 일반적으로 원하는 “표시용 파일명” 정보가 포함되지 않는다.
   * 서버 메타데이터를 제어하지 않는 경우 프론트엔드에서 파일명을 안정적으로 제어할 수 없다.

3. **브라우저별 동작 차이 & 보안 정책**

   * iOS Safari 등 일부 환경에서는 download 속성이 쉽게 무시된다.
   * Origin이 다르면 브라우저가 보안 정책상 파일명을 재정의할 수 있다.

이러한 이유로, 단순히 NFC 정규화를 적용하더라도 사용자가 저장하는 파일명이 의도대로 보장되지 않았다.

## 3. 코드 예시

### Direct URL 방식 (기존 방식)

```
const fileName = rawFileName.normalize("NFC")
const url = await getS3SignedUrl(s3FileLocation)

const aTag = document.createElement("a")
aTag.href = url
 aTag.download = fileName
 aTag.click()
```

### Direct URL 방식의 문제점

* Cross-Origin URL인 경우 브라우저가 download 속성을 무시함
* URL 기반 이름으로 덮어쓰기될 가능성 존재
* 브라우저별 정책 차이로 일관된 파일명 제공 불가

---

### Blob 방식 (전환 후)

```
const url = await getS3SignedUrl(s3FileLocation)

// Blob 다운로드
const blob = await fetch(url).then((res) => res.blob())

// Blob URL 생성
typeof blob !== "undefined"
const blobUrl = URL.createObjectURL(blob)

// 동일 Origin으로 다운로드 처리
const aTag = document.createElement("a")
aTag.href = blobUrl
 aTag.download = fileName
 aTag.click()

URL.revokeObjectURL(blobUrl)
```

## 4. Direct URL vs Blob 방식 비교

### Direct URL 방식의 장점

1. 파일을 메모리에 올리지 않고 바로 스트리밍 가능
2. 구현이 단순함

### Direct URL 방식의 단점

1. 파일명 제어가 불안정함 (Cross-Origin 환경에서 download 무시)
2. 브라우저별 정책 차이로 예측이 어려움
3. Presigned URL 자체에 파일명 정보가 없음

---

### Blob 방식의 장점

1. 파일명을 완전히 통제 가능
2. Same-Origin처럼 동작하여 Cross-Origin 제약에서 자유로움
3. 다운로드 전 파일 타입·크기 검증 가능

### Blob 방식의 단점

1. 파일 전체를 메모리에 로드해야 하므로 대용량 파일에 불리함
2. 다운로드 시작 시점이 Direct URL보다 늦을 수 있음

---

## 5. 결론 및 배운 점

- 한글 파일명을 포함한 사용자 지정 파일명을 일관되게 보장하려면 Blob 방식이 더 적합하다.
- Direct URL 방식은 간단하지만, Cross-Origin 특성 및 브라우저별 동작 차이로 인해 안정성이 낮았다.
- Blob 방식은 메모리 비용이 증가하더라도, UX 측면에서 확실한 파일명 제어와 일관된 동작을 제공한다.
- 향후 대용량 파일을 다루게 될 경우, 파일 크기에 따라 Direct URL과 Blob 방식 중 선택하는 하이브리드 전략도 고려할 수 있다.

이번 전환을 통해 Presigned URL 기반 다운로드는 환경 편차가 크다는 점을 다시 확인했고, 파일명 통제가 중요한 기능에서는 Blob 방식이 장기적으로 더 안전한 선택임을 배웠다.
