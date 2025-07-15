---

title: "LF vs CRLF 개념 정리"
date: "2025-07-15"
tags: ["Text Editor", "Line Endings", "LF", "CRLF", "TIL"]
summary: "Unix 계열의 LF와 Windows 계열의 CRLF 줄바꿈 방식 차이, 역사적 배경, 호환성 이슈 및 설정 방법을 정리합니다."
----------------------------------------------------------------------------------

## 배경

* 다양한 운영체제와 에디터에서 줄바꿈 문자가 달라 파일이 서로 다른 환경에서 올바르게 표시되지 않는 문제가 잦음
* 공동 작업 시 Git diff가 전부 줄바꿈만 변경된 것처럼 보이거나, 일부 스크립트가 예기치 않게 동작할 수 있어 줄바꿈 방식의 이해가 중요함

## 1. 정의

| 용어   | 표현 코드  | 설명                                            |
| ---- | ------ | --------------------------------------------- |
| LF   | `\n`   | Line Feed. Unix, Linux, macOS 등에서 사용.         |
| CRLF | `\r\n` | Carriage Return + Line Feed. Windows 계열에서 사용. |

* **LF (`\n`)**: 커서를 다음 줄의 맨 앞로 이동 (newline)
* **CR (`\r`)**: 커서를 같은 줄 맨 앞으로 복귀 (carriage return)
* **CRLF (`\r\n`)**: 두 동작을 연이어 수행하여 Windows 스타일 줄바꿈 구현

## 2. 역사적 배경

* 타자기 시절: Carriage Return(복귀)과 Line Feed(종단)가 별도 제어코드로 존재
* 초기 컴퓨터 시스템마다 제어코드를 통일하지 않아, Unix는 LF만 채택, Windows는 CRLF를 선택

## 3. 호환성 이슈

1. **Git diff 잡음**

   * LF ↔ CRLF 변환만으로 파일 전체가 변경된 것처럼 보임
2. **스크립트 실행 오류**

   * `#!/usr/bin/env node` 같은 shebang 라인 끝에 CR이 있으면 인식 실패
3. **에디터 설정 문제**

   * 한 환경에서 저장 시 자동으로 CRLF가 삽입되어 다른 환경에서 줄바꿈이 깨져 보임

## 4. 설정 및 해결 방법

### 4.1 Git 설정

```bash
# 체크아웃 시 Git이 자동으로 EOL 변환
git config --global core.autocrlf true  # Windows: CRLF → LF 변환 후 체크아웃 시 CRLF 변환
git config --global core.eol lf         # 강제 LF 사용
```

### 4.2 .gitattributes 파일

```gitattributes
# 모든 텍스트 파일을 LF로 강제
* text=auto eol=lf
# 특정 확장자만 CRLF 허용
*.bat text eol=crlf
```

### 4.3 에디터 설정

* **VSCode**: 설정(`.vscode/settings.json`)

  ```json
  {
    "files.eol": "\n"
  }
  ```
* **Sublime Text**: Preferences > Settings > "default\_line\_ending": "unix"

## 5. 실전 권장

* **공통 운영체제이기주의**: 팀원 모두가 동일한 EOL 방식을 사용하도록 프로젝트 설정 강제
* **스크립트/실행 파일**: Unix 쉘 스크립트, Node.js shebang 파일 등은 반드시 LF로 저장
* **가독성 문서**: Markdown, YAML 등 텍스트 문서는 LF를 권장

## 느낀 점

* 줄바꿈 EOL 차이가 잠재적 버그 원인이 되기 쉬워, 초기 프로젝트 설정 단계에서 반드시 통일해야 함
* Git과 에디터 설정을 통해 자동 변환을 구성하면, 환경 간 불일치를 최소화할 수 있음
* 운영체제별 역사적 배경을 이해하면, 왜 이러한 차이가 생겼는지 더 명확히 알게 됨

---
