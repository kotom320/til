---
title: "iOS 천지인 IME 한글 입력 버그를 Meta Lexical 코어에서 수정한 경험"
date: "2026-05-12"
tags: ["Lexical", "iOS", "IME", "오픈소스", "한글입력", "브라우저이벤트"]
summary: "compositionstart를 발생시키지 않는 천지인 특성 때문에 Lexical이 targetRange를 무시하고 잘못된 자모를 삭제하는 버그를 직접 fix하고 merge까지"
---

## 문제 상황

서비스 사용자 리뷰에서 "한글 입력이 이상하게 된다"는 제보를 봤다. 처음엔 재현이 안 됐는데, iOS 한글 입력 방식을 **10키(천지인)**으로 바꾸고 나서야 똑같이 재현됐다. "안녕하세요"를 입력하면 "안녕하ᄉ세ᄋᄋ요"가 됐다.

## 원인 분석

iOS 천지인(10키) 입력기는 `compositionstart` / `compositionend` 이벤트를 발생시키지 않는다. 일반 한글 입력기와 달리, 음절 조합마다 이 두 이벤트를 쌍으로 보낸다.

1. `deleteContentBackward` (targetRange 지정) - 현재 조합 중인 자모 삭제
2. `insertText` - 새 음절 삽입

Lexical은 `isComposing()`이 false이면 `DELETE_CHARACTER_COMMAND`를 실행하는데, 이 커맨드는 `targetRange`를 완전히 무시하고 커서 앞 글자 하나만 지운다. 천지인이 "이 범위를 지워"라고 해도 Lexical이 무시하고 엉뚱한 자모를 지워버려서, 고아 자모(orphaned jamo)가 쌓이는 문제가 생긴다.

| 입력기 | composition 이벤트 | Lexical 인식 |
|--------|------------------|------------|
| 일반 한글 (쿼티) | `compositionstart` / `compositionend` 발생 | 조합 중 인식, 정상 처리 |
| 천지인 (10키) | 발생 안 함 | 항상 `isComposing() === false` |

## 해결 방법

`deleteContentBackward` 핸들러에 iOS 전용 가드를 추가했다. iOS이고 `targetRange`가 실제 범위를 가질 때(`non-collapsed`)만 개입해서 해당 범위를 직접 삭제한다.

```typescript
// iOS 10-key Korean IME (천지인/Chunjiin) does not fire compositionstart /
// compositionend events. Instead it sends a deleteContentBackward with a
// non-collapsed targetRange to delete the current composing jamo, immediately
// followed by insertText with the updated syllable.
//
// Because editor.isComposing() is always false for this keyboard type, Lexical
// would otherwise dispatch DELETE_CHARACTER_COMMAND, which ignores the
// targetRange entirely and deletes only one character before the cursor. This
// leaves orphaned jamo in the editor state that accumulate and corrupt output
// (e.g. typing "안녕하세요" produces "안녕하ᄉ세ᄋᄋ요").
//
// Fix: when on iOS with a non-collapsed targetRange, apply the range directly
// to the Lexical selection and delete the matched text. If applyDOMRange cannot
// resolve the range (returns a collapsed selection), fall through to the default
// Lexical deletion path.
if (IS_IOS && targetRange !== null && !targetRange.collapsed) {
  selection.applyDOMRange(targetRange);
  if (!selection.isCollapsed()) {
    event.preventDefault();
    selection.removeText();
    return true;
  }
}
```

`applyDOMRange`가 범위를 resolve 못하면(collapsed로 돌아오면) 기존 로직으로 폴백하는 안전망도 함께 넣었다.

## 오픈소스 기여 과정

처음엔 Lexical 플러그인으로 우회할 수 있을까 코드를 살펴봤는데, 문제가 `deleteContentBackward` 핸들러 내부에서 발생하는 구조라 플러그인에서 개입할 수 있는 지점이 없었다. Lexical 이슈에도 관련 내용이 없는 걸 확인하고 직접 PR을 올리기로 했다.

오픈소스 기여가 처음이라 CLA(Contributor License Agreement)가 뭔지도 몰랐다. 봇에게 "서명하세요" 메시지를 받고 나서야 알게 됐고, 메인테이너 etrepum에게 "테스트 없으면 닫겠다"는 요청을 받고 테스트 케이스도 추가했다. 같은 문제를 겪고 있던 한국 유저 mayrang이 직접 iOS Safari에서 검증해줬고, 결국 merge됐다.

PR: [facebook/lexical#8475](https://github.com/facebook/lexical/pull/8475)

## 정리

- `compositionstart`가 발생하지 않는 IME가 있다. 플랫폼별 입력 방식을 직접 테스트해봐야 안다.
- 라이브러리 버그는 플러그인 우회보다 근본 수정이 맞다. 우회는 내가 제어하지 못하는 코드에 의존하게 된다.
- 코드 양이 아니라 문제를 정확히 파악하는 게 핵심이다. 7줄짜리 fix도 merge된다.
- 주석이 코드보다 중요할 때가 있다. 메인테이너가 신뢰하게 만드는 건 WHY를 설명하는 주석이었다.
