---

title: "HTML/CSS 공백(collapsing whitespace) 처리 원인과 해결"
date: "2025-08-04"
tags: ["HTML", "CSS", "Whitespace", "TIL"]
summary: "HTML의 공백 문자가 연속될 때 렌더링 시 한 칸으로 합쳐지는 현상과 그 원인, CSS를 통한 제어 방법을 정리합니다."
------------------------------------------------------------------------------

## 배경

* 텍스트 데이터에 `'안 녕 하  세   요'`처럼 연속된 공백이 있을 때, 브라우저에서 렌더링하면 모두 한 칸만 보임
* 데이터의 공백 개수와 화면상의 간격이 일치하지 않아 레이아웃·가독성 문제가 발생함

## 1. 공백 축소(collapsing whitespace) 규칙

* HTML 렌더링 엔진은 기본적으로 **연속된 공백, 탭, 줄바꿈을 하나의 공백으로 처리**
* 이는 HTML5 명세(`Whitespace handling`)에 정의된 동작으로, 코드 가독성과 마크업 단순화를 위해 설계됨

```html
<p>안    녕     하 세    요</p>
<!-- 화면에는 “안 녕 하 세 요”처럼 공백 하나로 표시 -->
```

## 2. 원인 분석

1. **HTML 파서**

   * `<p>` 등 인라인 컨텍스트에서 연속 공백을 합치는 단계가 기본 수행됨
2. **CSS 디폴트 설정**

   * `white-space: normal`이 기본값 → 공백 축소, 줄바꿈 무시
3. **콘텐츠 흐름 단순화**

   * 개발자가 의도치 않게 여러 개 공백을 삽입해도, 최종 UI는 깔끔하게 유지됨

## 3. 제어 방법

### 3.1 CSS `white-space` 속성 사용

| 값          | 설명                            |
| ---------- | ----------------------------- |
| `normal`   | 연속 공백 축소, 줄바꿈 무시 (기본값)        |
| `pre`      | 공백·줄바꿈을 유지 (HTML `<pre>`와 유사) |
| `nowrap`   | 줄바꿈만 무시, 공백 축소 유지             |
| `pre-wrap` | 공백·줄바꿈 모두 유지, 자동 줄바꿈 허용       |
| `pre-line` | 공백 축소 유지, 줄바꿈은 유지             |

```css
/* 연속 공백 유지 */
.preserve {
  white-space: pre;
}

/* 공백·줄바꿈 유지하면서 자동 줄바꿈 */
.preserve-wrap {
  white-space: pre-wrap;
}
```

### 3.2 HTML 엔티티 사용

* 연속 공백 중 특정 공백만 강제하려면 `&nbsp;`(non-breaking space) 사용

```html
<p>안&nbsp;&nbsp;&nbsp;녕&nbsp;하세&nbsp;&nbsp;요</p>
```

## 4. 예제 비교

```html
<style>
.normal { white-space: normal; border: 1px solid #ccc; padding: 8px; }
.pre { white-space: pre; border: 1px solid #c33; padding: 8px; }
.pre-wrap { white-space: pre-wrap; border: 1px solid #3c3; padding: 8px; }
</style>

<div class="normal">안    녕     하 세    요</div>
<div class="pre">안    녕     하 세    요</div>
<div class="pre-wrap">안    녕     하 세    요</div>
```

* `.normal`: 공백 축소 → 한 칸만 표시
* `.pre` / `.pre-wrap`: 원본 공백 모두 유지

## 5. 느낀 점

* HTML 공백 축소는 편리하지만, 데이터와 UI 간 괴리를 발생시킬 수 있어 주의 필요
* CSS `white-space` 속성을 적절히 활용해 의도한 공백 표현을 제어할 수 있음
* `&nbsp;`는 개별 공백 제어에 유용하나, 과도 사용 시 유지보수 난이도 상승 주의

---
