---
title: "웹뷰에서 주소를 누르면 지도 앱 열기: tel:과 달리 표준이 없다"
date: "2026-10-16"
tags: ["WebView", "Universal Link", "URI scheme", "TIL"]
summary: "지도는 표준 스킴이 없어 외부 브라우저+universal link"
---

## 배경 / 계기

화면 검토 중에 "전화번호는 누르면 바로 전화가 걸리는데, 주소도 누르면 바로 지도가 뜨게 기본 기능으로 되나요?"라는 질문을 받았다.
"네이티브팀 도움이 필요하다"고 답했는데, 혹시 웹 기본 기능으로 되는 걸 몰랐던 건 아닌지 확인해 봤다.

## 핵심 개념

### 1. 전화에는 표준 스킴이 있다

```html
<a href="tel:010-0000-0000">010-0000-0000</a>
```

모바일 브라우저는 `tel:`을 받으면 OS가 전화 앱을 연다.

### 2. 지도에는 `tel:`에 해당하는 표준이 사실상 없다

| 방법 | 한계 |
| --- | --- |
| `geo:37.5,127.0?q=주소` (RFC 5870) | Android만 처리. iOS Safari는 무시 |
| iOS Safari 주소 자동 감지(data detector) | 우리가 제어할 수 없고 신뢰하기 어려움 |
| 지도 서비스 웹 URL | 어느 지도를 쓸지 우리가 정해야 함 |

그래서 보통은 지도 서비스의 웹 URL로 링크한다. 모바일 브라우저에서는 앱이 설치돼 있으면 universal link(iOS) / App Links(Android)로 앱이 열리고, 없으면 웹 지도가 열린다.

```text
https://map.naver.com/p/search/<주소>
https://map.kakao.com/link/search/<주소>
https://www.google.com/maps/search/?api=1&query=<주소>
```

### 3. 앱 웹뷰에서는 둘 다 웹 기본 기능만으로 안 된다

- WKWebView, Android WebView는 `tel:` 같은 비 http 스킴을 기본으로 처리하지 않는다. 네이티브가 가로채 주지 않으면 무시되거나 `ERR_UNKNOWN_URL_SCHEME` 에러가 난다. 실제로 우리 앱도 전화를 `tel:` 링크가 아니라 네이티브 브리지로 걸고 있었다.
- 지도 웹 URL을 웹뷰 안에서 열면 **universal link가 동작하지 않는다**. 웹뷰가 그 URL을 직접 로드해 버려서 지도 앱이 아니라 웹뷰 안에 웹 지도가 뜬다.

즉 "네이티브 도움이 필요하다"는 답이 웹뷰 기준으로는 맞았다.

## 예시 코드

네이티브팀 의견은 "새 브리지를 만들 필요 없이, 기존 외부 브라우저 열기 브리지에 지도 URL을 넘기면 OS가 universal link로 앱을 열 것"이었다.

```tsx
<button
  type="button"
  onClick={() =>
    NativeBridge.openExternalBrowser(
      `https://map.naver.com/p/search/${encodeURIComponent(address)}`,
    )
  }
>
  {address}
</button>
```

- 브리지가 없는 일반 브라우저에서는 `window.open(url, '_blank')`로 대체되므로 그대로 동작한다.
- 주소에 한글·공백이 들어가므로 `encodeURIComponent`는 필수다.

## 왜 이 방법인가

- `nmap://` 같은 앱 딥링크는 앱 미설치 시 처리(스토어 이동)와 iOS `LSApplicationQueriesSchemes` 등록이 필요하다.
- 웹 URL + universal link는 앱이 있으면 앱, 없으면 웹으로 자연스럽게 떨어진다. 이미 있는 "외부 브라우저 열기" 브리지만 있으면 되어 네이티브 추가 개발이 없다.
- 단, universal link는 사용자가 직접 탭한 이동에서만 앱을 여는 등 OS 정책을 타므로 실기기 확인이 필요하다 (이 글을 쓰는 시점엔 아직 실기기 테스트 전).

## 정리

`tel:`은 표준이지만 지도는 표준 스킴이 없다. 웹뷰에서는 지도 웹 URL을 외부 브라우저로 넘겨야 universal link가 지도 앱을 열어 준다.
