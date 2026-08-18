---
title: "sharp에서 withMetadata를 autoOrient로 바꿨더니 ICC 프로파일이 사라졌다"
date: "2026-08-18"
tags: ["sharp", "lambda", "cloudfront", "image", "icc"]
summary: "회전 버그를 고치면서 같이 날아간 컬러 프로파일, 1년 뒤에 런타임 업그레이드 작업 중 발견한 이야기"
---

## 문제 상황

CloudFront 뒤에서 이미지를 변환하는 Lambda의 Node 런타임을 20에서 22로 올리는 작업을 하다가, sharp 인스턴스를 만드는 함수를 다시 읽게 됐다.

```typescript
let image = sharp(originalImage, options).autoOrient();
```

1년쯤 전에 이 줄이 이렇게 바뀌었다.

```diff
- image = sharp(originalImage, options).withMetadata();
+ let image = sharp(originalImage, options).autoOrient();
```

당시 고치려던 건 회전 문제였다. AutoWebP 변환을 켜면 브라우저에 따라 사진이 돌아가 보이는 현상이 있었고, 원인은 Chrome이 WebP의 orientation 태그를 무시한다는 것이었다. 그래서 EXIF orientation을 픽셀에 직접 굽는 `autoOrient()`로 바꿨다. 회전은 정상적으로 고쳐졌고 배포됐다.

문제는 이 교체가 회전만 바꾼 게 아니었다는 것이다. **`withMetadata()`가 하던 메타데이터 보존이 같이 사라졌고, 그 안에 ICC 컬러 프로파일이 있었다.** 에러는 나지 않는다. 이미지도 정상적으로 나온다. Display P3 같은 광색역 원본에서 색이 틀어져 보인다는 이야기가 있었을 뿐이다.

성격을 규정하면 **이전 수정이 만든 회귀**다. 새 코드의 버그가 아니고, 리뷰에서 놓친 실수라기보다 교체한 API의 계약이 원래 API가 하던 일을 다 덮지 못했는데 그 차이를 아무 테스트도 지키고 있지 않았던 경우다.

## 원인 분석

두 API는 대체 관계가 아니다. 이름이 비슷한 위치에 붙어 있을 뿐 하는 일이 다르다.

| API | 하는 일 |
|-----|--------|
| `withMetadata()` | 입력 메타데이터(EXIF, ICC, XMP, IPTC)를 출력에 유지 |
| `autoOrient()` | EXIF orientation을 픽셀에 굽고 방향 태그를 정리 |

`autoOrient()`에는 메타데이터를 보존하는 기능이 아예 없다. 그러니 회전을 고치려고 A를 B로 교체한 순간, 보존 기능은 호출하는 곳이 없어진 것이다.

여기서 핵심은 sharp의 기본 동작이다. 설치된 sharp 0.34의 `keepMetadata` 주석에 이렇게 적혀 있다.

```
The default behaviour, when `keepMetadata` is not used, is to convert to the
device-independent sRGB colour space and strip all metadata, including the
removal of any ICC profile.
```

**보존이 기본값이 아니라 제거가 기본값이다.** 명시적으로 요청하지 않으면 ICC는 출력에 실리지 않는다. `withMetadata()`가 있을 때는 그게 요청 역할을 하고 있었고, 지우고 나니 기본값으로 되돌아간 것이다.

여기서 짚어둘 게 하나 있다. 위 문서대로라면 프로파일을 떼면서 픽셀도 sRGB로 변환하므로 색이 크게 틀어지지는 않아야 한다. 그런데 실제로는 색이 틀어져 보인다는 보고가 있었다. 내가 측정으로 확인한 것은 ICC가 사라졌다가 되살아났다는 사실까지이고, 문서가 말하는 변환이 이 경로에서 어디까지 실제로 일어나는지는 확인하지 못했다. 이 어긋남 자체를 기억해둘 만하다.

내부 구현을 보면 관계가 더 분명하다.

```javascript
function keepIccProfile () {
  this.options.keepMetadata |= 0b01000;   // ICC 비트만
}
function keepMetadata () {
  this.options.keepMetadata = 0b11111;    // 전부
}
function withMetadata (options) {
  this.keepMetadata();                    // 전부 + 밀도/방향 옵션
  ...
}
```

메타데이터 종류별 비트마스크이고, `withMetadata()`는 전부 켜는 쪽이다.

## 왜 1년 동안 아무도 몰랐나

세 가지가 겹쳤다.

**에러가 없다.** 프로파일이 빠진 이미지도 완벽하게 정상적인 이미지다. 모니터링에 걸릴 만한 신호가 하나도 없다.

**티가 잘 안 난다.** sRGB 범위 안에서 찍힌 사진은 프로파일이 있든 없든 거의 같아 보인다. 차이가 드러나는 건 광색역 원본이고, 그것도 나란히 놓고 봐야 안다.

**테스트가 이 동작을 지키고 있지 않았다.** 기존 테스트는 업스트림 원본 동작을 기대하고 있었다.

```javascript
expect(metadata).toHaveProperty("exif");
expect(metadata.orientation).toEqual(3);
expect(withMetatdataSpy).toHaveBeenCalled();
```

회전 수정 때 이 테스트들이 깨졌을 텐데, 그때 한 일은 "우리 의도대로 바뀐 것"으로 보고 기대값을 고치는 것이었다. 실제로 회전과 EXIF에 대해서는 맞는 판단이었다. 다만 **ICC 보존을 어서션하는 테스트는 처음부터 없었다.** `withMetadata` 호출 여부를 보는 테스트는 있었지만, 그건 "메타데이터가 남는가"가 아니라 "그 함수를 불렀는가"를 볼 뿐이다.

## 해결 방법

```typescript
// autoOrient()는 EXIF orientation을 픽셀에 굽는다. Chrome이 WebP의 orientation 태그를
// 무시해 AutoWebP 변환 시 회전이 깨지므로 필요하다.
// 다만 autoOrient()만으로는 ICC 컬러 프로파일까지 사라져 광색역 원본의 색이 틀어진다.
// keepMetadata()가 아닌 keepIccProfile()을 쓰는 이유는 EXIF를 되살리지 않기 위해서다.
let image = sharp(originalImage, options).autoOrient().keepIccProfile();
```

`keepMetadata()`로 전부 되살리지 않은 건 의도적이다.

- **EXIF에는 GPS 좌표가 들어갈 수 있다.** 사용자가 올린 사진을 CDN으로 서빙하는 경로라 위치 정보를 되살릴 이유가 없다.
- **EXIF를 넣지 않아야 orientation 태그가 아예 없다.** 태그가 없으면 브라우저가 한 번 더 돌릴 여지도 없어서, 원래 고치려던 회전 문제의 재발 경로가 닫힌다.

즉 필요한 것 하나만 켜는 쪽을 골랐다. EXIF는 이전 수정 이후 이미 빠져 있던 상태라, 이 변경의 실질 효과는 ICC 복구 하나다.

테스트도 실제 동작을 검사하도록 바꿨다.

```javascript
const keepIccProfileSpy = jest.spyOn(sharp.prototype, "keepIccProfile");

it("Should bake orientation into pixels, keep ICC, and drop EXIF", async () => {
  expect(metadata).not.toHaveProperty("exif");
  expect(metadata).not.toHaveProperty("orientation");
  ...
});
```

제목도 같이 고쳤다. 어서션만 바꾸고 제목이 `Should include metadata`로 남아 있으면, 다음 사람이 읽을 때 "메타데이터를 유지하는 게 의도"라고 잘못 읽는다.

## 검증: 조건을 갖춘 원본이 없었다

배포 후 확인하려는데 문제가 있었다. 소스 버킷에 있는 파일은 대부분 PNG라 EXIF orientation도 광색역 ICC도 없다. 그걸로 요청하면 "응답이 정상적으로 온다" 정도만 확인되고 수정의 본체는 증명되지 않는다.

그래서 조건을 갖춘 픽스처를 직접 만들었다. 200x100 크기에 orientation=6, P3 ICC 480바이트, EXIF 186바이트를 가진 JPEG다. 회전이 픽셀에 구워지면 결과는 100x200이 되어야 하고, ICC는 살아있고 EXIF는 없어야 한다.

가장 강한 증거는 **예전 빌드와의 A/B**였다. 개발 스택에는 새 빌드가, 상용 스택에는 예전 빌드가 올라가 있는 상태라 같은 원본으로 같은 요청을 두 곳에 보낼 수 있었다.

| | format | size | orientation | icc | exif |
|---|---|---|---|---|---|
| 원본 | jpeg | 200x100 | 6 | 480B | 186B |
| 예전 빌드 | webp | 100x200 | 없음 | **없음** | 없음 |
| 새 빌드 | webp | 100x200 | 없음 | **480B** | 없음 |

ICC는 해시까지 원본과 동일했다. 리인코딩이나 색공간 변환 없이 프로파일이 그대로 실려 나간다는 뜻이다. 회전 굽기와 EXIF 제거는 양쪽이 같으므로 이전 수정의 동작에는 회귀가 없다는 것도 같은 표에서 확인된다.

중간에 애니메이션 GIF의 프레임이 사라진다는 경고를 한 번 냈는데 오탐이었다. 원인은 레포에 있던 테스트 픽스처의 두 프레임이 모두 완전 투명이라 인코더가 한 프레임으로 합친 것이었다. 가공을 전혀 안 한 baseline까지 같은 증상이 나오면 코드가 아니라 측정이 잘못된 것이다. 실제 애니메이션 GIF로 다시 재면 양쪽 응답이 바이트 단위로 동일했다.

## 고쳐도 바로 안 보인다

이미지 파이프라인 수정에는 배포 이후가 한 단계 더 있다.

```
cache-control: max-age=31536000,public   (365일)
CloudFront MaxTTL: 31536000
```

오리진이 1년을 지시하고 CloudFront MaxTTL도 1년이라 그대로 먹는다. 즉 **이 수정은 캐시 미스에만 적용되고, 배포 전에 이미 변환·캐시된 이미지는 최대 1년간 예전 결과를 계속 서빙한다.** "배포했는데 색이 그대로"가 나올 수 있는 지점이다.

무효화를 걸면 CloudFront 캐시는 비워지지만 그것도 절반이다. `max-age`는 사용자 브라우저까지 내려가기 때문에, 이미 본 사람의 브라우저 캐시는 무효화로도 못 건드린다.

## 왜 이 방법인가

`withMetadata()`를 다시 호출하는 방법도 있었다. 그러면 ICC와 함께 EXIF도 돌아오고, orientation 태그가 다시 실리면서 처음 고쳤던 회전 문제가 재발할 수 있다. 되돌아가는 선택지가 아니다.

`keepIccProfile()`은 필요한 비트 하나만 켜는 방법이고, 이 경로가 왜 그 상태여야 하는지를 코드에 그대로 남길 수 있다. 광색역 원본을 그 색 그대로 내보내는 게 목적이라면 프로파일을 싣는 쪽이 목적에 직접 대응한다.

## 정리

- sharp는 **메타데이터 제거가 기본값**이다. `keepMetadata`류를 명시하지 않으면 ICC 프로파일은 출력에 실리지 않는다.
- `withMetadata()`를 `autoOrient()`로 바꾸는 건 기능 교체가 아니다. 회전 처리를 얻고 메타데이터 보존을 잃는 거래다. 두 API는 역할이 겹치지 않는다.
- 전부 되살리는 `keepMetadata()` 대신 `keepIccProfile()`을 쓰면 EXIF(GPS 좌표, orientation 태그)를 되살리지 않고 색만 복구할 수 있다.
- 에러가 없고 눈에 잘 안 띄는 회귀는 테스트가 그 속성을 직접 어서션하지 않으면 잡히지 않는다. "그 함수를 호출했는가"가 아니라 "출력에 그 속성이 남았는가"를 본다.
- 이미지 변환 수정은 CDN·브라우저 캐시 때문에 배포 즉시 보이지 않는다. 검증은 조건을 갖춘 픽스처를 직접 만들어 예전 빌드와 A/B로 하는 게 확실하다.
- 같은 작업의 런타임 쪽 정리는 [CDK로 배포하는 Lambda 런타임을 Node 20에서 22로 올리기](/post/infra/lambda-runtime-node-20-to-22-cdk)에 있다.
