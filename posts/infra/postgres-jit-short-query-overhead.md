---
title: "PostgreSQL JIT 가 28ms 쿼리에 200ms 컴파일을 붙인 이유"
date: "2026-10-29"
tags: ["PostgreSQL", "JIT", "성능", "TIL"]
summary: "비용 추정이 부풀면 짧은 쿼리도 JIT 컴파일한다"
---

## 문제 상황

개인 대시보드(Next.js 서버 컴포넌트 + PostgreSQL 17)의 한 탭만 열리는 데 7초가 걸렸다. 다른 탭은 0.3초 안에 열렸다.
로딩 UI(`loading.tsx`)를 붙여 멈춘 것처럼 보이는 건 막았지만, 7초 자체는 그대로라 쿼리를 하나씩 재 봤다.

| 쿼리 | 1회 시간 |
|---|---|
| `pr_pipeline` 뷰를 읽는 쿼리 | 약 340ms |
| 나머지 (테이블 직접 조회) | 1~3ms |

느린 쿼리는 지표 6개가 주별 추이를 그리느라 주 단위로 따로 돌린다. 지표마다 11번씩, 다른 조회까지 합쳐 67번이다.
67번 × 340ms 를 커넥션 4개로 나누면 약 6초로, 측정한 7초와 거의 맞았다.

## 원인 분석

`EXPLAIN ANALYZE` 끝에 답이 있었다.

```text
Nested Loop  (cost=0.27..1170165.51 rows=78970 ...) (actual ... rows=172 loops=1)
  Join Filter: (ANY (... hashed SubPlan 2 ...)) OR (ANY (... hashed SubPlan 4 ...))
...
JIT:
  Functions: 39
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 1.1 ms, Inlining 19.1 ms, Optimization 95.1 ms, Emission 87.5 ms, Total 202.8 ms
Execution Time: 231.289 ms
```

- 실제 작업은 30ms 정도인데 **JIT 컴파일에 203ms** 를 썼다
- 뷰 안의 조인 조건이 `EXISTS (...) OR EXISTS (...)` 였다. 플래너가 이 `OR` 의 선택도를 못 맞혀 결과를 **78,970줄로 예상**했다. 실제로는 172줄이었다
- 그래서 비용 추정이 약 117만이 됐고, JIT 기준 세 개를 모두 넘었다. 인라이닝과 최적화까지 켜져 컴파일이 가장 비싼 단계로 갔다

| 설정 (PG 17 기본값) | 값 | 넘으면 |
|---|---|---|
| `jit_above_cost` | 100,000 | JIT 컴파일 |
| `jit_inline_above_cost` | 500,000 | 작은 함수 인라이닝 |
| `jit_optimize_above_cost` | 500,000 | LLVM 최적화 |

같은 쿼리를 한 커넥션에서 5번씩 돌려 비교했다. 컴파일 결과를 재사용하지 않아서 매번 똑같이 느렸다.

| | 평균 |
|---|---|
| `SET jit = on` | 355ms |
| `SET jit = off` | 20ms |

### JIT 가 뭔가

PostgreSQL 은 `WHERE` 조건이나 집계 같은 표현식을 범용 인터프리터로 평가한다. JIT 는 쿼리 실행 직전에 그 쿼리 전용 기계어를 LLVM 으로 만들어 쓴다.
공식 문서 기준으로 빨라지는 건 두 가지다.

- **표현식 평가**: `WHERE a.col = 3` 을 범용 평가기 대신 그 조건 전용 함수로 돌린다
- **튜플 디포밍**: 디스크의 행을 메모리 표현으로 풀 때, 테이블 구조에 맞춘 전용 함수를 쓴다

### 왜 켜져 있었나

누가 켠 게 아니라 기본값이었다. 설정 파일에 손댄 적 없는 `postgres:17-alpine` 이미지라 `pg_settings.source` 가 전부 `default` 였다.
JIT 는 PostgreSQL 12 부터 LLVM 지원으로 빌드됐으면 기본으로 켜졌고, 이 이미지는 LLVM 지원이 들어 있었다(`pg_jit_available()` = `true`).

그런데 2026-04 PostgreSQL master 에 **"jit: Change the default to off"** 커밋이 들어갔다. 커밋 메시지의 요지는 이렇다.

- 짧은 쿼리에서는 컴파일 비용이 이득보다 클 수 있다
- JIT 를 쓸지는 비용 추정 하나로 정하는데, LLVM 컴파일이 얼마나 비싼지 믿을 만한 추정이 없다
- INSERT 몇 줄 같은 사소한 변화로 비용이 기준을 넘으면 갑자기 느려진다
- 그래서 대형 배포는 이미 대부분 꺼서 쓰고, 하이퍼스케일러는 전부 끈다

이번 경우가 정확히 그 "갑자기 느려지는" 사례였다.

### 장단점

| | 장점 | 단점 |
|---|---|---|
| JIT 켬 | 수백만 행을 훑는 CPU 바운드 분석 쿼리가 빨라진다 | 컴파일 비용이 쿼리마다 든다(재사용 없음). 쓸지 말지를 비용 추정에만 맡겨서, 추정이 틀리면 짧은 쿼리가 수십 배 느려진다 |
| JIT 끔 | 짧은 쿼리 시간이 예측 가능해진다 | 진짜 큰 분석 쿼리는 JIT 이득을 못 본다 |

## 해결 방법

이 DB 는 대시보드 전용이고 데이터가 수천 줄 규모라 JIT 이득이 없다. 앱의 커넥션에서만 껐다.

```ts
import { Pool } from 'pg';

// 커넥션을 열 때 세션 설정으로 jit=off 를 넘긴다
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4, options: '-c jit=off' });
```

결과는 페이지 응답 7.2초 → 0.4초.

범위를 넓히거나 좁히는 다른 방법도 있다.

```sql
-- 이 DB 에 붙는 모든 세션
ALTER DATABASE mydb SET jit = off;
-- 특정 사용자만
ALTER ROLE dashboard_app SET jit = off;
-- 끄지 않고 기준만 올리기
ALTER DATABASE mydb SET jit_above_cost = 10000000;
```

## 왜 이 방법인가

- **`jit_above_cost` 올리기**: JIT 를 남겨 두고 큰 쿼리만 쓰게 하는 절충안이다. 하지만 이번처럼 추정이 수백 배 틀리면 기준을 어디에 두든 다시 넘을 수 있다
- **뷰를 고쳐 추정 바로잡기**: `OR` 조인을 `UNION` 으로 나누면 예상 줄 수가 실제에 가까워진다. 근본 원인을 고치는 방법이지만 손이 더 간다. JIT 를 끈 뒤에는 쿼리 자체가 20ms 라 급하지 않다
- **주별 쿼리를 하나로 합치기**: 67번을 몇 번으로 줄일 수 있지만 집계 코드 구조를 바꿔야 한다

데이터가 작고 분석 쿼리도 없는 앱이라, 한 줄로 끝나고 PostgreSQL 업스트림의 새 기본값과도 같은 "끄기"를 골랐다.

## 정리

`EXPLAIN ANALYZE` 맨 끝에 `JIT: ... Total` 이 실행 시간보다 크면, 비용 추정이 부풀어 짧은 쿼리가 JIT 컴파일을 하고 있는 것이다. 작은 DB 라면 `jit=off` 가 정답일 때가 많다.

참고

- [PostgreSQL 17 문서: When to JIT?](https://www.postgresql.org/docs/17/jit-decision.html)
- [PostgreSQL 17 문서: What Is JIT compilation?](https://www.postgresql.org/docs/17/jit-reason.html)
- [pgsql-committers: jit: Change the default to off (2026-04-02)](https://www.postgresql.org/message-id/E1w8GWU-002bSL-31%40gemulon.postgresql.org)
- [Adam Johnson: Django, maybe disable PostgreSQL's JIT](https://adamj.eu/tech/2023/11/09/django-disable-postgresql-jit/)
