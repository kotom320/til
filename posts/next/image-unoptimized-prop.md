---
title: "Next.js Image unoptimized prop으로 Vercel 이미지 변환 한도 절약하기"
date: "2026-04-07"
tags: ["Next.js", "Image", "Vercel", "최적화"]
summary: "이미 최적화된 외부 이미지엔 unoptimized로 Vercel 변환 건너뛰기"
---

## 문제 상황

Next.js + Vercel로 배포한 포켓몬 도감 프로젝트에서 Vercel 이미지 변환 무료 한도(월 5,000건)가 빠르게 소진됐다.

포켓몬 목록 페이지를 열면 수십 장의 이미지가 한 번에 로드되고, `<Image>` 컴포넌트가 각 이미지를 Vercel 서버로 프록시해 리사이징·WebP 변환을 수행하기 때문이었다.

## 원인 분석

Next.js `<Image>` 컴포넌트는 기본적으로 외부 이미지를 Vercel의 Image Optimization API(`/_next/image?url=...`)를 통해 처리한다.

- 원본 URL: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png`
- 실제 요청: `/_next/image?url=https%3A%2F%2Fraw.githubusercontent.com%2F...&w=256&q=75`

포켓몬 공식 아트워크는 이미 고해상도 PNG로 잘 정리되어 있고, 추가 변환이 불필요한 이미지다. 그럼에도 컴포넌트를 쓰는 것만으로 변환 카운트가 쌓였다.

## 해결 방법

이미 최적화된 외부 이미지에는 `unoptimized` prop을 추가해 Vercel 변환을 완전히 건너뛴다.

```tsx
// 변경 전 — Vercel Image Optimization API 경유
<Image
  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
  alt={name}
  width={256}
  height={256}
/>

// 변경 후 — 원본 URL 직접 사용, 변환 카운트 0
<Image
  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
  alt={name}
  width={256}
  height={256}
  unoptimized
/>
```

`unoptimized`를 추가하면 `<Image>`의 레이아웃 안정성(width/height 예약), lazy loading, blur placeholder 같은 기능은 그대로 유지하면서 Vercel 서버 사이드 변환만 생략한다.

## 왜 이 방법인가

| 접근 방법 | 장점 | 단점 |
|-----------|------|------|
| `unoptimized` | 변환 카운트 0, 설정 한 줄 | WebP 자동 변환 없음 |
| `next/image` 기본 | WebP·리사이징 자동 | 무료 한도 소진 빠름 |
| `<img>` 태그로 교체 | 변환 없음 | lazy loading, blur 등 기능 직접 구현 필요 |

포켓몬 공식 아트워크처럼 **이미 품질이 충분하고 크기가 고정된 외부 이미지**에는 `unoptimized`가 가장 적합하다. `<img>`로 교체하면 `<Image>`가 제공하는 편의 기능을 포기해야 한다.

반대로, 사용자가 업로드한 이미지나 크기가 제각각인 이미지처럼 **변환 효과가 확실한 경우**엔 기본 동작을 유지하는 게 낫다.

## 정리

`raw.githubusercontent.com` 같이 이미 최적화된 외부 이미지는 `<Image unoptimized>`로 Vercel 변환 카운트를 아낀다.
