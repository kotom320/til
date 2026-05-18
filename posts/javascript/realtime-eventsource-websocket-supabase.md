---
title: "실시간 데이터 전달 방식 비교: EventSource, WebSocket, Supabase Realtime"
date: "2026-05-18"
tags: ["JavaScript", "EventSource", "WebSocket", "Supabase"]
summary: "세 가지 실시간 방식의 동작 원리와 상황별 선택 기준"
---

## 배경 / 계기

AI 스트리밍 응답, 채팅, DB 변경 감지 등 실시간 기능을 구현할 때 EventSource, WebSocket, Supabase Realtime 중 어떤 걸 써야 할지 정리가 필요했다.

## EventSource (SSE)

**서버 → 클라이언트** 단방향 스트리밍. HTTP 위에서 동작하고 자동 재연결을 내장한다.

```js
const es = new EventSource("/api/stream");

es.onmessage = (e) => console.log(e.data);

es.addEventListener("update", (e) => console.log(e.data)); // 커스텀 이벤트

es.onerror = () => { /* readyState로 상태 확인 */ };

es.close();
```

서버는 `text/event-stream` Content-Type으로 응답하고, 아래 형식으로 데이터를 보낸다.

```
id: 1\n
event: update\n
data: {"count": 42}\n\n
```

- `id`가 있으면 재연결 시 브라우저가 `Last-Event-ID` 헤더를 자동으로 붙여준다.
- `retry: 3000`으로 재연결 간격(ms)을 제어할 수 있다.
- `readyState`: `CONNECTING(0)` / `OPEN(1)` / `CLOSED(2)`

## Supabase Realtime

PostgreSQL의 **논리적 복제(WAL)** 를 기반으로, DB 변경을 WebSocket으로 클라이언트에 전달한다.

```
DB 변경 → WAL → Realtime 서버 → WebSocket → 클라이언트
```

세 가지 채널 타입을 제공한다.

### postgres_changes

테이블 변경(INSERT/UPDATE/DELETE)을 구독한다.

```js
supabase
  .channel("messages")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "messages" },
    (payload) => {
      console.log(payload.eventType); // INSERT | UPDATE | DELETE
      console.log(payload.new);
      console.log(payload.old);
    }
  )
  .subscribe();
```

### broadcast

DB 없이 클라이언트끼리 메시지를 주고받는다. 채팅, 커서 공유 등에 적합하다.

```js
const channel = supabase.channel("room:1");

channel.on("broadcast", { event: "cursor" }, (payload) => {
  console.log(payload);
}).subscribe();

channel.send({ type: "broadcast", event: "cursor", payload: { x: 100, y: 200 } });
```

### presence

채널에 접속 중인 사용자 목록을 동기화한다.

```js
channel.on("presence", { event: "sync" }, () => {
  console.log(channel.presenceState());
}).subscribe();

channel.track({ userId: "abc", status: "online" });
```

**주의:** `postgres_changes`는 RLS를 우회한다. 민감한 테이블은 별도 필터를 적용해야 한다.

React에서는 cleanup을 반드시 처리한다.

```js
useEffect(() => {
  const channel = supabase.channel("...").on(...).subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

## 세 가지 비교

| | EventSource | WebSocket | Supabase Realtime |
|---|---|---|---|
| 방향 | 서버 → 클라이언트 | 양방향 | 양방향 (WebSocket 기반) |
| 프로토콜 | HTTP | ws/wss | WebSocket |
| 자동 재연결 | 내장 | 직접 구현 | 내장 |
| 메시지 타입 | 텍스트만 | 텍스트 + 바이너리 | JSON |
| 구현 복잡도 | 낮음 | 높음 | 낮음 (Supabase 사용 시) |

## 정리

- 단방향 스트리밍(AI 응답, 로그)은 EventSource, 양방향 통신(게임, 협업)은 WebSocket, Supabase 스택이면 Realtime으로 DB 변경·채팅·접속자를 한 번에 처리한다.
