---
title: "만들다 만 자동화를 한 레포로 모으고, 쓰는 화면을 붙이기까지"
date: "2026-09-28"
tags: ["Claude Code", "Next.js", "PostgreSQL", "회고"]
summary: "흩어진 AI 자동화를 workbench 하나로 모은 회고"
---

## 계기: 머릿속 작업 흐름을 그래프로 보고 싶었다

프론트 작업은 대략 이렇게 흘러간다.

```
Jira 티켓 → Figma(Code Connect) → 구현 → Codex 리뷰 → Playwright QA → PR → 머지 → (머지 후 버그)
```

단계마다 Claude 스킬, 자동 리뷰 봇, 매일 아침 브리핑 같은 걸 하나씩 붙여 왔다. 그런데 어디가 잘 돌고 어디가 비는지는 감으로만 알았다. "그래프로 그려 보면 보이지 않을까"에서 시작했는데, 막상 그리려고 보니 문제가 따로 있었다.

- 리뷰 봇, 공유 컨텍스트, 봇 지식, 브리핑이 **레포 네 개와 폴더 여러 곳**에 흩어져 있었다
- 브리핑은 최근 24번 중 13번이 실패했다. 원인은 OAuth 만료와 cron 이 잠자는 Mac 에서 실행을 놓친 것
- 성공해도 잘 안 봤다. 느리고, 토큰을 많이 쓰고, 쓸데없이 깊게 파고들었다
- "좋다고 해서" 따라 만든 실험(개인 비서, 스프린트 보드, 노트 연동)이 반쯤 만든 채 남아 있었다

그래서 그래프보다 먼저 **정리하고, 모으고, 실제로 쓰는 화면을 붙이는 것**부터 했다.

## 1. 한 레포로 모은다: workbench

사내 레퍼런스 레포 구조를 참고해 `workbench` 하나로 합쳤다.

```
workbench/
├── setup.sh        # 설치 진입점: 심링크 + launchd 등록
├── skills/         # ~/.claude/skills 로 심링크
├── automation/     # 브리핑·배포 점검 + launchd plist
├── review-bot/     # 동료 PR 자동 리뷰 봇 (프롬프트·지식·로그)
├── context/        # 레포 공통 CLAUDE.md, 공유 메모리, 도메인 wiki
├── observatory/    # 작업 기록 적재기 + PostgreSQL(Docker)
└── web/            # 화면 (Next.js 16)
```

핵심은 **원래 경로를 전부 심링크로 이 레포에 연결**한 것이다. 파일을 고치면 저장하는 순간 모든 세션에 반영된다. 편하지만 위험하기도 해서 `CLAUDE.md` 맨 위에 경고를 적어 두었다.

`setup.sh` 는 여러 번 돌려도 안전하게 만들었다.

```bash
# 심링크 자리에 실제 폴더가 있으면 지우지 않고 건너뛴다 (옛 스크립트가 실제 폴더를 지운 적이 있다)
if [ -e "$dst" ] && [ ! -L "$dst" ]; then
  echo "건너뜀: $dst 는 실제 폴더다"; continue
fi

# plist 가 바뀌지 않았고 이미 올라가 있으면 다시 올리지 않는다
if cmp -s "$src" "$dst" && launchctl print "gui/$(id -u)/$label" >/dev/null 2>&1; then
  continue
fi
```

## 2. cron 대신 launchd

노트북에서 cron 은 잠든 사이에 지나간 시각을 **그냥 건너뛴다**. launchd 의 `StartCalendarInterval` 은 깨어났을 때 놓친 실행을 한 번 돌려 준다. 브리핑 실패 13건 중 상당수가 이 문제였다.

옮기면서 두 번 막혔다.

- `bootout` 직후 바로 `bootstrap` 하면 `Bootstrap failed: 5` 가 난다. 내려가는 걸 기다린 뒤 올려야 한다
- `KeepAlive` 작업은 `RunAtLoad` 가 기대만큼 안 뜰 때가 있어 `launchctl kickstart -k` 로 확실히 띄운다

## 3. 왜 DB 를 띄웠나: 배움이 목적이었다

처음엔 "파일이면 충분한데 DB 가 필요한가?"가 궁금했다. 솔직한 답은 **꼭 필요하진 않다**였다. 원본은 대부분 파일(세션 기록, GitHub, 봇 로그)이고 DB 는 거기서 뽑은 사본이다.

그래도 서버 작업을 배우고 싶었고, 머릿속에 그린 건 "화면에서 버튼을 누르면 API 를 부르고, DB 가 바뀌고, 화면이 다시 그려지는" CRUD 였다. 그래서 규칙을 하나 정했다.

> DB 는 사본이라 지우고 다시 적재해도 된다. **단, 사람이 화면에서 입력한 데이터는 DB 에만 있는 원본**이다. 적재가 끝날 때마다 CSV 로 내보내 git 에 커밋한다.

```yaml
# docker-compose.yml: 프로젝트 이름을 고정해야 폴더를 옮겨도 볼륨이 이어진다
name: work-observatory
services:
  db:
    image: postgres:17-alpine
    ports: ["5433:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
```

## 4. 만든 API 를 아무도 안 부르고 있었다

한동안 API 를 만들어 놓고 "만들었다"고 생각했는데, 확인해 보니 **어떤 페이지도 부르지 않았다**. 서버 컴포넌트가 DB 를 직접 읽고 있었기 때문이다. 그래서 브라우저가 실제로 부르는 API 세 개를 만들었다.

| 기능 | API | 배운 것 |
|---|---|---|
| 머지 후 버그 판정 | `PUT/DELETE /api/followups/.../verdict` | 멱등 PUT(upsert), DELETE 는 없어도 204 |
| 정기 작업 수동 실행 | `POST /api/jobs/[job]/runs` | 오래 걸리는 작업은 `202` + `Location` |
| 스프린트 스토리 분류 | `PUT/DELETE /api/triage/[key]` | 낙관적 업데이트 + `router.refresh()` |

오래 걸리는 작업은 응답을 기다리게 하지 않고, 실행 기록 주소를 돌려준 뒤 화면이 폴링한다.

```ts
// app/api/jobs/[job]/runs/route.ts
export async function POST(request: NextRequest, ctx: RouteContext<'/api/jobs/[job]/runs'>) {
  const denied = forbidden(request); // CSRF 검사, 아래에서 설명
  if (denied) return Response.json({ error: denied }, { status: 403 });

  const { job } = await ctx.params; // Next.js 16: params 는 Promise
  const def = findJob(job);
  if (!def) return Response.json({ error: '그런 작업이 없다' }, { status: 404 });
  if (!def.run) return Response.json({ error: `수동 실행 대상이 아니다: ${def.name}` }, { status: 400 });

  try {
    const run = await startRun(def); // detached spawn 후 바로 돌아온다
    return Response.json({ run }, { status: 202, headers: { Location: `/api/jobs/${job}/runs/${run.id}` } });
  } catch (e) {
    if (e instanceof JobConflictError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
```

```ts
// 화면: 끝날 때까지 폴링. 다른 탭을 보고 있어도 계속 확인한다
const { data: run } = useQuery({
  queryKey: ['run', runId],
  queryFn: () => fetch(`/api/jobs/${job}/runs/${runId}`).then((r) => r.json()),
  enabled: !!runId,
  refetchInterval: (q) => (q.state.data?.status === 'running' || !q.state.data ? 2000 : false),
  refetchIntervalInBackground: true,
});
```

### localhost 서버에도 CSRF 는 있다

`127.0.0.1` 에만 띄운 서버라도, 내가 연 아무 웹페이지가 `fetch('http://127.0.0.1:3100/api/jobs/.../runs', { method: 'POST' })` 를 보낼 수 있다. 작업 실행은 명령을 돌리는 API 라 막아야 한다.

처음엔 Origin 을 `req.nextUrl.origin` 과 비교했는데 **정상 요청도 403** 이 났다. 서버가 아는 자기 주소와 브라우저가 보낸 Origin 이 달랐다. `Host` 헤더와 비교하니 맞았다.

```ts
function forbidden(request: NextRequest) {
  // 다른 출처에서 커스텀 헤더를 붙이면 브라우저가 preflight 로 먼저 묻는데, 이 서버는 허락하지 않는다
  if (request.headers.get('x-workbench-request') !== '1') return '전용 헤더가 필요하다';
  const origin = request.headers.get('origin');
  if (origin) {
    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      return 'Origin 형식이 잘못됐다';
    }
    // nextUrl.origin 이 아니라 브라우저가 실제로 접속한 Host 헤더와 비교한다
    if (host !== request.headers.get('host')) return '다른 출처에서 온 요청은 받지 않는다';
  }
  return null;
}
```

## 5. LLM 이 받아 적은 데이터는 조용히 잘린다

회사에서 Atlassian API 토큰 발급을 막아 두어서, Jira 조회는 `claude -p` 로 MCP 를 부르는 방식으로 한다. 비용 때문에 haiku 를 썼는데, 세 번 서로 다른 방식으로 틀렸다.

1. 스토리 조회에서 **31개 키를 통째로 빠뜨렸다**
2. 하위 작업 125건 중 **100건에서 멈췄다** (첫 페이지만 받고 끝)
3. 결과를 파일에 쓰지 않고 **표준출력에만 늘어놓았다**

셋 다 **오류 없이** 끝났다는 게 문제다. 그래서 LLM 은 조회 통로로만 쓰고, 판단과 검증은 코드가 한다.

```ts
// 조회 결과에 전체 건수를 같이 적게 하고, 받은 수와 맞춰 본다
for (const k of ['stories', 'subtasks', 'mine', 'alpha'] as const) {
  const total = d.counts?.[k];
  if (typeof total !== 'number') return `counts.${k} 가 없다`;
  if (new Set(d[k].map((i) => i.key)).size !== total) return `${k} 를 ${d[k].length}건만 받았다. 전체는 ${total}건이다`;
}
```

```ts
try {
  data = await fetchWith('haiku');
} catch (e) {
  console.warn(String(e), '→ sonnet 으로 다시 받는다'); // 틀리면 한 단계 위 모델로 한 번 더
  data = await fetchWith('sonnet');
}
```

### 건수를 세는 호출을 없애 Jira 호출을 거의 절반으로

처음엔 조회마다 `searchResultMode: "count"` 로 건수를 먼저 세고 이슈를 따로 받았다. 회사 Jira 호출 한도가 초과됐다는 공지를 보고 다시 보니 `"all"` 모드가 **이슈, `totalCount`, `nextPageToken` 을 한 번에** 준다.

```json
{ "issues": [ ...100건... ], "totalCount": 125, "isLast": false, "nextPageToken": "..." }
```

한 가지 함정: 기본 모드에서 `.issues` 는 `{ nodes, pageInfo }` 객체인데 `all` 모드에서는 **배열**이다. 프롬프트에 둘 다 꺼내는 방법을 적어 두었다.

```bash
jq '.issues | if type == "array" then . else .nodes end'
```

새로고침 한 번에 Jira 호출이 9번에서 5번으로 줄었고, 건수 검증은 그대로 유지된다.

## 6. 방향을 바로잡은 두 번의 피드백

**"잘한 것 / 약한 것 / 놓친 것은 화면에 표기할 게 아니다."** 처음엔 지표 옆에 자동 판정을 붙였다. 하지만 원한 건 판정이 아니라 **내가 보고 판단할 지표**였다. 자동 판정을 걷어내고 중립적인 지표 14개로 바꿨다. 예를 들어 머지 후 머지 후 버그 비율 18.5% → 8.0%, 단계별 사용률 QA 95% · Codex 66% · Figma 38% 같은 숫자만 보여 준다.

**"초점이 리뷰에만 맞춰져 있다."** 데이터가 풍부한 리뷰 봇 쪽으로 자꾸 기울었다. 원래 목적은 Jira 부터 머지 후 버그까지 **파이프라인 전체**였다. 데이터가 많은 곳이 아니라 질문이 있는 곳을 봐야 한다.

같은 맥락에서 첫 화면 이름도 "오늘"에서 **"이번 스프린트"** 로 바꿨다. 실제로 하루 종일 띄워 두고 보는 건 이번 스프린트에서 내가 할 스토리, 갑자기 배정된 티켓, QA 가 올린 버그였다. 안 해도 되는 스토리는 버튼으로 표시하면 DB 에 기록되고 목록에서 빠진다.

## 7. 처음 떠올린 그림은 CodePipeline 이었다

지표를 다 만들고 나서야 원래 보고 싶던 모양이 뭔지 말로 나왔다. AWS CodePipeline 처럼 **작업 하나가 단계를 옆으로 지나가고, 칸을 누르면 자세히 나오는 화면**이었다. 지표 14개는 "평균적으로 어떤가"에 답하지만, "이 PR 은 어디를 거쳤나"에는 답하지 못한다.

그래서 한 줄을 실행 한 번(PR 하나, 아직 PR 이 없으면 티켓 하나)으로 보고 8칸을 늘어놓았다.

```
Jira → Figma → 구현 → Codex → QA → PR → 머지 → 머지 후 버그
```

API 는 목록과 상세 두 개다. 줄을 누를 때만 상세를 불러온다.

```ts
// 목록: 칸 상태만. 상세: 세션별 기록, 단계별 도구 호출 수, PR 크기, 머지 후 버그
GET /api/pipeline/runs
GET /api/pipeline/runs/{id}   // id 는 `repo~pr` 이나 티켓 키

const { data: run } = useQuery({ queryKey: ['pipeline-runs', id], queryFn: () => fetchRun(id) });
```

칸 상태를 정하면서 틀리기 쉬운 곳이 세 군데 있었다.

- **기록 없음과 건너뜀은 다르다.** 세션 기록은 8월 31일부터만 온전하다. 그 전 PR 을 넣으면 모든 칸이 "건너뜀"으로 보여 아무것도 안 한 것처럼 읽힌다. 기록이 시작된 날 이후 PR 만 보여 준다
- **머지 후 버그는 세 가지 상태다.** 머지 뒤 14일이 안 지났으면 "관찰 중", 그 안에 내 줄을 고친 버그 수정 PR 이 있으면 "실패", 14일이 무사히 지나면 "완료". 사람이 "우연"으로 판정한 건은 빼야 지표와 같은 숫자가 나온다
- **티켓 키로만 묶으면 놓친다.** 상위 티켓(`PROJ-100`) 브랜치에서 하위 티켓(`PROJ-201`, `PROJ-202`) 이름으로 PR 을 올렸더니, 끝난 일이 "진행 중"으로 남았다. 티켓 키가 달라 PR 을 못 찾은 것이다. 세션이 PR 을 만든 기록(`session_prs`)도 같이 보게 고쳤다

```sql
-- PR 없는 티켓만 "진행 중". 티켓 키가 같은 PR 도 없고, 그 티켓의 세션이 만든 PR 도 없어야 한다
AND NOT EXISTS (SELECT 1 FROM my_prs p WHERE p.ticket_key = s.ticket_key)
AND NOT EXISTS (SELECT 1 FROM sessions s2 JOIN session_prs sp USING (session_id) WHERE s2.ticket_key = s.ticket_key)
```

### 이름은 이미 쓰는 도구의 말을 빌린다

처음 붙인 이름은 "작업 노선도", "돌아온 버그", "거침 · 지금 여기 · 지켜보는 중 · 문제"였다. 만든 사람은 알지만 처음 보면 한 번 더 생각해야 한다. 더 그럴듯한 새 이름을 짓는 대신 **매일 보는 도구의 말을 그대로** 가져왔다.

| 전 | 후 | 어디서 빌렸나 |
|---|---|---|
| 작업 노선도 | 파이프라인 | CodePipeline |
| 돌아온 버그 | 머지 후 버그 | GitHub 의 "머지" |
| 이슈 파악 | Jira | 옆 칸이 전부 도구 이름이다 |
| 거침 · 지금 여기 · 지켜보는 중 · 문제 · 아직 | 완료 · 진행 중 · 관찰 중 · 실패 · 대기 | GitHub Actions 의 실행 상태 |

새로 지은 이름이 조금 더 정확해도, 익숙한 이름이 설명 없이 읽힌다.

### 안 쓰는 자동화는 지운다

스프린트 종료 때마다 alpha 배포 전 점검을 돌리는 자동화가 있었다. 기록을 보니 넉 달 동안 실제 점검은 4번이었고, 최근 두 번은 GitHub 인증이 만료돼 절반만 확인했다. 컷 주가 아닌 주에도 날짜를 보려고 매주 Jira 를 불러 할당량만 썼다. 리포트를 열어 본 기억도 없었다. launchd 등록, Orca 자동화, 코드, 지난 리포트까지 지웠다. 필요하면 git 기록에서 되살리면 된다.

## 정리

**흩어진 자동화는 모으고, 만든 API 는 실제로 부르게 하고, LLM 이 가져온 데이터는 건수로 검증한다.** 그리고 원하는 화면이 떠오르면 이미 아는 도구(CodePipeline)의 모양과 말을 빌린다.
