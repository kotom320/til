---

title: "Vite에서 public 디렉토리 에셋이 import되지 않는 문제 분석"
date: "2025-12-05"
tags: ["vite", "assets", "alias", "public", "react-svgr"]
summary: "Vite 환경에서 public 디렉토리의 에셋을 import할 수 없는 원인을 분석하고, 에셋을 src로 되돌려 문제를 해결한 과정을 정리한다."
-------------------------------------------------------------------------------------------

## 1. 문제 인지

Vite 기반 프로젝트에서 빌드 과정 중 아래와 같은 에러가 반복적으로 발생했다.

```
Assets in public directory cannot be imported from JavaScript.
If you intend to import that asset, put the file in the src directory,
and use /src/assets/... instead of /public/assets/...
```

여러 SVG 파일에서 동일한 메시지가 출력되었으며, 공통적으로 **public 디렉토리에 있는 에셋을 `...?react` 형태로 import하려는 상황**에서 오류가 발생했다. 이 문제의 원인을 명확히 파악할 필요가 있었다.

---

## 2. 문제 정의 및 원인 분석

### 2.1 Vite의 public 디렉토리 규칙

Vite는 `public/` 디렉토리를 다음과 같이 처리한다.

| 접근 방식                      | 허용 여부 | 설명                             |
| ------------------------------ | --------- | -------------------------------- |
| URL 접근 (`/assets/...`)       | 허용      | 정적 파일 서빙 용도              |
| JavaScript import              | 불가      | public 파일은 번들링 대상이 아님 |
| ReactComponent 변환 (`?react`) | 불가      | src 내부 파일만 처리 가능        |

따라서 아래 코드는 구조적으로 불가능하다.

```
import Logo from "/public/assets/icon.svg?react" // 오류 발생
```

Vite 기준에서 public 파일은 “정적 URL 제공용”이며, import 대상으로 취급되지 않는다.

---

### 2.2 타임라인 기반 원인 분석

프로젝트의 구조 변경과 도구 전환 과정에서 해당 문제가 어떻게 발생했는지 시간 순으로 분석하였다.

**2023-06 — CRA 환경에서 src/assets → public/assets 이동**

- CRA에서는 주로 `<img src="/assets/..." />`처럼 URL 접근을 사용했다.
- 이 시기에는 import 사용이 많지 않아 문제가 드러나지 않았다.

**2024-06 — Vite 마이그레이션**

- Vite는 public import를 금지하는 구조를 가진다.
- 그러나 기존 CRA 구조를 그대로 가져오면서 잠재적 충돌이 남아 있었다.

**2024-08 — import 기반 사용 증가 (`?react`)**

- 프로젝트 전반에서 다음과 같은 import 패턴이 사용되기 시작했다.

```
import PoscoIcon from '@assets/clients/posco/logo_header.svg?react'
```

- 하지만 실제 파일은 `public/assets/...`에 있었고,
- alias 설정도 다음과 같이 잘못된 경로를 가리키고 있었다.

```
"@assets/*": ["/assets/*"] // 실제 경로와 불일치
```

- 이 시점부터 Vite의 public import 금지 규칙과 충돌하면서 에러가 발생했다.

**2025-12 — 구조 수정 및 정상화**

- 에셋 파일을 `src/assets`로 이동.
- alias를 실제 위치와 일치하도록 수정.
- 문제는 완전히 해결되었다.

---

## 3. 코드 예시 (Before & After)

### 기존 구조 (문제 발생)

**파일 구조**

```
public/assets/clients/posco/logo_header.svg
```

**alias 설정**

```
"@assets/*": ["/assets/*"]
```

**사용 코드**

```
import LogoHeader from '@assets/clients/posco/logo_header.svg?react' // 오류
```

---

### 개선된 구조 (Vite 권장 방식)

**파일 이동**

```
src/assets/clients/posco/logo_header.svg
```

**alias 수정**

```
"@assets/*": ["./src/assets/*"]
```

**사용 코드**

```
import LogoHeader from '@assets/clients/posco/logo_header.svg?react' // 정상 동작
```

---

## 4. 결론 및 배운 점

1. Vite는 public 디렉토리의 파일을 import할 수 없으며, URL 접근만 허용한다.
2. CRA 시절에 public으로 옮겨둔 에셋은 Vite 환경으로 전환되면서 구조적 충돌을 일으켰다.
3. import 기반 사용이 확대되면서 잠재된 문제가 노출되었다.
4. 에셋을 다시 src로 이동하고 alias를 일치시키는 것이 Vite 환경에서의 정상적인 사용 방식이다.
5. 앞으로는 URL 접근이 필요한 파일은 public에, import할 파일은 src에 두는 방식으로 명확히 구분해야 한다.

## 참조

https://vitejs.dev/guide/assets#the-public-directory
