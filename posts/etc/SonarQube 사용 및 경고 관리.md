---
title: "SonarQube 사용 및 경고 관리"
date: "2025-06-05"
tags: ["SonarQube", "Static Analysis", "Code Quality"]
summary: "SonarQube를 효과적으로 사용하기 위한 목적, 경고 처리 기준, NOSONAR 사용 가이드를 정리합니다."
---

# SonarQube 사용 및 경고 관리

---

## 1. 우리가 SonarQube를 사용하는 이유

- **코드 품질 자동 점검**  
  코드 작성 시점에 정적 분석을 통해 잠재적인 버그, 코드 냄새, 보안 리스크를 사전 탐지하여  
  유지보수성과 안정성을 높입니다.

- **팀 내 일관된 품질 기준 수립**  
  모든 개발자가 동일한 규칙을 적용받아 코드 스타일 및 안전성에 대한 합의된 기준을 따르게 합니다.

- **리뷰 부담 경감 및 효율화**  
  정적 분석 도구가 자동으로 지적할 수 있는 부분을 미리 해결함으로써  
  리뷰어가 비즈니스 로직에 집중할 수 있도록 돕습니다.

> SonarQube는 우리가 더 나은 코드를 쓰도록 돕는 **도구**이지, 자체가 개발의 목적이 되어서는 안 됩니다.

---

## 2. SonarQube 경고는 무조건 따라야 할까?

모든 경고를 **무조건 수정할 필요는 없습니다.**  
경고 하나하나가 절대적인 기준은 아니며, 실제 코드의 구조나 맥락에 따라 판단이 필요합니다.

예시:

- **중복 코드 경고**  
  코드가 중복되어 경고가 뜨지만, 구조상 분리하면 오히려 복잡도가 증가하는 경우에는 무시 가능

- **`switch` 문 default 경고**  
  모든 case를 다루고 있다면 default를 생략해도 문제가 없는 상황도 존재

---

## 3. 판단 기준 정리

| 항목                                   | 따라야 하는가  | 판단 기준                       |
| -------------------------------------- | -------------- | ------------------------------- |
| 보안 관련 이슈 (XSS, SQL Injection 등) | ✅ 예          | 반드시 수정 (보안은 타협 불가)  |
| 명백한 버그 가능성 (null 체크 누락 등) | ✅ 예          | 안정성에 직결, 반드시 대응      |
| 성능 관련 경고                         | ⚠️ 경우에 따라 | 실제 성능 영향도를 분석 후 대응 |
| 스타일, 중복, 복잡도 경고              | ⚠️ 경우에 따라 | 코드 의도와 구조에 따라 판단    |

> 🧭 무조건 따르기보다는, **그 경고가 실질적으로 의미 있는가?** 를 기준으로 판단해야 합니다.

---

## 4. 판단 기준은 “설명 가능성”

경고를 수정하지 않는다면, **그 이유를 명확히 설명할 수 있어야** 합니다.

- 단순 무시는 금지
- 팀 내 리뷰를 통해 **공유·합의된 결정**인지 확인

이 두 조건을 만족한다면, 모든 경고를 따르지 않아도 괜찮습니다.

---

## 5. `// NOSONAR` 사용 가이드

`// NOSONAR`는 SonarQube 경고를 무시하는 예외 수단입니다.  
그러나 **남용 시 기준이 흐려지므로 신중하게 사용**해야 합니다.

### 사용 조건

- False-positive(오탐)임이 확실한 경우
- 구조상 중복을 제거하면 오히려 복잡도가 높아지는 경우
- 프레임워크/패턴상 불가피한 경우

### 사용 규칙

- `// NOSONAR` 사용 전, **이유를 주석으로 명시**
- **주석 없는 NOSONAR는 금지**

```ts
// 구조상 공통화하면 오히려 복잡도가 증가하여 중복을 허용
// NOSONAR
renderUserInfo();
```

### 결론

SonarQube는 도구일 뿐, 목적이 아닙니다.

읽기 쉬운 코드, 명확한 의도, 유지보수성 높은 구조가 진짜 목표입니다.

모든 경고를 무조건 수정하기보다는, 건강한 기준 아래 선택적으로 대응하는 것이 더 바람직합니다.
