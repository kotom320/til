---
title: "Firebase에서 Supabase로 마이그레이션하기"
date: "2026-04-02"
tags: ["Supabase", "Firebase", "Migration", "TIL"]
summary: "Firestore에서 Supabase(PostgreSQL)로 저장소를 이전하면서 달라진 설계와 코드 변경 포인트를 정리합니다."
---

## 왜 옮겼나

Firebase 프로토타입으로 기본 동작을 확인한 뒤, 세 가지 문제 때문에 Supabase로 이전을 결정했다.

1. **Firestore의 NoSQL 한계**: 심각도/완료 여부로 목록을 필터링하는 복합 쿼리가 번거롭다.
2. **Cloud Functions 유료**: Jira 연동을 위한 서버사이드 함수가 free tier에서 불가능하다.
3. **청크 저장 반복 왕복**: 서브컬렉션에 청크를 하나씩 `addDoc`해야 해서 느리다.

Supabase는 PostgreSQL 기반이라 첫 번째 문제가 사라지고, Edge Function이 free tier에서 동작해 두 번째도 해결된다. 세 번째는 배열 `insert`로 한 번에 처리할 수 있다.

---

## Supabase 기본 사용법

### 클라이언트 생성

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://<project-ref>.supabase.co",
  "<anon-key>",
);
```

`anon key`는 공개해도 되는 클라이언트 키다. Row Level Security(RLS)로 접근 범위를 제어하기 때문에 anon key만으로는 다른 사용자 데이터를 조회·수정할 수 없다. Firebase의 `apiKey`와 비슷한 개념이다.

### 테이블 생성

```sql
-- sessions 테이블
create table sessions (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null default '',
  severity                 text not null default 'high',
  page_url                 text not null default '',
  user_agent               text not null default '',
  console_logs_compressed  text,
  network_logs_compressed  text,
  chunk_count              int  not null default 1,
  done                     boolean not null default false,
  timestamp                timestamptz not null default now()
);

-- session_chunks 테이블
create table session_chunks (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  chunk_index  int  not null,
  data         text not null
);
```

`on delete cascade`를 걸어두면 세션을 삭제할 때 관련 청크도 같이 삭제된다. 이걸 빠뜨리면 고아 청크 데이터가 쌓인다.

---

## Firebase vs Supabase 코드 비교

### 데이터 쓰기

```typescript
// Firebase
const docRef = await addDoc(collection(db, "sessions"), {
  eventsCompressed,
  consoleLogsCompressed,
  userAgent,
  timestamp: serverTimestamp(),
});
const sessionId = docRef.id;

// Supabase
const { data, error } = await supabase
  .from("sessions")
  .insert({ title, severity, console_logs_compressed, user_agent, chunk_count })
  .select("id")
  .single();

if (error) throw error;
const sessionId = data.id;
```

Firebase는 `addDoc`이 `DocumentReference`를 반환한다. Supabase는 `.select("id").single()`로 삽입한 row의 ID를 즉시 받는다.

### 청크 저장

```typescript
// Firebase — 청크마다 addDoc, 순차 반복
for (let i = 0; i < chunks.length; i++) {
  await addDoc(collection(db, "sessions", sessionId, "chunks"), {
    index: i,
    data: chunks[i],
  });
}

// Supabase — 배열 한 번에 insert
await supabase.from("session_chunks").insert(
  chunks.map((data, i) => ({ session_id: sessionId, chunk_index: i, data })),
);
```

Firebase는 청크 개수만큼 네트워크 요청이 발생한다. Supabase는 한 번에 처리한다. 청크가 5개라면 네트워크 요청이 5배 차이난다.

### 데이터 읽기

```typescript
// Firebase
const snap = await getDoc(doc(db, "sessions", sessionId));
const sessionData = snap.data();

// Supabase
const { data: session, error } = await supabase
  .from("sessions")
  .select("*")
  .eq("id", sessionId)
  .single();
```

### 목록 조회

```typescript
// Firebase — 정렬 인덱스 필요
const q = query(
  collection(db, "sessions"),
  orderBy("timestamp", "desc"),
  limit(50),
);
const snap = await getDocs(q);

// Supabase — SQL처럼 자유로운 필터링
const { data } = await supabase
  .from("sessions")
  .select("id, title, severity, page_url, timestamp, done")
  .order("timestamp", { ascending: false })
  .limit(50);

// 심각도 필터 추가도 간단
const { data } = await supabase
  .from("sessions")
  .select("id, title, severity, page_url, timestamp, done")
  .eq("severity", "critical")
  .eq("done", false)
  .order("timestamp", { ascending: false });
```

Firestore에서 복합 필터는 복합 인덱스 생성이 필수다. Supabase(PostgreSQL)는 인덱스 없이도 동작하고, 인덱스는 성능 최적화 용도다.

---

## 레거시 데이터 fallback 처리

마이그레이션 과정에서 Firebase 시절 데이터가 아직 남아 있었다. Viewer에서 두 형식을 모두 처리할 수 있어야 했다.

```typescript
async function loadConsoleLogs(session: SessionRow): Promise<ConsoleLogEntry[]> {
  // 1순위: 압축 컬럼 (현재 Supabase 형식)
  if (session.console_logs_compressed) {
    const raw = LZString.decompressFromUTF16(session.console_logs_compressed);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
  }

  // 2순위: 비압축 컬럼 (초기 Supabase 형식)
  if ((session as any).console_logs) {
    return (session as any).console_logs;
  }

  return [];
}
```

처음에는 Firebase에서 비압축 JSON으로 저장하고, Supabase로 넘어오면서 압축 + 청크 분리를 도입했다. 구 데이터가 새 형식과 섞여 있을 때 `if` 체인으로 순차 폴백하면 두 형식을 모두 처리할 수 있다.

---

## 배운 점

- **Supabase `insert().select().single()`**: 삽입과 ID 조회를 한 번에 처리하는 패턴이 Firebase `addDoc`보다 명시적이다.
- **배열 insert**: 여러 row를 한 번에 삽입할 수 있어 청크 저장에 최적이다. Firebase 서브컬렉션에서 루프 `addDoc`하던 것과 비교하면 훨씬 빠르다.
- **마이그레이션 시 fallback 처리**: 기존 데이터를 한 번에 모두 마이그레이션하기 어려울 때는 Viewer에 구 형식 fallback을 넣어두고 점진적으로 전환하는 게 안전하다.
- **`on delete cascade`**: 외래 키에 cascade를 걸어두지 않으면 부모 row를 삭제해도 자식 row가 남는다. 처음에 빠뜨렸다가 나중에 `ALTER TABLE` 로 추가했다.
