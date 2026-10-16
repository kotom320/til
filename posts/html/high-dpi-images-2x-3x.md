---
title: "이미지를 표시 크기보다 2~3배 크게 넣어야 하는 이유 (devicePixelRatio)"
date: "2026-10-16"
tags: ["HTML", "image", "devicePixelRatio", "srcset"]
summary: "CSS px ≠ 물리 픽셀, 1x 이미지는 업스케일돼 흐려진다"
---

## 배경 / 계기

웹앱에 넣는 이미지를 Figma에서 뽑을 때 늘 화면보다 큰 3x로 추출하고 있었다. "예전에 iOS에서 1x로 넣었더니 깨져 보여서 3배로 넣기 시작했다"는 기억만 있고 이유는 흐릿했다. 그 기억이 맞는지, 지금도 그래야 하는지, S3 + CDN으로 받는 이미지도 마찬가지인지 정리했다.

여기서 1x는 가로세로 비율 얘기가 아니다. **Figma에서 보이는 크기와 실제 이미지 픽셀 크기의 비율**이다.

## 핵심 개념

### CSS px는 물리 픽셀이 아니다

CSS의 `width: 100px`은 논리 단위다. 화면이 이 100px을 물리 픽셀 몇 개로 그리는지는 `window.devicePixelRatio`(DPR)가 정한다.

| 기기 | DPR | CSS 100px을 채우는 물리 픽셀 |
|---|---|---|
| 일반 데스크톱 모니터 | 1 | 100 |
| iPhone (일반 모델), MacBook | 2 | 200 |
| iPhone Plus/Pro/Max | 3 | 300 |
| 최근 Android | 약 2.6~3.5 | 260~350 |

### 그래서 1x 이미지는 흐려진다

100×100px 이미지를 CSS 100px 칸에 넣으면, DPR 3 기기에서는 300×300 물리 픽셀을 채우려고 브라우저가 이미지를 **3배로 늘려서(업스케일)** 그린다. 없는 픽셀을 보간으로 메우니 흐려진다.

300×300px(3x) 이미지를 같은 100px 칸에 넣으면 물리 픽셀과 1:1로 맞아서 선명하다.

즉 예전 기억은 맞았다. 다만 **iOS 버그가 아니라 고밀도 화면 전반의 현상**이다. iPhone이 일찍부터 고밀도였을 뿐이고, 요즘 Android도 똑같다.

Apple Human Interface Guidelines도 같은 원리다. 1pt = 1px을 @1x로 두고, iOS 앱에는 @2x와 @3x 에셋을 넣으라고 한다.

## 예시 코드

### 기기 밀도별로 골라 받기 (`srcset` x 디스크립터)

```html
<img
  src="banner.webp"
  srcset="banner.webp 1x, banner@2x.webp 2x, banner@3x.webp 3x"
  width="360"
  height="200"
  alt="배너"
/>
```

`src`는 1x로 취급된다. 브라우저가 DPR을 보고 하나만 받는다.

### 이미지 리사이즈 CDN: 원본은 크게, 요청은 "표시 크기 × DPR"

S3에 원본을 올리고 CDN 앞단의 이미지 핸들러(AWS Serverless Image Handler 같은 것)가 요청 시점에 리사이즈하는 구조라면, "몇 배로 받을지"는 추출할 때가 아니라 **요청할 때** 정할 수 있다.

```ts
// 핸들러 요청 형식 예: base64({ bucket, key, edits: { resize: { width, height } } })
const getImageUrl = (key: string, displayWidth: number) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const payload = {
    bucket: 'your-bucket',
    key,
    edits: { resize: { width: Math.round(displayWidth * dpr) } },
  };
  return `https://cdn.your-domain.com/${btoa(JSON.stringify(payload))}`;
};

// CSS 20px로 보이는 프로필 썸네일 → DPR 3 기기에서 60px 요청
getImageUrl('public/profile/abc.png', 20);
```

여기서 지킬 것 두 가지:

1. **원본은 크게 올린다.** 원본보다 큰 크기를 요청하면 늘려서 줄 뿐이라 선명해지지 않는다. 관리자가 올리는 배너는 지금처럼 3x로 만들어 올리는 게 맞다.
2. **요청 크기는 표시 크기에 맞춘다.** 크기를 안 넘기면 원본 그대로 내려온다. 반대로 너무 크게 요청하면 용량만 낭비한다.

## 왜 이 방법인가

"크게 넣는다"는 지금도 맞지만, 무조건 3x PNG는 비싸다.

- **2x vs 3x**: 눈으로는 차이가 거의 안 보이는데, 3x는 2x보다 픽셀이 2.25배 많다. 사진·배너는 2x를 기본으로 두고, 글자가 들어가서 선명도가 중요한 이미지만 3x로 한다.
- **벡터는 SVG**: 아이콘·일러스트·로고는 SVG면 배율 고민 자체가 사라진다.
- **포맷은 WebP**: 같은 화질에서 PNG보다 훨씬 작다. 리사이즈 핸들러가 포맷 변환(`toFormat`)을 지원하면 같이 쓴다.

실제로 한 프로젝트를 점검해 보니:

- 번들 이미지가 PNG 약 400개, 합계 약 25MB였고 `srcset`이나 빌드 단계 이미지 최적화는 없었다. 모든 기기가 3x PNG를 그대로 받는 상태.
- CDN 리사이즈 요청은 고정값(130×130 등)이었고 DPR은 쓰지 않았다. CSS 20px로 보이는 프로필에 130px을 요청해 **6.5배**로 받고 있었다. 깨지진 않지만 용량 손해.

흐린 것보다는 너무 큰 쪽이 문제였던 셈이다.

## 정리

CSS px × DPR만큼 픽셀이 있어야 선명하다. 원본은 크게 두고, 실제로 받는 크기는 표시 크기 × 2~3으로 맞춘다.
