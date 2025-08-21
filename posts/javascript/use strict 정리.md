---

title: "use strict 정리"
date: "2025-08-21"
tags: ["JavaScript", "use strict", "ES6"]
summary: "JavaScript의 use strict 모드의 역할과 필요성을 정리합니다."
-----------------------------------------------------

## use strict란?

* JavaScript의 **엄격 모드(Strict Mode)** 를 활성화하는 지시어
* ES5(ECMAScript 5)부터 도입
* `"use strict";`를 스크립트나 함수 맨 앞에 작성하여 활성화

---

## 특징

1. **안전성 강화**

   - 암묵적 전역 변수 선언 방지

     ```js
     x = 10; // 일반 모드: 전역 변수 생성, strict 모드: ReferenceError
     ```

2. **예약어 보호**

   - 미래에 사용할 가능성이 있는 예약어(`package`, `private` 등)를 변수/식별자로 사용 불가

3. **`this` 바인딩 변경**

   - 함수 호출 시 `this`가 자동으로 `window`(브라우저)나 `global`(Node.js)에 바인딩되지 않음
   - `undefined`로 설정됨 → 실수 방지

   ```js
   function foo() {
     console.log(this);
   }
   foo(); // 일반 모드: window, strict 모드: undefined
   ```

4. **삭제 불가능한 속성 삭제 금지**

   ```js
   "use strict";
   delete Object.prototype; // TypeError
   ```

5. **중복 파라미터 금지**

   ```js
   function bar(a, a) {} // 일반 모드: 가능, strict 모드: SyntaxError
   ```

---

## ES6 모듈과 strict 모드

- **ES6의 `import/export` 구문**을 사용하는 모듈은 기본적으로 **자동 strict 모드**
- 따라서 React, Next.js 등 모던 프론트엔드 환경에서는 대부분 자동 적용
- `require`로 불러오는 구문(CommonJS)은 자동 strict 모드가 아님 → 직접 `"use strict";` 선언 필요

---

## 정리

- `use strict`는 **숨은 버그를 줄이고, 더 안전한 코드 작성**을 돕는 장치
- 모듈 시스템(ESM)을 쓰면 자동 적용되므로 별도 선언이 필요 없음
- 하지만 CommonJS(`require`)나 오래된 코드에서는 **명시적으로 작성**하는 것이 안전

---
