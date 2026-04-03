---
title: "rrweb 녹화 중 화면 꺼짐으로 생긴 19시간짜리 청크 버그"
date: "2026-04-03"
tags: ["rrweb", "visibilitychange", "버그", "브라우저"]
summary: "백그라운드에서 브라우저 타이머가 throttle되면 rrweb 청크 로테이션이 멈춰 수십 시간짜리 청크가 생긴다. visibilitychange로 해결했다."
---

## 문제 상황

rrweb으로 세션을 녹화하는 SDK를 운영 중이었다. `maxMinutes: 3` 옵션으로 최근 3분만 보존하도록 설정했는데, 어느 날 19시간짜리 녹화가 올라왔다.

재현 조건:
1. 브라우저에서 앱을 열고 녹화 시작
2. 기기 화면을 끄거나 앱을 백그라운드로 전환
3. 다음 날 화면을 켜고 몇 분 뒤 저장 버튼 클릭
4. 19시간짜리 청크가 포함된 세션이 저장됨

## 원인 분석

rrweb은 `checkoutEveryNms` 옵션으로 일정 시간마다 새로운 full snapshot을 찍어 청크를 로테이션한다. 내부적으로 `setInterval`을 사용한다.

```ts
record({
  checkoutEveryNms: 60 * 1000, // 1분마다 새 청크
  emit: (event, isCheckout) => {
    if (isCheckout) {
      // 오래된 청크 제거 후 새 청크 시작
    }
  }
})
```

문제는 **브라우저가 백그라운드 탭이나 화면 꺼짐 상태에서 타이머를 throttle한다**는 것이다. Chrome은 백그라운드 탭의 `setInterval`을 최소 1분 이상으로 제한하거나 아예 멈추기도 한다. 결과적으로:

- 화면 꺼짐 → `setInterval` 중단 → 청크 로테이션 없음
- 19시간 후 화면 켜짐 → 같은 청크에 이어서 기록
- 버퍼에 `[19시간 청크, 1분 청크, 1분 청크, 30초 청크]`가 쌓임
- 저장하면 19시간짜리 포함해서 전송

## 해결 방법

`visibilitychange` 이벤트를 사용해 화면이 다시 켜질 때 강제로 새 청크를 시작한다.

```ts
this.stopFn = record({
  // ... 기존 옵션
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    record.takeFullSnapshot(true); // isCheckout: true → 새 청크 시작
  }
});
```

`record.takeFullSnapshot(true)`를 호출하면 `emit` 콜백의 `isCheckout` 파라미터가 `true`로 넘어온다. 이를 이용해 오래된 청크를 제거하고 새 청크를 시작하면 된다.

## 왜 이 방법인가

**대안: 녹화를 중단했다가 재시작**

```ts
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    this.stopFn?.();
    this.startRecording(); // 재시작
  }
});
```

이 방법은 새 full snapshot을 찍는다는 점은 같지만 `stopFn`을 교체해야 하고 상태 관리가 복잡해진다. `takeFullSnapshot(true)`가 더 간결하다.

**`visibilitychange`의 커버 범위:**

| 상황 | 이벤트 발생 여부 |
|------|----------------|
| 모바일 화면 꺼짐/잠금 | ✅ |
| 브라우저 탭 전환 | ✅ |
| 브라우저 창 최소화 | ✅ |
| 데스크톱 모니터만 꺼짐 | ❌ |

데스크톱에서 모니터만 꺼지는 경우는 브라우저가 여전히 포그라운드로 인식하므로 `visibilitychange`가 발생하지 않는다. 하지만 이 경우엔 타이머도 정상 동작하기 때문에 원래 청크 로테이션이 제대로 된다. **버그가 생기는 케이스와 fix가 동작하는 케이스가 일치한다.**

## 정리

rrweb 기반 녹화 도구를 만들 때 `checkoutEveryNms`만 믿으면 안 된다. 백그라운드 전환 시 타이머가 멈추므로 `visibilitychange` + `record.takeFullSnapshot(true)` 조합으로 보완해야 한다.
