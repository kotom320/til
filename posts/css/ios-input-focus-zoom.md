---
title: "모바일에서 입력창을 누르면 화면이 확대되는 이유"
date: "2026-08-24"
tags: ["css", "ios", "safari", "mobile", "form"]
summary: "iOS Safari는 16px 미만 폼 컨트롤에 포커스하면 페이지를 확대한다. viewport를 잠그는 대신 입력창을 16px로 올린 이유"
---

## 문제 상황

개인 프로젝트를 폰에서 쓰다가 발견했다. 입력창을 누르면 페이지가 확 커진다. 키보드가 올라오면서 화면이 확대되고, **입력을 끝내고 포커스를 빼도 확대된 배율이 그대로 남는다.** 원래 크기로 돌아오려면 직접 핀치로 축소해야 한다.

iOS Safari에서만 났다. 안드로이드 크롬과 데스크톱에서는 재현되지 않았다.

## 원인 분석

iOS Safari에는 **포커스된 폼 컨트롤의 계산된 `font-size`가 16px 미만이면 읽기 좋은 크기가 될 때까지 페이지를 확대하는** 동작이 있다. 글자가 작아서 입력하기 불편할 거라고 브라우저가 판단하고 대신 줌인해주는 것이다. 16px 이상이면 이 동작이 일어나지 않는다.

내 CSS가 정확히 그 조건이었다.

```css
input[type=number], input[type=date], select, textarea{ font-size:15px; }
select{ font-size:14px }
textarea{ font-size:12px }
.typed-in input{ font-size:13px }
```

전부 16px 미만이다. 화면을 조밀하게 보이려고 하나씩 줄여둔 값들인데, 그게 그대로 확대 트리거였다.

기준은 **계산된 값**이다. `rem`이나 `em`으로 썼다면 선언값이 아니라 실제로 계산된 픽셀을 봐야 하고, 상위 요소의 `font-size`가 바뀌면 조건에 걸렸다 풀렸다 한다.

## 해결 방법

폼 컨트롤을 전부 16px로 올렸다.

```css
/* 16px 미만이면 iOS Safari 가 포커스할 때 페이지를 확대해 버리고,
   그 배율이 그대로 남는다. 모든 입력 컨트롤을 16px 로 맞춘다. */
input, select, textarea{
  width:100%; min-width:0; padding:10px 11px;
  font:inherit; font-size:16px;
}
select{font-family:"IBM Plex Sans KR",sans-serif}
textarea{line-height:1.5; resize:vertical; min-height:96px}
```

여기서 실제로 시간을 쓴 건 기본 규칙이 아니라 **뒤에 남아 있던 오버라이드**였다.

```css
/* 기본을 16px 로 고쳐도 이게 남아 있으면 이 칸만 계속 확대된다 */
.typed-in input{flex:1; min-width:0; padding:8px 10px; font-size:13px}
```

기본 규칙을 16px로 바꿔놓고도 특정 입력창에서만 확대가 계속 났다. 더 구체적인 셀렉터가 다시 13px로 끌어내리고 있었기 때문이다. `font-size`를 지정한 곳을 전부 찾아서 폼 컨트롤에 걸리는 것들을 지웠다. **기본값 한 줄 고치고 끝났다고 보면 안 된다.**

셀렉터도 같이 바꿨다. 원래는 `input[type=number], input[type=date]`처럼 타입을 나열하고 있었는데, 이러면 나중에 `type="text"`나 `type="search"`를 추가할 때 규칙 밖으로 새어나간다. `input` 전체를 잡고 필요한 것만 뒤에서 조정하는 쪽이 안전하다.

### 폰트를 키우면 레이아웃이 밀린다

이게 따라오는 비용이다. 특히 `input[type=date]`는 네이티브 컨트롤이라 브라우저가 정한 **고유 최소 너비**가 있다. 글자를 키우면 그 최소 너비도 같이 커져서, 2열 그리드에 넣어놨던 날짜 칸이 옆 칸을 침범했다.

```css
.fields{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.field{min-width:0}            /* 그리드 아이템이 내용물 때문에 안 줄어드는 것 방지 */
.field.wide{grid-column:1 / -1}
input[type=date]{min-width:0; max-width:100%}
```

날짜가 들어가는 필드는 한 줄을 통째로 쓰게 했다. 확대 문제를 고치려면 결국 **16px 기준으로 폼 레이아웃을 다시 봐야 한다.** 좁은 그리드와 네이티브 컨트롤이 있는 자리가 특히 그렇다.

## 왜 이 방법인가

확대를 막는 방법이 몇 가지 더 있는데 전부 안 골랐다.

**viewport로 확대 자체를 잠그기**

```html
<meta name="viewport" content="width=device-width, initial-scale=1,
      maximum-scale=1, user-scalable=no" />
```

가장 흔히 보이는 해법이고 한 줄이면 끝난다. 문제는 이게 자동 확대만 막는 게 아니라 **사용자가 필요해서 하는 핀치 줌까지 막는다**는 것이다. 작은 글씨를 키워 보려는 사람에게서 수단을 뺏는다. 게다가 iOS는 버전에 따라 `user-scalable`을 무시하기도 해서 동작이 보장되지도 않는다. 확실한 건 16px 조건 쪽이다.

**포커스할 때만 viewport를 바꿨다가 되돌리기**

`focus`에서 `maximum-scale=1`을 넣고 `blur`에서 빼는 방식. 핀치 줌은 살릴 수 있지만 JS로 전역 meta 태그를 계속 흔들게 되고, `blur` 타이밍이 어긋나면 확대가 남은 채로 끝난다. 입력창 몇 개 때문에 감수할 복잡도가 아니다.

**16px로 두고 `transform: scale()`로 작아 보이게 하기**

디자인이 14px을 양보 못 할 때 쓰는 편법이다. 실제 폰트는 16px이라 확대는 안 되고 보이는 크기만 줄어든다. 대신 클릭 영역, 캐럿 위치, 레이아웃 계산이 전부 실제 크기 기준으로 남아서 어긋난다. 마지막 수단이다.

내 경우엔 16px이 디자인상 크게 나쁘지 않았다. 애초에 모바일 입력창은 그 정도가 읽고 누르기 편한 크기다. 브라우저가 확대까지 해가며 "이거 너무 작다"고 알려주고 있었던 셈이고, 그 신호를 무시하고 잠그는 대신 받아들이는 쪽을 골랐다.

## 정리

- **iOS Safari는 계산된 `font-size`가 16px 미만인 폼 컨트롤에 포커스하면 페이지를 확대한다.** 그 배율은 포커스를 빼도 남는다
- 해결은 `input`, `select`, `textarea`를 16px 이상으로 맞추는 것. viewport로 잠그는 방식은 사용자의 핀치 줌까지 가져간다
- **기본 규칙만 고치면 안 된다.** 더 구체적인 셀렉터에 남은 `font-size` 오버라이드가 있으면 그 입력창만 계속 확대된다
- 타입을 나열하지 말고 `input` 전체를 잡는다. 나중에 추가되는 입력 타입이 규칙 밖으로 새지 않는다
- 16px로 올리면 레이아웃이 밀린다. 네이티브 `date` 컨트롤은 고유 최소 너비가 있어서 좁은 그리드에서 옆 칸을 침범한다
