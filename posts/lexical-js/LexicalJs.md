---

title: "Lexical.js 정리"
date: "2025-05-30"
tags: \["Lexical.js", "React", "Performance", "Editor"]
summary: "경량 플러그인 기반 리치 텍스트 에디터 프레임워크인 Lexical.js의 주요 아키텍처와 개념을 정리합니다."

---

## 사용 이유

- 기존 Draft.js를 사용했으나 더 이상 지원되지 않고 아카이빙되어 유지보수 및 기능 확장이 어려움
- 새로운 리치 텍스트 에디터 구현이 필요하여 경량화, 확장성, React 통합이 뛰어난 Lexical.js 선택

## 1. 고성능 및 최적화

- 가볍고 빠른 구조로, 업데이트 사이클과 렌더링 최적화를 통해 수백\~수천 개의 노드를 가진 문서에서도 부드러운 사용자 경험 제공
- 변화가 필요한 노드만 선택적으로 렌더링하여 불필요한 리렌더링 방지

## 2. 모듈화 및 확장성

- 플러그인 기반 아키텍처:

  - 문법 강조, 링크 처리, 자동 완성 등 다양한 기능을 모듈화하여 필요 시에만 로드
  - React Hooks와 자연스럽게 연동 가능

- 커스텀 노드 등록:

  - `extend()`를 통해 TextNode, DecoratorNode 등 기본 노드를 확장
  - 독자적인 노드를 정의해 특수 콘텐츠 지원

## 3. React와의 통합

- `@lexical/react` 패키지 제공으로 손쉬운 React 컴포넌트 연결
- `LexicalComposer` → `RichTextPlugin` → `ContentEditable` 구조로 기본 에디터 UI 구성
- `OnChangePlugin`, `HistoryPlugin`, `LinkPlugin` 등 플러그인 활용해 상태 구독 및 컨트롤

## 4. 정형화된 노드 시스템

- **노드 기반 문서 모델**:

  - 각 텍스트 블록, 이미지, 리스트가 개별 노드로 관리
  - 트리 구조로 연결되어 문서 전체 구성

- **불변성 기반 상태 관리**:

  - 상태 변경 시 새로운 상태 객체 생성
  - 변경 추적과 최적화에 유리한 구조

## 5. 명령어(Commands) 및 이벤트 시스템

- **Commands**:

  - `editor.registerCommand()`으로 포맷팅, 삽입, 삭제 명령 정의
  - `COMMAND_PRIORITY_*`로 우선순위 제어

- **이벤트 브로드캐스팅**:

  - 상태 변경, 사용자 입력 등 다양한 이벤트를 구독(subscribe)
  - 플러그인 또는 외부 컴포넌트가 반응 가능

## 6. 플러그인 아키텍처

1. **LinkPlugin**: 링크 삽입/편집 지원
2. **ListPlugin**: 순서/비순서 목록 기능
3. **MarkdownShortcutPlugin**: 마크다운 단축키 지원
4. **HistoryPlugin**: 되돌리기/다시 실행 기능
5. **OnChangePlugin**: 에디터 상태 변경 콜백

## 7. 기본 사용 예제

```tsx
import React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

const initialConfig = {
  namespace: "MyEditor",
  theme: {},
  onError(error: Error) {
    console.error(error);
  },
};

export default function MyLexicalEditor() {
  const onChange = (editorState) => {
    editorState.read(() => {
      console.log("에디터 상태가 변경되었습니다.");
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="editor-input" />}
        placeholder={<div>텍스트를 입력해보세요...</div>}
        ErrorBoundary={({ children }) => children}
      />
      <OnChangePlugin onChange={onChange} />
    </LexicalComposer>
  );
}
```

## 8. 느낀 점

- 플러그인 설계 덕분에 필요한 기능만 골라 적용할 수 있어 번들 사이즈 관리에 유리
- 상태 관리와 노드 트리 구조를 이해하는 초기 러닝 커브가 있으나, 익숙해지면 커스텀 기능 확장이 매우 쉬움
- React 통합이 자연스러워 기존 컴포넌트 라이프사이클과 잘 어우러짐
