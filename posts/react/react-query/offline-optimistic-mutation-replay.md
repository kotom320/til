---
title: "네트워크를 끊고 좋아요를 연타하면 왜 POST가 두 번 나갈까"
date: "2026-08-31"
tags: ["react", "tanstack-query", "react-query", "optimistic-update", "offline", "idempotency"]
summary: "오프라인에서 멈춘 mutation은 재연결 시 병렬로 한꺼번에 재개된다. networkMode·scope·API 멱등성 중 무엇이 진짜 원인인지 나눠보기"
---

## 문제 상황

좋아요 버튼을 옵티미스틱 업데이트로 구현했다. 누르면 즉시 UI가 바뀌고, 뒤에서 `POST /likes` 또는 `DELETE /likes`가 나간다.

네트워크를 끊고 버튼을 네 번 연타한 뒤 다시 연결했다. 눌렀던 요청이 전부 한꺼번에 나갔다. 여기까지는 예상했는데, **서버가 받은 순서가 POST, POST, DELETE, DELETE였다.** 내가 예상한 건 클릭 순서대로인 POST, DELETE, POST, DELETE였다.

결과적으로 POST가 연달아 두 번 처리되면서 서버 쪽 데이터가 깨졌고, 그 뒤에 도착한 요청은 POST든 DELETE든 전부 에러가 났다.

이걸 서버 개발자에게 "react-query 특성이다"라고 설명했는데, 말하면서도 확신이 없었다. 실제로는 **세 가지 서로 다른 문제가 겹쳐 있었고, 그중 하나만 라이브러리 특성이었다.**

## 원인 분석

### 1층. 요청이 재생되는 것: TanStack Query 기능이 맞다

mutation의 기본 `networkMode`는 `'online'`이다. 오프라인에서 `mutate()`를 호출하면 **실패하는 게 아니라 `isPaused: true` 상태로 멈춰서 MutationCache에 쌓인다.** 그리고 `QueryClient`가 onlineManager를 구독하고 있어서, 연결이 돌아오면 자동으로 재개한다.

```ts
// query-core/src/queryClient.ts
this.#unsubscribeOnline = onlineManager.subscribe(async (online) => {
  if (online) {
    await this.resumePausedMutations();
    this.#queryCache.onOnline();
  }
});
```

"다시 연결하니까 눌렀던 게 전부 나간다"의 정체가 이거다. 오프라인 대응을 따로 짠 적이 없어도 기본값으로 켜져 있다.

**리트라이 폭주가 아니다.** mutation의 `retry` 기본값은 0이라 재시도는 애초에 하지 않는다. 문서에도 "By default, TanStack Query will not retry a mutation on error"라고 명시돼 있다. 요청이 여러 번 나갔다고 해서 재시도를 의심할 필요는 없다.

### 2층. 순서가 뒤집히는 것: 기본 동작이지만 설정 가능하다

재개는 병렬이다.

```ts
// query-core/src/mutationCache.ts
resumePausedMutations(): Promise<unknown> {
  const pausedMutations = this.getAll().filter((x) => x.state.isPaused);
  return notifyManager.batch(() =>
    Promise.all(pausedMutations.map((mutation) => mutation.continue().catch(noop))),
  );
}
```

문서의 표현은 이렇다. "Per default, all mutations run in parallel - even if you invoke `.mutate()` of the same mutation multiple times."

**여기서 한 가지는 정확히 말해야 한다.** `Promise.all`은 배열 순서대로 시작시키므로 요청이 브라우저를 떠나는 순서는 POST → DELETE → POST → DELETE가 맞다. 뒤집히는 건 **서버가 처리하는 순서**다. 네 개가 거의 동시에 in-flight 상태가 되면 어느 요청이 어느 워커에 걸려 언제 커밋되는지는 보장되지 않는다.

이걸 "클라이언트가 순서를 섞어서 보냈다"고 설명하면 서버 개발자에게 바로 반박당한다. 정확한 표현은 **"직렬화하지 않고 4개를 동시에 던졌다"** 다.

v5에는 `scope`가 있다. 같은 `scope.id`를 가진 mutation은 직렬로 실행된다.

```ts
useMutation({
  mutationFn: toggleLike,
  scope: { id: `like-${postId}` }, // 앞의 것이 끝나야 다음이 시작
});
```

`scope`는 **v5 전용**이다. v4에서는 못 쓰니 `package.json`을 먼저 확인해야 한다.

### 3층. 데이터가 깨진 것: 라이브러리와 무관하다

POST가 두 번 들어와서 데이터가 깨진다는 건 **좋아요 API가 멱등하지 않다**는 뜻이다. 네트워크는 원래 요청을 중복 전달할 수 있고 사용자는 원래 연타한다. 클라이언트 라이브러리를 뭘 쓰든 언젠가 겪는다.

여기서 서버 쪽에 확인해야 할 게 하나 있다. **`(user_id, post_id)`에 unique 제약이 있는가?**

- 있다면 두 번째 POST가 실패한 건 제약이 정상 동작한 것이다. "DB가 꼬였다"는 과장일 가능성이 높고, 고칠 쪽은 클라이언트(중복 전송 차단과 에러 처리)다
- 없다면 중복 행이 실제로 생긴 것이고 서버에 `ON CONFLICT DO NOTHING` 같은 처리가 필요하다

**어느 쪽이 고칠 문제인지가 이 질문 하나로 갈린다.** 원인 분석보다 이걸 먼저 물어보는 게 빠르다.

### 덤: 롤백이 과거로 되돌린다

순서와 별개인 두 번째 버그가 있다. 동시에 뜬 mutation 네 개는 **각자 `onMutate`에서 스냅샷을 뜬다.**

```ts
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey: ['post', postId] });
  const previous = queryClient.getQueryData(['post', postId]); // 각자 다른 시점의 스냅샷
  queryClient.setQueryData(['post', postId], toggle);
  return { previous };
},
onError: (_err, _vars, context) => {
  queryClient.setQueryData(['post', postId], context.previous); // 몇 클릭 전으로 되돌아감
},
```

넷 중 하나가 실패하면 그 `onError`가 **몇 클릭 전 시점의 스냅샷으로 캐시를 되돌린다.** 화면이 엉뚱한 상태로 튀는 현상이 이거고, `scope`로 직렬화해도 사라지지 않는다.

## 해결 방법

세 층을 한 번에 닫는 방향은 순서를 보정하는 게 아니라 **델타를 보내는 설계를 그만두는 것**이다.

```
PUT /posts/:id/like   { liked: true }
```

토글을 몇 번 누르든 사용자가 원하는 결과는 **비트 하나**다. 그런데 지금은 그걸 델타(POST/DELETE) N개로 쪼개 보내고 있다. 이게 실제 설계 오류다.

최종 상태를 보내면 마지막 요청이 이기므로 **순서가 무의미해지고**, 클릭을 최종 상태로 합쳐서 보내면 **개수도 무의미해진다.** 그러면 `scope`도 버전 문제도 필요 없다.

```ts
const { mutate } = useMutation({
  mutationFn: (liked: boolean) => api.put(`/posts/${postId}/like`, { liked }),
  onMutate: async (liked) => {
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    queryClient.setQueryData(['post', postId], (old) => ({ ...old, liked }));
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
});

// 연타는 최종 상태 한 번으로 합쳐서 보낸다
const onClick = useDebouncedCallback((next: boolean) => mutate(next), 300);
```

당장 API를 못 바꾼다면 우선순위는 이렇다.

1. **서버에서 POST를 멱등하게 (upsert).** 가장 근본적이고 클라이언트 사정과 무관하게 안전해진다
2. **`scope`로 직렬화 (v5).** 순서는 잡히지만 요청 개수는 그대로다
3. **오프라인 큐잉이 필요 없는 기능이면 `networkMode: 'always'`.** 오프라인 클릭은 그냥 에러가 나고 쌓이지 않는다

## 왜 이 방법인가

**`scope`만으로 끝내지 않은 이유**는 그게 증상의 절반만 고치기 때문이다. 직렬화하면 POST → DELETE → POST → DELETE 순서로 정확히 처리되지만, **여전히 요청 네 개를 보내고 중간 상태 세 개는 아무도 원하지 않은 상태다.** 서버 부하도 그대로고, 중간에 하나 실패하면 그 뒤가 전부 어긋난다.

`scope`를 쓸 때 하나 더 확인할 게 있다. **POST/DELETE를 결정하는 시점이 클릭 시점인가 실행 시점인가.** 클릭 시점에 정해지면 직렬화했을 때 의도한 순서가 나오지만, `mutationFn` 안에서 그때그때 캐시를 읽어 정하면 옵티미스틱하게 갱신된 값을 보고 같은 메서드를 반복해서 만들 수 있다.

**`networkMode: 'always'`로 큐잉을 꺼버리는 것**은 제일 간단하지만, 오프라인에서 누른 게 조용히 사라진다. 좋아요처럼 실패해도 큰일 안 나는 액션이면 오히려 이쪽이 정직하다. 오프라인 지원이 제품 요구사항이면 못 쓴다.

**서버 멱등성을 요구하는 게 떠넘기기는 아니다.** 클라이언트를 아무리 잘 짜도 네트워크 레벨의 중복 전달은 막을 수 없다. 다만 대화를 꺼낼 때 "react-query가 원래 그래요"가 아니라 **"우리가 켜둔 오프라인 재개 기능이 요청 네 개를 되살렸고, 그게 데이터를 깨뜨린 건 좋아요 API가 멱등하지 않아서입니다"** 로 설명하는 게 정확하고, 대화도 그쪽이 잘 풀린다.

## 정리

- 오프라인 mutation은 실패하지 않고 **`isPaused`로 쌓였다가 재연결 시 자동 재개된다.** 기본값 `networkMode: 'online'`이라 아무것도 안 해도 켜져 있다
- **리트라이가 아니다.** mutation의 `retry` 기본값은 0이다. 요청이 여러 번 나갔다고 재시도를 의심하지 말 것
- 재개는 `Promise.all`로 **병렬**이다. 요청이 나가는 순서는 맞지만 **서버 처리 순서가 보장되지 않는다.** "클라이언트가 순서를 섞었다"고 말하면 틀린 설명이다
- 직렬화는 v5의 `scope: { id }`. **v4에는 없다**
- 동시 mutation은 각자 `onMutate` 스냅샷을 들고 있어서, 하나가 실패하면 **몇 클릭 전 상태로 롤백**한다. `scope`로도 안 고쳐진다
- 토글의 결과는 비트 하나인데 델타를 N개 보내는 게 진짜 원인이다. **최종 상태를 보내는 멱등 API(`PUT ... { liked }`) + 클릭 합치기**가 순서와 개수 문제를 동시에 없앤다
- 서버에 먼저 물어볼 것: **`(user_id, post_id)` unique 제약이 있는가.** 있으면 클라이언트가, 없으면 서버가 고칠 문제다
