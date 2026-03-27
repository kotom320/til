---
title: "S3 한글 파일명, 정규화(NFC/NFD), 그리고 다운로드 파일명 처리"
date: "2025-12-01"
tags: ["unicode", "한글파일명", "S3", "프론트엔드", "TIL"]
summary: "S3에 저장된 한글 파일명이 깨져 보이는 이유와, 브라우저에서 원하는 파일명으로 안전하게 다운로드시키는 방법을 정리한다."
---

## 1. 문제 상황

- 저장소(S3)에 올라간 파일의 Key가 한글일 때, URL에 `%E1%84%90...` 이런 식으로 percent-encoding된 문자열이 붙는다.
- 특히 **조합형(분해형, NFD) 한글**로 저장된 경우, Windows에서 다운로드 시 파일명이 깨져 보이는 것처럼 보일 수 있다.
- 브라우저에서 `<a>` 태그를 이용해 S3 Presigned URL을 다운로드 링크로 사용하고 있는데, "사용자에게는 완성형 한글(NFC) 파일명으로 저장"되게 하고 싶다.

예시:

- S3 URL (Presigned)

  - `.../%E1%84%90%E1%85%AE%E1%84%91%E1%85%AD%E1%84%86%E1%85%A7%E1%86%BC_...xlsx?...`
  - 디코딩하면: `문서_샘플_파일명.xlsx` (조합형 / NFD)

- 내가 사용자에게 보여주고 싶은 파일명

  - `문서_샘플_파일명.xlsx` (완성형 / NFC)

## 2. 한글 파일명: 조합형(NFD) vs 완성형(NFC)

- 유니코드에서 한글은 두 가지 관점으로 표현될 수 있다.

1. **완성형(NFC)**

   - `샘`, `플`, `명` 같은 음절이 **하나의 코드 포인트(U+AC00~U+D7A3)** 로 저장되는 형태
   - 예: `문서_샘플_파일명`

2. **조합형 / 분해형(NFD)**

   - 각 글자를 초성/중성/종성 단위로 분해해서 저장하는 형태
   - 예: `문서_샘플_파일명`
   - 실제로는 정상적으로 렌더링되지만, **바이트 레벨 또는 파일 시스템/도구에 따라 깨져 보이는 것처럼 오해**할 수 있다.

- macOS의 파일 시스템은 내부적으로 NFD를 사용하는 경우가 많고, Windows는 주로 NFC를 사용하는 편이라, **같은 한글 이름이라도 OS마다 바이트 표현이 달라지는 문제**가 생긴다.

---

## 3. 브라우저에서 다운로드 파일명 지정하기

### 3-1. `<a download>` 속성으로 파일명 지정

```ts
const fileName =
  customFileName ?? this.getAnalyzeS3FileName(s3FileLocation).originFileName;

const url = await getS3SignedUrl(s3FileLocation);

const aTag = document.createElement("a");
aTag.href = url;
// 여기서 NFC로 정규화
aTag.download = fileName.normalize("NFC");
aTag.click();
aTag.remove();
```

- `download` 속성에 문자열을 넣으면, 브라우저는 **가능한 경우 그 이름으로 파일을 저장하려고 한다.**
- `fileName.normalize('NFC')` 를 사용해 **완성형 한글로 정규화한 문자열을 전달**할 수 있다.
- S3 URL이든, 다른 서버 URL이든 상관 없이, 대부분의 데스크톱 브라우저(Chrome, Edge, Firefox)에서 이 방식은 잘 동작한다.

### 3-2. 이 방식이 깨질 수 있는 경우들

1. **모바일 브라우저 / iOS Safari 등**

   - 일부 브라우저는 파일을 "다운로드"하기보다는 새 탭에서 열거나 뷰어로 띄우는 동작을 우선한다.
   - 이 과정에서 `download` 속성이 무시되거나, URL 기준 이름으로 저장될 수 있다.

2. **사용자 제스처(User Gesture)가 끊긴 경우**

   - `onclick`에서 바로 호출하면 안전하지만,
   - 사용자 클릭 → 오래 걸리는 비동기 처리 → 나중에 자동으로 `a.click()` 하는 구조는 팝업/다운로드 차단 로직에 걸릴 수도 있다.

3. **서버가 `Content-Disposition` 헤더로 파일명을 강제하는 경우**

   - 만약 S3 객체 메타데이터에 `Content-Disposition: attachment; filename="..."` 가 이미 설정돼 있다면,
   - 브라우저 구현에 따라 서버에서 준 파일명이 우선될 수 있다.

하지만, 일반적인 S3 Presigned URL + `<a download>` 패턴에서는 **대부분 문제 없이 동작**하고, 실무에서도 널리 사용되는 패턴이다.

---

## 4. 조금 더 확실하게 처리하고 싶을 때: S3에서 헤더로 파일명 강제하기

현재 방식만으로도 mac/Windows 데스크톱 브라우저 환경에서는 충분히 쓸 만하다. 다만, "URL만 따로 전달해도 항상 예쁜 파일명으로 저장되게 하고 싶다" 같은 요구가 생기면, S3 단계에서 파일명을 강제할 수 있다.

### 4-1. Presigned URL 생성 시 `ResponseContentDisposition` 사용

```ts
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getS3SignedUrl = async (
  s3FileLocation: S3FileLocation,
  downloadFileName?: string
) => {
  const s3Client = await getS3Client();

  const command = new GetObjectCommand({
    Bucket: awsConfig.Storage.bucket,
    Key: `${s3FileLocation.level}/${s3FileLocation.key}`,
    ResponseContentDisposition: downloadFileName
      ? `attachment; filename="${downloadFileName}"`
      : undefined,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 600 });
};
```

그리고 사용하는 쪽에서:

```ts
const rawFileName =
  customFileName ?? this.getAnalyzeS3FileName(s3FileLocation).originFileName;
const normalizedFileName = rawFileName.normalize("NFC");

const url = await getS3SignedUrl(s3FileLocation, normalizedFileName);

const aTag = document.createElement("a");
aTag.href = url;
// 있어도 되고, 없어도 되지만 안전빵으로 둔다
aTag.download = normalizedFileName;
aTag.click();
aTag.remove();
```

이렇게 하면:

- URL을 그대로 브라우저 주소창에 붙여 넣어도,
- 다른 시스템(예: 외부 툴)이 이 URL을 열어도,
- 브라우저는 응답 헤더의 `Content-Disposition: attachment; filename="..."` 를 보고 **해당 이름으로 저장**하게 된다.

프론트엔드의 `download` 속성은 보조 수단이고, **최종 파일명은 서버 헤더에서 한 번 더 확실하게 보장**하는 구조가 된다.

---

## 5. 이번 TIL에서 기억할 점

1. **한글 파일명은 NFC/NFD 두 형태로 존재**하고, OS마다 선호하는 표현 방식이 달라 한글이 "깨진 것처럼" 보일 수 있다.
2. S3 URL에 보이는 `%E1%84...` 형태의 경로는, 조합형(NFD) 한글이 percent-encoding된 결과일 수 있다.
3. 브라우저에서 `<a download>` 속성을 사용하면, presigned URL이라도 원하는 파일명으로 다운로드를 유도할 수 있다.
4. 이 방식은 데스크톱 브라우저 기준으로 실무에서 널리 사용되는 패턴이며, 크게 문제될 가능성은 낮다.
5. 더 확실하게 보장하고 싶다면, **Presigned URL 생성 시 `ResponseContentDisposition`으로 파일명을 명시**해서 서버 응답 레벨에서 파일명을 강제할 수 있다.
6. mac과 Windows가 한글 파일명을 내부적으로 다르게 표현한다는 점을 이해하고 있으면, "왜 똑같이 보이는 이름인데도 바이트가 다르지?" 같은 의문이 들 때 판단 기준이 된다.

---

앞으로 한글 파일 다운로드 관련 이슈가 생기면:

- 1차: 프론트엔드에서 `download = fileName.normalize('NFC')` 로 처리
- 2차: 필요하면 S3 Presigned URL에 `ResponseContentDisposition` 추가
- 3차: 문제가 발생한 환경이 mac인지 Windows인지, 브라우저/OS 조합을 함께 확인

이 순서로 점검하면, 한글 파일명 깨짐/이상한 이름 저장 문제를 훨씬 안정적으로 다룰 수 있다.
