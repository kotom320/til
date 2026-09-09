---
title: "로그인을 붙여도 인가는 하나도 안 된다: Supabase RLS로 멤버십 판정하기"
date: "2026-09-09"
tags: ["Supabase", "PostgreSQL", "RLS", "OAuth"]
summary: "JWT가 아니라 auth.identities를 봐야 하는 이유"
---

## 문제 상황

개인 프로젝트에 디스코드 OAuth 로그인을 붙였다. 원래는 로그인이 없었고, 링크를 아는
사람이면 누구나 들어와서 데이터를 읽고 쓸 수 있었다. RLS 정책이 이랬다.

```sql
create policy items_all on app.items
  for all to anon, authenticated
  using (true) with check (true);
```

그래서 계획이 단순했다. **"로그인 붙이고 정책에서 `anon` 만 빼면 끝"** 이라고 봤다.
한 줄이면 될 줄 알았다.

그런데 `anon` 을 빼서 남는 `to authenticated using (true)` 가 뜻하는 건
"우리 멤버" 가 아니었다.

## 원인 분석

세 겹으로 틀렸고, 셋 다 에러 없이 조용히 지나간다.

### 1. `authenticated` 는 "우리 멤버" 가 아니다

Supabase 프로젝트 하나를 개인 프로젝트 여러 개가 나눠 쓰고 있었다. 테이블 충돌은
전용 스키마로 피했지만 **`auth` 는 스키마로 못 나눈다.** 프로젝트가 같으면
`auth.users` 도 anon 키도 하나다.

그래서 `to authenticated using (true)` 는 이렇게 읽힌다.

> 이 Supabase 프로젝트에 계정이 있는 누구나

다른 앱 사용자가 전부 포함된다. 문턱이 "anon 키를 아는 사람" 에서 "계정이 있는
사람" 으로 옮겨갈 뿐이다.

**인증(로그인했나)과 인가(우리 멤버인가)는 다른 층인데**, 로그인 폼을 붙이는 건
앞의 것만 해준다. 뒤는 한 줄도 안 된다.

### 2. JWT 로는 판정할 수 없다

"그럼 JWT 에서 디스코드 ID 를 꺼내 우리 명단과 대조하자" 가 다음 생각이었다.

```sql
-- 이렇게 하려고 했다
auth.jwt() -> 'user_metadata' ->> 'provider_id'
```

**`user_metadata` 는 사용자가 직접 쓰는 자리다.** `updateUser({ data: … })` 로
아무 값이나 넣을 수 있다. 남의 디스코드 ID 를 적어 넣으면 그대로 통과한다.
자물쇠 옆에 열쇠를 놓는 셈이다.

그럼 `app_metadata.provider` 로 "디스코드로 로그인했나" 를 보면 될까. 실제 계정을
만들어 확인해보니 이렇게 나왔다.

```sql
select raw_app_meta_data, raw_user_meta_data from auth.users;
```

```json
{ "provider": "email", "providers": ["email", "discord"] }
```

**디스코드로 멀쩡히 로그인했는데 `provider` 가 `email` 이다.** 같은 이메일을 쓰는
기존 계정이 있어서 디스코드 신원이 거기 **연결(identity linking)** 됐기 때문이다.
Supabase 는 이메일이 일치하면 새 사용자를 만들지 않고 기존 사용자에 identity 를
붙인다.

`app_metadata.provider === 'discord'` 로 걸었다면 본인부터 못 들어왔을 것이고,
증상이 "디스코드 로그인이 안 되네" 로 보여서 한참 엉뚱한 데를 팠을 것이다.

사용자가 못 쓰는 자리는 **`auth.identities`** 뿐이다. OAuth 제공자가 준 값이 거기 남는다.

### 3. `authenticated` 는 `auth.identities` 를 못 읽는다

그래서 확인부터 했다.

```sql
-- provider_id 가 컬럼에 차 있나, identity_data 안에만 있나
select user_id, provider, provider_id, identity_data->>'provider_id'
from auth.identities where provider = 'discord';

-- 읽을 권한이 있나
select has_table_privilege('authenticated', 'auth.identities', 'select'); -- false
select has_table_privilege('postgres',      'auth.identities', 'select'); -- true
```

`authenticated` 는 **false** 다. 이걸 모르고 평범한 함수로 짰다면 함수가 늘 null 을
돌려주고 **모든 정책이 전부를 막는다.** 증상은 "로그인은 됐는데 화면이 텅 비었다" 라
원인이 안 보인다.

여기에 재귀 문제가 하나 더 붙는다. 모든 테이블 정책이 `members` 를 읽는 함수를
부르는데, `members` 자신의 정책도 같은 함수를 부른다. 그대로 두면 쿼리마다 무한
재귀다.

**`security definer` 가 둘을 동시에 푼다.** 함수가 소유자(`postgres`) 권한으로 돌면
`auth.identities` 를 읽을 수 있고, 본문 안의 읽기에는 정책이 다시 안 걸려서 고리가
끊긴다.

## 해결 방법

함수를 둘로 나눴다. **뜻이 다르기 때문이다.**

```sql
-- "이 세션이 우리 명단의 누구냐" = 신원
create or replace function app.my_member_id() returns uuid
language sql
stable
security definer                        -- authenticated 는 auth.identities 를 못 읽는다
set search_path = app, auth, pg_catalog -- definer 함수에는 반드시 같이 건다
as $fn$
  select m.id
  from auth.identities i
  join app.members m on m.discord_user_id = i.provider_id
  where i.user_id = auth.uid()
    and i.provider = 'discord'
$fn$;

-- "지금 들어와도 되느냐" = 권한
create or replace function app.is_member() returns boolean
language sql
stable
security definer                        -- 정책이 부르는 건 이쪽이라 여기도 필요하다
set search_path = app, pg_catalog
as $fn$
  select exists (
    select 1 from app.members
    where id = app.my_member_id() and active
  );
$fn$;

grant execute on function app.my_member_id() to authenticated;
grant execute on function app.is_member() to authenticated;
```

정책은 `is_member()` 를 본다.

```sql
create policy items_all on app.items
  for all to authenticated
  using (app.is_member()) with check (app.is_member());
```

`set search_path` 를 빼면 안 된다. `security definer` 함수에서 이걸 생략하면 호출자가
검색 경로를 갈아끼워 다른 스키마의 테이블을 보게 만들 수 있다.

### 함수를 둘로 나눈 값

처음엔 `is_member()` 를 `my_member_id() is not null` 한 줄로 뒀다가 갈랐는데,
그 분리가 두 번 값을 했다.

**화면 문구를 가른다.** 명단에 아예 없는 사람과 잠시 비활성인 사람에게 같은 말을 하면
안 된다. 뒤쪽에게 "당신은 멤버가 아닙니다" 는 틀린 말인 데다 무엇을 해야 하는지도
안 알려준다.

```ts
const [{ data: memberId }, { data: allowed }] = await Promise.all([
  supabase.rpc("my_member_id"),
  supabase.rpc("is_member"),
]);

if (!memberId) return <Blocked title="멤버가 아니에요" />;
if (!allowed) return <Blocked title="잠시 비활성 상태예요" canReactivate />;
```

**비활성 상태에서 자기 id 를 얻는 길이 된다.** 비활성이면 정책이 막아서 자기 행을
스스로 못 고친다. 그래서 좁은 함수를 하나 더 뚫었는데, 그게 `my_member_id()` 를
받는다. `active` 를 안 보게 해둔 값이 여기서 쓰인다.

```sql
create or replace function app.reactivate() returns boolean
language plpgsql
security definer
set search_path = app, pg_catalog
as $fn$
declare
  mid uuid;
begin
  mid := app.my_member_id();
  if mid is null then return false; end if;
  update app.members set active = true where id = mid;
  return true;
end;
$fn$;
```

**인자를 안 받는다.** 항상 세션의 자기 행만 건드려서 남의 행을 바꿀 길이 없다.

## 왜 이 방법인가

`members.auth_user_id` 컬럼을 두고 첫 로그인 때 도장을 찍는 안도 있었다. 접었다.
아직 안 찍힌 행을 찍을 권한이 필요한데, **그 권한이면 남이 남의 자리를 먼저 차지할 수
있다.** 서버가 대신 찍어주려면 `service_role` 키가 필요한데 그건 RLS 를 통째로
우회하는 값이라 쓰고 싶지 않았다.

`auth.identities` 를 보는 방식은 실행 중에 아무것도 안 쓴다. 스키마가 명단을 미리
심어두면 끝이라 닭과 달걀이 없다.

## 배포하고 확인한 것

정책이 실제로 막는지는 밖에서 두들겨봐야 안다. 배포된 번들에서 anon 키를 꺼내
직접 REST 를 쳤다.

```bash
curl -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
     -H "Accept-Profile: app" \
     "https://your-project.supabase.co/rest/v1/members?select=name"
# []

curl -X PATCH -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Profile: app" -H "Content-Type: application/json" \
     -d '{"active":false}' \
     "https://your-project.supabase.co/rest/v1/members?name=eq.someone"
# []
```

키를 알아도, 스키마와 테이블 이름을 정확히 알아도 빈 배열이다. 여기까지 봐야
"로그인을 붙였다" 가 아니라 "막았다" 가 된다.

## 정리

**로그인 폼은 인증이고, `using (true)` 는 인가를 하나도 안 한다.** 정책이 세션의
무엇을 보는지까지 정해야 끝난다.

그리고 이 판정을 **JWT 에 걸지 말 것.** `user_metadata` 는 사용자가 쓰는 자리고,
`app_metadata.provider` 는 identity linking 이 일어나면 거짓말을 한다. 사용자가 못
쓰는 자리는 `auth.identities` 뿐이고, `authenticated` 롤은 그걸 못 읽어서
`security definer` + `set search_path` 가 따라온다.

이번에 걸린 건 전부 **조용한 실패**였다. 틀려도 에러가 안 나고 "화면이 텅 비었다",
"이 사람만 로그인이 안 된다" 로만 보인다. 그래서 짐작을 하나씩
`has_table_privilege`, `select raw_app_meta_data` 같은 쿼리로 사실로 바꿔가며 갔다.
인증 코드에서는 그게 제일 빠른 길이었다.
