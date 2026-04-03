---
title: "연관된 두 상태의 유효한 조합을 플래그로 추적하는 패턴"
date: "2026-04-03"
tags: ["상태 관리", "버그", "플래그 패턴", "JavaScript"]
summary: "두 개의 독립적으로 갱신되는 상태가 서로 연관될 때, 어느 시점의 조합이 유효한지를 boolean 플래그로 추적해 불일치를 방지한다."
---

## 문제 상황

세션 녹화 후 Jira 티켓을 생성하면 녹화 뷰어 URL이 티켓에 자동으로 첨부되는 기능이 있었다. 그리고 리포트 복사 버튼은 `마지막 뷰어 URL + 마지막 Jira 티켓`을 묶어서 복사한다.

버그 시나리오:
1. 녹화 A 생성 → `lastViewerUrl = URL-A`
2. Jira 티켓 1 생성 → URL-A 첨부됨, `lastJiraKey = PL-1`
3. 새 녹화 없이 Jira 티켓 2 생성 → `lastJiraKey = PL-2` (URL 없이 생성됨)
4. 리포트 복사 → `URL-A + PL-2` 복사 ← **PL-2에는 뷰어 URL이 없는데 함께 복사됨**

또 다른 시나리오:
1. 녹화 A 생성 → `lastViewerUrl = URL-A`
2. Jira 티켓 1 생성 → `lastJiraKey = PL-1`
3. **녹화 B 생성** → `lastViewerUrl = URL-B`
4. 리포트 복사 → `URL-B + PL-1` ← **PL-1은 URL-A 기준으로 만들어진 티켓**

## 원인 분석

두 상태(`lastViewerUrl`, `lastJiraKey`)가 각각 독립적으로 갱신되다 보니, 어느 시점에 "이 둘이 같은 세션을 가리키는가"를 추적하는 정보가 없었다.

## 해결 방법

두 개의 boolean 플래그를 추가해 상태 간 연결 여부를 추적한다.

```ts
private lastViewerUrl: string | null = null;
private lastViewerUrlAttached = false;   // 현재 URL이 Jira에 첨부됐는지
private lastJiraKey: string | null = null;
private lastJiraUrl: string | null = null;
private lastJiraLinkedToViewer = false;  // 현재 Jira가 현재 뷰어 URL과 함께 생성됐는지
```

**새 녹화 생성 시:**
```ts
this.lastViewerUrl = newUrl;
this.lastViewerUrlAttached = false;   // 새 URL, 아직 Jira에 첨부 안 됨
this.lastJiraKey = null;              // 이전 Jira는 이전 녹화 기준이므로 초기화
this.lastJiraUrl = null;
this.lastJiraLinkedToViewer = false;
```

**Jira 티켓 생성 시:**
```ts
// 첨부할 URL이 있는지 판단
const viewerUrl = (!this.lastViewerUrlAttached && this.lastViewerUrl)
  ? this.lastViewerUrl
  : "";

// 티켓 생성 후
this.lastJiraLinkedToViewer = !this.lastViewerUrlAttached && !!this.lastViewerUrl;
this.lastJiraKey = key;
this.lastJiraUrl = url;
this.lastViewerUrlAttached = true;
```

**리포트 복사 시:**
```ts
// Jira가 현재 뷰어 URL과 함께 만들어진 경우만 포함
if (this.lastJiraKey && this.lastJiraLinkedToViewer) {
  lines.push(`Jira: ${this.lastJiraKey} ${this.lastJiraUrl}`);
}
```

## 왜 이 방법인가

**대안: 하나의 객체로 묶기**

```ts
private currentSession: {
  viewerUrl: string;
  jiraKey: string | null;
  jiraUrl: string | null;
} | null = null;
```

새 녹화마다 `currentSession`을 교체하면 자연스럽게 연관성이 유지된다. 하지만 Jira 티켓은 녹화 없이도 독립적으로 생성 가능해야 해서 항상 묶을 수 없었다.

플래그 방식은 기존 코드 구조를 최소로 바꾸면서 "어느 시점에 연결됐는가"만 추적한다.

## 정리

독립적으로 갱신되는 두 상태를 함께 표시해야 할 때, 두 상태가 "같은 맥락에서 만들어졌는가"를 boolean 플래그로 추적하면 불일치를 방지할 수 있다.
