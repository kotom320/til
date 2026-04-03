---
title: "rrweb으로 브라우저 화면 녹화하기 — qaroom SDK 구현"
date: "2026-04-02"
tags: ["rrweb", "JavaScript", "SDK", "TIL"]
summary: "rrweb을 이용한 DOM 녹화, console/network 인터셉트, Shadow DOM UI 격리, lz-string 압축까지 qaroom SDK 핵심 구현을 정리합니다."
---

## SDK가 하는 일

qaroom SDK는 타겟 앱에 주입되는 JavaScript 라이브러리다. 앱 코드를 거의 건드리지 않고 한 줄로 초기화할 수 있고, 이후에는 백그라운드에서 자동으로 동작한다.

```typescript
import { initQaRoom } from "qaroom-sdk";

initQaRoom({
  viewerBaseUrl: "https://your-viewer.web.app",
  maxMinutes: 3,
});
```

이 한 줄이 실행되면:
- rrweb이 DOM 변경 사항을 기록하기 시작한다
- `console.log/warn/error/info/debug`가 인터셉트된다
- `fetch`와 `XMLHttpRequest`가 래핑된다
- 화면 우하단에 FAB 버튼이 생긴다

---

## rrweb 청크 단위 녹화

처음에는 rrweb을 단순히 `record()`로 시작하고 이벤트를 배열에 쌓았다. 그런데 문제가 생겼다. 30분 이상 녹화하면 이벤트 배열이 수만 개가 되고, 저장 전에 메모리가 부족해지는 경우도 있었다.

해결책은 **롤링 버퍼**였다. `checkoutEveryNms: 60_000` 옵션을 주면 1분마다 전체 DOM 스냅샷을 새로 찍는다. 스냅샷이 찍힐 때 `isCheckout` 플래그가 `true`로 온다.

```typescript
this.stopFn = record({
  emit: (event, isCheckout) => {
    if (isCheckout) {
      // 버퍼 꽉 찼으면 가장 오래된 청크 제거
      if (this.eventChunks.length >= this.maxChunks + 1) {
        this.eventChunks.shift();
      }
      this.eventChunks.push([]);
      this.trimOldLogs();
    }
    this.eventChunks.at(-1)!.push(event);
  },
  checkoutEveryNms: 60_000,
  maskInputOptions: { password: true },
  sampling: {
    mousemove: 50,
    scroll: 150,
    input: "last",
  },
});
```

`eventChunks`는 2차원 배열이다. `maxMinutes = 3`이면 최대 4개 청크(= `maxMinutes + 1`)를 메모리에 유지한다. "기록방 생성" 시점 기준으로 최근 3분치가 항상 보존된다.

`sampling` 옵션도 중요하다. 마우스 이동 이벤트를 50ms 간격으로 샘플링하면 이벤트 수가 기본값(500ms) 대비 훨씬 많아지지만, 재생 영상이 훨씬 자연스러워진다. scroll은 150ms, input은 마지막 값만 기록한다.

---

## console 인터셉트

### 핵심 패턴

초기화 시 `console`의 5개 메서드를 SDK 함수로 교체하고, 원본은 `originalConsole`에 보존한다.

```typescript
private captureConsole() {
  const push =
    (level: "log" | "warn" | "error" | "info" | "debug") =>
    (...args: unknown[]) => {
      const ts = Date.now() - this.recordingStartTime;

      const argsStr = args.map((a) => {
        try {
          if (typeof a === "string") return a.slice(0, 500);
          const s = JSON.stringify(a);
          return s.length > 500 ? s.slice(0, 500) + "…" : s;
        } catch {
          return String(a).slice(0, 500);
        }
      });

      this.consoleLogs.push({ ts, level, args: argsStr });
      this.originalConsole[level].apply(console, args); // 원본 동작 유지
    };

  (console as any).log   = push("log");
  (console as any).warn  = push("warn");
  (console as any).error = push("error");
  (console as any).info  = push("info");
  (console as any).debug = push("debug");
}
```

타임스탬프 `ts`는 **녹화 시작 시점 기준의 상대 ms**다. rrweb 이벤트의 타임스탬프가 절대 ms인데, Viewer에서 재생 시각을 ms로 비교하기 때문에 이 방식이 동기화에 적합하다.

`JSON.stringify`는 순환 참조 객체에서 예외를 던진다. `try/catch`로 `String(a)` 폴백을 적용하지 않으면 콘솔 인터셉트가 앱을 망가뜨리는 최악의 상황이 생길 수 있다. 방어 코딩이 필수다.

---

## fetch 래핑 — res.clone()이 핵심

```typescript
const originalFetch = globalThis.fetch;

globalThis.fetch = function (input, init) {
  const start = Date.now();
  const url = typeof input === "string" ? input
    : input instanceof URL ? input.href
    : (input as Request).url;

  const entry: NetworkLogEntry = {
    ts: Date.now() - self.recordingStartTime,
    url,
    method: (init?.method ?? "GET").toUpperCase(),
    status: 0,
    statusText: "",
    requestHeaders: parseInitHeaders(init),
    requestPayload:
      typeof init?.body === "string" ? init.body.slice(0, 10_000) : undefined,
    responseBody: null,
  };

  self.networkLogs.push(entry);

  return originalFetch.call(this, input, init).then((res) => {
    entry.status    = res.status;
    entry.statusText = res.statusText;
    entry.durationMs = Date.now() - start;
    entry.responseHeaders = headersToRecord(res.headers);

    // 여기가 핵심: clone() 없이 .text()를 호출하면 앱 코드가 같은 Response를 읽지 못한다
    res.clone().text().then((text) => {
      entry.responseBody = text.length > 10_000 ? text.slice(0, 10_000) + "…" : text;
    }).catch(() => {});

    return res; // 원본 Response 반환
  });
};
```

`Response` 바디는 **스트림**이라서 한 번 소비하면 다시 읽을 수 없다. SDK가 `res.text()`를 호출해서 바디를 읽어버리면, 앱 코드에서 `res.json()`을 호출할 때 이미 소비된 스트림이라 에러가 난다.

`res.clone()`으로 복사본을 만들어 SDK가 복사본을 읽고, 원본 `res`는 그대로 반환한다. 이 패턴을 처음 구현할 때 이 부분을 빠뜨려서 타겟 앱의 API 호출이 모조리 망가졌다. 꽤 당황했다.

---

## Shadow DOM — 스타일 격리

FAB 버튼과 모달을 Shadow DOM 안에 렌더링한다. 이 결정이 꽤 중요했다.

만약 일반 DOM에 붙이면:
- 타겟 앱의 `* { box-sizing: border-box; }` 같은 전역 스타일이 SDK UI에 영향을 준다
- SDK 스타일이 타겟 앱의 레이아웃을 깨뜨릴 수 있다
- `z-index` 전쟁이 벌어질 수 있다

```typescript
private initUI() {
  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "bottom:0",
    "right:0",
    "width:0",
    "height:0",
    "pointer-events:none",
    "z-index:2147483647", // 최대 z-index
  ].join(";");
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Shadow DOM 안에서만 유효한 스타일
  const style = document.createElement("style");
  style.textContent = `
    .qa-fab {
      position: fixed;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #2a6ae5;
      cursor: pointer;
      pointer-events: auto;
      /* ... */
    }
  `;
  shadow.appendChild(style);
  // ... 나머지 요소 구성
}
```

`host` 자체는 0×0 크기에 `pointer-events: none`이라 존재 자체가 보이지 않는다. 내부 요소들은 `position: fixed`로 뷰포트에 배치되고, 필요한 요소에만 `pointer-events: auto`를 준다.

Shadow DOM을 처음 쓸 때 가장 헷갈렸던 점은 외부 폰트(`@font-face`)가 Shadow DOM 안에서 적용되지 않는다는 것이다. 이모지만 쓰는 아이콘이나 system-ui 폰트로만 구성하는 게 호환성 면에서 안전하다.

---

## lz-string 압축

rrweb 이벤트는 DOM 트리 전체를 JSON으로 직렬화하므로 크기가 크다. 압축하지 않으면 수 MB에 달하는 경우도 있다.

```typescript
// 저장 (SDK)
const flatEvents = this.eventChunks.flat();
const compressed = LZString.compressToUTF16(JSON.stringify(flatEvents));

// 복원 (Viewer)
const joined = chunks.map((c) => c.data).join("");
const events = JSON.parse(LZString.decompressFromUTF16(joined));
```

`compressToUTF16`을 선택한 이유는 PostgreSQL `text` 컬럼에 바로 저장할 수 있으면서 Base64보다 압축률이 좋기 때문이다. 실제로 10MB짜리 이벤트 JSON이 압축 후 1~2MB 수준으로 줄어드는 것을 확인했다.

---

## 배운 점 정리

- **rrweb 롤링 버퍼**: `checkoutEveryNms`로 일정 간격 스냅샷을 찍고, 오래된 청크를 `shift()`로 제거하면 메모리를 일정하게 유지할 수 있다.
- **fetch 래핑**: `res.clone()`을 빼먹으면 앱 전체 API 호출이 터진다. 절대로 잊지 말 것.
- **console 인터셉트**: `JSON.stringify` 순환 참조 예외 방어 필수.
- **Shadow DOM**: 타겟 앱에 주입되는 SDK UI에는 Shadow DOM이 필수다. 스타일 충돌을 원천 차단한다.
- **타임스탬프**: 콘솔/네트워크 로그를 "녹화 시작 기준 상대 ms"로 저장하면 rrweb 이벤트 타임스탬프와 같은 기준으로 동기화할 수 있다.
