---

title: "TypeScript 유틸리티 타입 정리 — Partial, Required, Readonly, Record, Pick, Omit"
date: "2025-08-21"
tags: ["TypeScript", "Utility Types"]
summary: "자주 쓰이는 유틸리티 타입 6가지를 개념, 시그니처, 사용 예와 함께 정리합니다."
--------------------------------------------------------

## 개요

TypeScript는 표준 라이브러리에서 **유틸리티 타입**을 제공한다. 모델을 변환하거나 제약을 강화·완화할 때 유용하며, 타입 선언의 중복을 줄이고 의도를 명확히 한다.

---

## 1) Partial<T>

**모든 프로퍼티를 선택적(optional)으로 바꾼다.**

```ts
type Partial<T> = { [K in keyof T]?: T[K] };

interface User {
  id: string;
  name: string;
  email?: string;
}
const patch: Partial<User> = { name: "Lee" }; // 일부만 제공 가능
```

**사용 예시**: PATCH 요청 바디, 부분 업데이트 폼 상태.

**주의**: 실제 런타임에서 값이 없는 건 아님. 선택적일 뿐이므로 사용 시 존재 체크 필요.

---

## 2) Required<T>

**모든 프로퍼티를 필수(required)로 만든다.**

```ts
type Required<T> = { [K in keyof T]-?: T[K] };

interface Config {
  host: string;
  port?: number;
}
const c: Required<Config> = { host: "localhost", port: 3000 }; // port도 필수
```

**사용 예시**: 내부 로직에서 기본값 합성 후, 이후 단계에서 "모두 존재" 가정하고 사용하고 싶을 때.

**주의**: 외부 입력에 곧바로 적용하면 과도한 제약이 될 수 있음.

---

## 3) Readonly<T>

**모든 프로퍼티를 읽기 전용으로 만든다.**

```ts
type Readonly<T> = { readonly [K in keyof T]: T[K] };

interface Point {
  x: number;
  y: number;
}
const p: Readonly<Point> = { x: 1, y: 2 };
// p.x = 3; // 오류: 읽기 전용
```

**사용 예시**: 불변 데이터, 리듀서 입력, 외부 노출 모델.

**주의**: 얕은(shallow) 불변. 중첩 객체는 별도 처리 필요(예: `ReadonlyDeep`).

---

## 4) Record\<K, V>

**키 집합 K와 값 타입 V로 구성된 객체 타입을 만든다.**

```ts
type Record<K extends keyof any, T> = { [P in K]: T };

type Role = "admin" | "user" | "guest";
const perms: Record<Role, number> = {
  admin: 3,
  user: 2,
  guest: 1,
};
```

**사용 예시**: 키가 제한된 룩업 테이블, 라우트 맵, i18n 리소스 맵.

**주의**: 모든 키를 반드시 채워야 함. 부분만 채우려면 `Partial<Record<K, V>>`.

---

## 5) Pick\<T, K>

**T에서 특정 키 K만 뽑아 새로운 타입을 만든다.**

```ts
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

type UserListItem = Pick<User, "id" | "name">; // 목록용 얇은 모델
```

**사용 예시**: API 응답/요청 모델 슬라이싱, 컴포넌트 Props 축소.

**주의**: K는 반드시 T의 키 집합이어야 함.

---

## 6) Omit\<T, K>

**T에서 특정 키 K를 제외한 타입을 만든다.**

```ts
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

interface User {
  id: string;
  password: string;
  name: string;
}

type PublicUser = Omit<User, "password">; // 민감정보 제거
```

**사용 예시**: 보안/노출 모델 분리, 내부 관리 필드 제거.

**주의**: 중복된 이름 생성 시 충돌 가능. 의미가 달라지지 않게 명확한 네이밍 유지.

---

## 조합 패턴 예시

```ts
// 1) 부분 업데이트 + 필수 보장
type UserPatch = Partial<User>;
function applyPatch(u: User, patch: UserPatch): Required<User> {
  const merged = { email: "", ...u, ...patch } as User; // 기본값 합성 예시
  return merged as Required<User>;
}

// 2) 특정 키만 수정 가능
type MutableName = Omit<User, "id"> & Readonly<Pick<User, "id">>;

// 3) 선택적 레코드
type OptionalFlags = Partial<Record<"dark" | "beta", boolean>>;

// 4) 프런트 전용 공개 모델
type UserDTO = Omit<User, "password">;
```

---

## 한줄 요약

- **Partial/Required/Readonly**: 필수성·가변성 스위치
- **Record**: 키-값 맵 템플릿
- **Pick/Omit**: 모델 슬라이싱 도구

실제 모델을 복제하지 말고, 유틸리티 타입으로 **의도를 표현**하자.
