---
title: 로컬 LLM으로 자율 개발팀 만들기. PM, 디자이너, 백엔드, 프론트가 실제로 코드를 짠다
date: '2026-04-29'
tags:
  - AI
  - Multi-Agent
  - Ollama
  - Side Project
  - TIL
summary: 'Ollama 로컬 LLM으로 PM, 디자이너, 백엔드, 프론트엔드 에이전트가 실제 파일을 만들고 서버를 실행하는 자율 개발팀을 만든 과정을 정리합니다.'
---

## 만들고 싶었던 것

"AI한테 로그인 페이지 만들어줘"라고 하면 PM이 기획하고, 디자이너가 스펙을 짜고, 백엔드가 API를 만들고, 프론트가 화면을 붙이는, 그런 팀이 실제로 돌아가는 걸 보고 싶었다.

채팅창에서 텍스트를 주고받는 게 아니라, 진짜로 파일이 생기고 서버가 뜨는 것.

---

## 구조

```
브라우저 UI (SSE 실시간 스트리밍)
    ↓
Node.js 서버 (/run endpoint)
    ↓
Orchestrator (4개 에이전트 조율)
    ↓
Ollama (qwen2.5-coder:7b) 실제 LLM 추론
```

에이전트는 4개다. PM, 디자이너, 백엔드, 프론트엔드. 각자 같은 Ollama 모델을 쓰지만, 시스템 프롬프트(페르소나)가 다르다.

흐름은 이렇다:

```
사용자 → PM → 디자이너 → (spec.md 작성) → PM → 백엔드 → (서버 실행) → PM → 프론트 → (앱 실행)
```

![에이전트들이 실시간으로 파일을 작성하고 명령을 실행하는 UI](/images/multi-agent-ui.png)

에이전트 간 소통은 전부 `message_agent` 툴 하나로 이루어진다. PM이 디자이너에게 메시지를 보내면, 디자이너가 응답할 때까지 PM은 기다린다. 비동기가 아니라 동기 블로킹 방식이다.

---

## agents.md, 코드 말고 마크다운으로 역할 정의

처음엔 TypeScript 파일에 페르소나를 하드코딩했는데, 이걸 `agents.md`라는 마크다운 파일로 분리했다.

```markdown
## pm
You are the team's PM. Respond in Korean.
...

## backend
You are the team's backend developer.
IMPORTANT: You MUST write ALL files before calling message_agent.
...
```

서버가 요청을 받을 때마다 이 파일을 읽어서 각 에이전트의 시스템 프롬프트로 주입한다. 에이전트 역할을 바꾸고 싶으면 TypeScript 코드를 건드릴 필요 없이 `agents.md`만 수정하면 된다.

CLAUDE.md가 Claude Code의 컨텍스트를 잡아주는 것처럼, agents.md가 에이전트들의 컨텍스트를 잡아주는 방식이다.

---

## 가장 골치 아팠던 문제, tool call을 텍스트로 뱉는 모델

Ollama의 `qwen2.5-coder:7b`는 tool call을 네이티브 포맷으로 안 뱉는 경우가 있다. 아래처럼 JSON을 그냥 텍스트로 출력한다.

```
{"name": "message_agent", "arguments": {"to": "backend", "content": "..."}}
```

`tool_calls` 필드가 비어있으니 코드는 이걸 일반 텍스트 응답으로 처리하고, 에이전트가 그냥 멈춘다.

처음엔 정규식으로 파싱을 시도했다.

```typescript
const pattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g;
```

문제는 `[\s\S]*?`가 non-greedy라 첫 번째 `}`에서 멈춰버린다는 거다. `write_file`의 `content`처럼 중괄호가 잔뜩 들어간 코드를 파싱하면 무조건 깨진다.

결국 brace-counting 방식으로 다시 짰다.

```typescript
// { 를 만나면 depth++, } 를 만나면 depth--
// depth가 0이 되는 순간이 JSON 객체의 끝
// 문자열 안의 중괄호는 무시 (escape 처리 포함)
```

이 방식으로 교체하고 나서 중첩된 JSON도 정확히 파싱할 수 있게 됐다.

---

## 에이전트가 파일 하나만 쓰고 멈추는 문제

백엔드 에이전트가 `package.json` 하나만 작성하고 "그런가요? 이건 어떻게 도와드릴 수 있을까요?"라고 대답해버렸다.

원인은 tool result 피드백 메시지였다. 기존 코드는 이렇게 생겼다.

```typescript
messages.push({ role: "assistant", content: "도구를 실행했습니다: ..." });
messages.push({ role: "user", content: "도구 실행 결과입니다. 계속 작업하거나 최종 응답을 해주세요..." });
```

assistant가 이미 작업을 완료한 것처럼 말하고, user가 "최종 응답을 해도 된다"고 힌트를 주니까 모델이 그냥 텍스트 응답으로 끝내버린 거다.

수정 후:

```typescript
// assistant: 실제 호출한 툴 기록
messages.push({ role: "assistant", content: "write_file({path: 'package.json', ...})" });
// user: 결과 확인 + 계속 작업 강제
messages.push({ role: "user", content: "실행 결과:\n...\n\n모든 작업이 끝날 때까지 계속 도구를 호출하세요. 완료 시에만 message_agent로 보고하세요." });
```

---

## 로컬 LLM의 현실

`qwen2.5-coder:7b`는 7B 파라미터 모델이다. Claude Sonnet과 비교하면 솔직히 많이 부족하다.

| | qwen2.5-coder:7b | Claude Sonnet |
|---|---|---|
| tool use 안정성 | 불안정 (폴백 파서 필요) | 네이티브, 거의 100% |
| 멀티스텝 이행 | 중간에 포기하는 경우 있음 | 끝까지 완주 |
| 비용 | **무료** | 토큰당 과금 |
| 프라이버시 | **완전 로컬** | 외부 서버 |

재밌는 실험으로 로컬 LLM을 쓰는 건 충분히 가치있다. 하지만 실제로 코드를 완주시키려면 더 큰 모델(`qwen2.5:14b` 이상)이나 Claude API가 현실적이다.

---

## 배운 것

**에이전트는 프롬프트가 전부다.** 같은 모델이어도 시스템 프롬프트 하나로 PM이 되고 백엔드 개발자가 된다. 아키텍처보다 페르소나 설계가 더 중요하다.

**LLM에게 "계속해"는 생각보다 어렵다.** 툴을 하나 실행하고 나서 다음 툴을 자동으로 호출하게 만드는 것, 이게 멀티에이전트 시스템에서 가장 어려운 부분이다. 피드백 메시지 한 줄이 모델의 행동을 완전히 바꾼다.

**로컬 LLM은 재밌다.** API 쿼터 걱정 없이 마음껏 실험할 수 있고, 내 머신에서 돌아간다는 게 묘하게 뿌듯하다.
