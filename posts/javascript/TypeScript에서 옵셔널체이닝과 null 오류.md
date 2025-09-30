---

title: "TypeScript JSX에서 옵셔널 체이닝과 Null 오류"
date: "2025-09-30"
tags: [TypeScript, JSX, NullCheck, Narrowing]
summary: "JSX에서 옵셔널 체이닝을 사용했음에도 불구하고 TypeScript가 null 오류를 발생시키는 이유와 해결 방법을 정리합니다."

---

## 배경

JSX에서 다음과 같은 패턴을 자주 사용합니다.

```tsx
{
  value?.[key] && <div>{value[key]}</div>;
}
```

겉보기에 `value?.[key]`로 null 방어를 했으니 안전할 것 같지만, TypeScript는 여전히 오류를 뱉습니다.

## 문제 상황

### TypeScript 오류 메시지

```text
Object is possibly 'null'.ts(18047)
```

발생 위치: `value[key]`

### 왜 발생할까?

- `value?.[key]` 조건문은 안전하게 보이지만, JSX의 `<div>{value[key]}</div>` 부분은 **별도의 평가**로 간주됩니다.
- TypeScript는 narrowing(값의 안전성 보장)을 **조건문과 JSX 표현식 사이에서 연결해주지 않습니다**.
- 따라서 `value`가 여전히 `null`일 수 있다고 판단하여 오류가 발생합니다.

## 해결 방법

### 임시 변수로 narrowing

```tsx
function Example({
  value,
  key,
}: {
  value: { [key: string]: string | undefined } | null;
  key: string;
}) {
  const item = value?.[key];

  return <>{item && <div>{item}</div>}</>;
}
```

- `value?.[key]` 결과를 `item`에 저장하면, TS는 `item`이 truthy일 때 안전하다는 걸 명확히 알 수 있습니다.
- 따라서 오류 없이 컴파일됩니다.

## 느낀 점

- JSX 내부에서는 TypeScript narrowing이 항상 기대대로 동작하지 않습니다.
- 특히 옵셔널 체이닝과 함께 쓰일 때는 **임시 변수로 분리**하는 것이 안전합니다.
- 이 패턴을 습관화하면 null 관련 오류를 미리 방지할 수 있습니다.
