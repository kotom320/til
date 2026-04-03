---
title: "브라우저에서 Jira API를 못 쓰는 이유 — CORS와 Supabase Edge Function"
date: "2026-04-02"
tags: ["Jira", "CORS", "Supabase Edge Function", "Deno", "TIL"]
summary: "브라우저에서 Atlassian API 호출 시 CORS에 막히는 이유와, Supabase Edge Function을 프록시로 사용해 해결한 방법을 정리합니다."
---

## 문제: 브라우저에서 Jira API 호출이 안 된다

qaroom SDK에서 Jira 이슈를 자동 생성하는 기능을 만들려고 처음 시도한 방법은 단순했다. 브라우저에서 직접 Jira REST API를 `fetch`로 호출하는 것이었다.

```typescript
const response = await fetch(
  "https://your-domain.atlassian.net/rest/api/3/issue",
  {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa("user@example.com:api-token")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: { ... } }),
  }
);
```

결과는 즉시 실패였다.

```
Access to fetch at 'https://your-domain.atlassian.net/rest/api/3/issue'
from origin 'https://my-viewer.web.app' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## CORS가 왜 막히는가

CORS(Cross-Origin Resource Sharing)는 브라우저가 **다른 출처(origin)의 리소스**를 요청할 때 적용하는 보안 정책이다.

브라우저는 출처가 다른 서버로 `fetch`나 `XMLHttpRequest`를 보낼 때, 먼저 `OPTIONS` 메서드로 **preflight 요청**을 보낸다. 서버가 응답 헤더에 `Access-Control-Allow-Origin`을 포함시켜야만 브라우저가 본 요청을 진행한다.

```
브라우저                           Atlassian 서버
   │                                   │
   ├── OPTIONS /rest/api/3/issue ──────→│
   │                                   │ (Access-Control-Allow-Origin 없음)
   │←── 200 OK (하지만 CORS 헤더 없음) ─┤
   │                                   │
   ✗ 브라우저가 본 요청 차단
```

Atlassian은 특정 서드파티 Origin에서 오는 직접 API 호출을 허용하지 않는다. 설령 허용된다 해도, **API 토큰을 브라우저 코드에 넣는 것 자체가 보안 위반**이다. 소스 코드를 보면 누구나 토큰을 확인할 수 있다.

서버에서 호출하면 CORS 제약이 없다. 서버 간 통신은 브라우저의 Same-Origin Policy 대상이 아니다. 그래서 **서버사이드 프록시**가 필요하다.

---

## 해결책: Supabase Edge Function

선택지를 비교했다.

| 방안 | 특징 |
|------|------|
| 사내 백엔드 서버 추가 | 추가 인프라 필요, 운영 부담 |
| Supabase Edge Function | 이미 Supabase 사용 중, 추가 인프라 없음, free tier 지원 |
| Atlassian OAuth 2.0 | 공식 방법이지만 구현 복잡, 사용자마다 인증 필요 |

이미 Supabase를 DB로 쓰고 있어서 Edge Function이 가장 자연스러운 선택이었다. 별도 서버를 추가하지 않아도 되고, Jira 토큰은 Supabase Secrets에 보관되어 절대 브라우저에 노출되지 않는다.

---

## Deno 런타임이란

Supabase Edge Function은 **Deno** 런타임 위에서 실행된다. Node.js와 비슷하지만 몇 가지 차이가 있다.

- `npm install` 대신 URL 임포트 또는 `npm:` 프리픽스를 사용한다
- TypeScript를 기본으로 지원한다
- `Deno.env.get()`으로 환경 변수에 접근한다
- 기본 보안 모델로 파일 시스템, 네트워크 등 권한을 명시적으로 부여해야 한다

```typescript
// Node.js
import { something } from "some-package"; // node_modules에서 로드

// Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // URL에서 로드
// 또는
import { createClient } from "npm:@supabase/supabase-js"; // npm 패키지
```

---

## Edge Function 핵심 코드

```typescript
// supabase/functions/create-jira-issue/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const JIRA_BASE = Deno.env.get("JIRA_BASE_URL")!;
const EMAIL     = Deno.env.get("JIRA_EMAIL")!;
const TOKEN     = Deno.env.get("JIRA_TOKEN")!;
const PROJECT   = Deno.env.get("JIRA_PROJECT_KEY")!;
const ALLOWED   = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",");

// Jira API 공통 요청 헬퍼
async function jiraFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${JIRA_BASE}/rest/api/3${path}`, {
    ...init,
    headers: {
      "Authorization": `Basic ${btoa(`${EMAIL}:${TOKEN}`)}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = ALLOWED.includes(origin)
    ? { "Access-Control-Allow-Origin": origin }
    : {};

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
      },
    });
  }

  try {
    const action = new URL(req.url).searchParams.get("action");

    if (req.method === "GET" && action === "meta") {
      // 우선순위, 담당자 목록, 현재 사용자 조회
      const [priorities, users, myself] = await Promise.all([
        jiraFetch("/priority"),
        jiraFetch(`/user/assignable/search?project=${PROJECT}&maxResults=50`),
        jiraFetch("/myself"),
      ]);
      return Response.json({ priorities, users, myself }, { headers: corsHeaders });
    }

    if (req.method === "POST") {
      const { summary, description, priorityId, assigneeId, viewerUrl } =
        await req.json();

      const issue = await jiraFetch("/issue", {
        method: "POST",
        body: JSON.stringify({
          fields: {
            project:     { key: PROJECT },
            summary,
            description: buildAdf(description, viewerUrl),
            issuetype:   { name: "Bug" },
            priority:    { id: priorityId },
            assignee:    { accountId: assigneeId },
          },
        }),
      });

      return Response.json(
        { key: issue.key, url: `${JIRA_BASE}/browse/${issue.key}` },
        { headers: corsHeaders },
      );
    }

    return new Response("Not Found", { status: 404 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: corsHeaders });
  }
});
```

Edge Function은 두 가지 역할을 한다.
- `GET ?action=meta`: 모달 열릴 때 우선순위/담당자 목록을 가져온다.
- `POST`: 이슈를 실제로 생성하고 이슈 키와 URL을 반환한다.

---

## Jira ADF 포맷

Jira REST API v3에서 이슈 설명은 **ADF(Atlassian Document Format)**으로 작성해야 한다. 일반 문자열을 넣으면 `400 Bad Request`가 난다.

```typescript
function buildAdf(description: string, viewerUrl: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: description }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "QA 기록방 뷰어: " },
          {
            type: "text",
            text: viewerUrl,
            marks: [{ type: "link", attrs: { href: viewerUrl } }],
          },
        ],
      },
    ],
  };
}
```

ADF는 `doc > paragraph > text` 계층 구조다. 링크는 `text` 노드에 `marks: [{ type: "link", attrs: { href } }]`를 추가하면 된다.

처음에 ADF를 모르고 `description: "버그 설명 텍스트"`로 넣었다가 계속 400이 나서 한참 헤맸다. Jira API v2는 문자열을 받지만 v3는 ADF가 필수다.

---

## 보안 처리

### CORS 도메인 제한

Edge Function은 `ALLOWED_ORIGINS` 환경 변수에 허용할 Origin만 등록한다. 등록되지 않은 도메인에서 오는 요청은 `Access-Control-Allow-Origin` 헤더를 응답하지 않으므로 브라우저가 차단한다.

```bash
supabase secrets set ALLOWED_ORIGINS="https://viewer.example.com,http://localhost:5173"
```

### Jira 토큰은 Secrets에만

```bash
supabase secrets set JIRA_BASE_URL="https://your-domain.atlassian.net"
supabase secrets set JIRA_EMAIL="bot@example.com"
supabase secrets set JIRA_TOKEN="<api-token>"
supabase secrets set JIRA_PROJECT_KEY="QA"
```

코드에서는 `Deno.env.get()`으로만 접근한다. 배포된 함수 코드를 열람해도 실제 값은 볼 수 없다.

---

## SDK에서 Edge Function 호출

```typescript
const res = await fetch(
  "https://<project-ref>.supabase.co/functions/v1/create-jira-issue",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": "<supabase-anon-key>",
    },
    body: JSON.stringify({ summary, description, priorityId, assigneeId, viewerUrl }),
  },
);
const { key, url } = await res.json();
```

`apikey` 헤더는 Supabase anon key다. Edge Function 자체 인증에 사용되며, Jira 토큰과는 무관하다.

---

## 배운 점

- **CORS는 브라우저 보안 정책**: 서버 간 통신에는 적용되지 않는다. 브라우저에서 외부 API를 직접 호출해야 한다면 프록시를 통해야 한다.
- **Edge Function = 서버리스 프록시**: Supabase를 이미 쓰고 있다면 Edge Function이 가장 빠른 프록시 구축 방법이다. 별도 서버 없이 `supabase deploy`로 끝난다.
- **Deno에서 `btoa`**: Node.js의 `Buffer.from(...).toString("base64")` 대신 브라우저와 동일한 `btoa()`를 Deno에서 그대로 사용할 수 있다.
- **Jira API v3의 ADF**: `description`에 문자열을 넣으면 안 된다. ADF JSON 구조로 넘겨야 한다. 공식 문서를 꼭 확인하자.
- **CORS 허용 Origin은 구체적으로**: `*`로 열어두면 어디서든 Edge Function을 호출할 수 있다. 특정 도메인만 허용하도록 `ALLOWED_ORIGINS`를 꼭 설정하자.
