---

title: "noopener noreferrer로 보안 및 프라이버시 강화하기"
date: "2025-06-17"
tags: ["HTML", "Security", "Privacy", "TIL"]
summary: "target='_blank' 사용 시 rel='noopener noreferrer'를 함께 써야 하는 이유와 효과를 정리합니다."
--------------------------------------------------------------------------------------

## 배경

* 새 탭으로 링크를 열 때 `target="_blank"`를 많이 사용함
* 이 경우 부모 창에 대한 참조(`window.opener`)가 생성되어 보안 및 프라이버시 위험이 존재함
* 간단한 속성 추가만으로 이러한 위험을 방지할 수 있는 방법을 익히고자 함

## 배운 내용

### 1. `noopener` — 역탭내빙 방지

```html
<a href="https://external.site" target="_blank" rel="noopener">
  외부 링크 열기
</a>
```

* **문제**: 새 탭에서 `window.opener`를 사용해 부모 창을 조작(리디렉션 등)할 수 있음
* **효과**: `rel="noopener"`를 추가하면, 새 탭의 `window.opener` 참조가 `null`로 설정되어 조작 불가

### 2. `noreferrer` — Referer 헤더 차단

```html
<a href="https://external.site" target="_blank" rel="noreferrer">
  외부 링크 열기
</a>
```

* **문제**: 기본 동작으로 브라우저는 링크 클릭 시 `Referer` 헤더에 현재 페이지 URL을 전송함
* **영향**: 내부 경로 또는 민감 쿼리 파라미터가 외부 사이트에 노출될 수 있음
* **효과**: `rel="noreferrer"`를 추가하면 Referer 헤더가 전송되지 않아 출처 정보 보호

### 3. 결합 사용 — `noopener noreferrer`

```html
<a
  href="https://external.site"
  target="_blank"
  rel="noopener noreferrer"
>
  안전한 새 탭 열기
</a>
```

* 두 속성을 함께 사용하면 **보안**(역탭내빙)과 **프라이버시**(출처 정보 보호)를 동시에 해결

### 4. 브라우저 호환성

* 최신 브라우저(Chrome, Firefox, Edge, Safari)에서 `noopener`와 `noreferrer` 모두 지원
* 일부 구형 브라우저(IE 등)는 `noopener`만 미지원할 수 있으나, `noreferrer`를 사용하면 암묵적으로 탭내빙도 차단됨
* **권장**: 항상 `rel="noopener noreferrer"`를 함께 명시하여 호환성과 안전성을 확보

## 코드 예제

```html
<!-- 보안과 프라이버시를 모두 지키는 링크 -->
<a
  href="https://example.com"
  target="_blank"
  rel="noopener noreferrer"
>
  Example.com 방문
</a>
```

## 느낀 점

* 단순한 속성 추가만으로도 보안 취약점(역탭내빙)과 프라이버시 이슈(출처 노출)를 방지할 수 있어 매우 효율적임
* HTML 기본 속성을 잘 이해하고 활용하는 것이 자바스크립트 코드를 덜어내면서도 안전을 확보하는 좋은 방법임
* 앞으로 외부 링크를 사용할 때마다 습관적으로 `rel="noopener noreferrer"`를 함께 작성할 것임

---
