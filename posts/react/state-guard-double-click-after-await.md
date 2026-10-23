---
title: "연타 방지: state 가드는 await 뒤에 두면 샌다"
date: "2026-10-23"
tags: ["React", "useRef", "double-submit", "react-hook-form"]
summary: "setState 전에 await 가 끼면 연타가 통과한다"
---

## 문제 상황

폼 화면의 「임시저장」과 「제출하기」 버튼을 연타하면 같은 저장 API가 여러 번 호출됐다. 백엔드에서 과도한 호출을 막아 달라는 요청이 왔다.

처음에는 "state로 막으면 리렌더 전에 들어온 두 번째 클릭이 통과할 수 있으니 `useRef`를 써야 한다"고 생각했다. 그런데 정말 그런지 직접 재 보니 절반만 맞았다.

## 원인 분석

실제 브라우저(Chromium, React 18)에서 Playwright로 버튼을 3번 클릭하고 API 호출 수를 셌다. 응답은 1초 뒤에 오도록 했다.

| 방식 | 0ms | 5ms | 16ms | 50ms | 100ms |
|---|---|---|---|---|---|
| A. 핸들러에서 바로 `setState` + `disabled` | 1 | 1 | 1 | 1 | 1 |
| B. `useMutation`의 `isPending` → `disabled` | 1 | 1 | 1 | 1 | 1 |
| C. `await` 뒤에 `setState` | **3** | **3** | **2** | 1 | 1 |
| D. `await` 뒤에 `useRef` 가드 | 1 | 1 | 1 | 1 | 1 |

- React 18은 클릭 같은 이산(discrete) 이벤트에서 일어난 `setState`를 동기 우선순위로 처리해, 다음 입력 이벤트가 오기 **전에** 커밋한다. 그래서 핸들러 첫 줄에서 상태를 바꾸면(A) 두 번째 클릭은 이미 `disabled`가 된 버튼을 누르게 된다.
- 문제는 C다. 핸들러가 `await`로 한 번 쉬면 그동안 들어온 클릭들은 모두 "아직 바쁘지 않은" 상태에서 시작한다. 상태가 바뀌기 전에 각자 검사를 통과해 버린다.
- react-hook-form의 `handleSubmit(onValid)`가 바로 이 구조다. 검증이 비동기라서 `onValid`는 항상 `await` 뒤에 실행된다. 그 안에서 `isPending`이나 state로 막으려 하면 검증이 끝나기 전까지의 연타가 그대로 샌다.

```tsx
// C: 새는 패턴
const onClick = async () => {
  await validate(); // 이 사이에 들어온 클릭은 모두 busy === false 를 본다
  if (busy) return;
  setBusy(true);
  save().finally(() => setBusy(false));
};
```

## 해결 방법

`await` 뒤의 검사는 렌더 사이클과 상관없이 즉시 읽고 쓰는 `useRef`로 한다. 화면에 비활성 표시가 필요 없다면 이것만으로 충분하다.

```tsx
const isSavingRef = useRef(false);

const onValid = (values: IForm) => {
  if (isSavingRef.current) return;
  isSavingRef.current = true;

  saveDraft(values, {
    onSettled: () => {
      isSavingRef.current = false;
    },
    onSuccess: () => {/* ... */},
  });
};

// eslint react-hooks/refs 가 "렌더 중 ref 접근"으로 경고하므로 핸들러 안에서 감싼다
<Button onClick={(e) => handleSubmit(onValid)(e)} />
```

- 같은 API를 부르는 버튼이 여럿이면 ref 하나를 같이 쓴다. 버튼마다 따로 두면 서로 다른 버튼을 번갈아 누를 때 중복 호출이 생긴다.
- `mutate`의 호출 단위 콜백은 마지막 `mutate` 호출 것만 실행된다. 가드로 동시 호출을 하나로 막아 두었기 때문에 `onSettled`가 빠지는 일은 없다.

## 왜 이 방법인가

- 핸들러가 동기라면 A나 B로도 충분하다. `disabled`가 켜지니 사용자에게도 상태가 보인다.
- `await`가 끼는 핸들러(비동기 검증, 확인 모달 등)라면 state만으로는 막히지 않는다. ref로 막고, 화면 표시가 필요할 때만 state를 덧붙인다.
- "리렌더 전이라 state는 늦다"는 일반론만 믿고 판단하면, 실제로는 안전한 코드까지 고치게 되고 정작 새는 지점은 놓친다.

## 정리

state 가드가 새는 건 리렌더가 늦어서가 아니라 검사보다 `await`가 먼저 있어서다. `await` 뒤에서 검사한다면 ref로 막는다.
