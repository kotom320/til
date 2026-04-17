import { visit, SKIP } from "unist-util-visit";
import type { Root, Element, ElementContent } from "hast";

/**
 * shiki가 하이라이팅한 `pre.shiki` 블록을 언어 라벨 + 복사 버튼 헤더로 감싸는
 * rehype 플러그인. 빌드 타임에 래핑하므로 React가 다루는 DOM 트리가 안정적이다.
 *
 * 클라이언트에서는 이벤트 위임으로 복사 버튼 클릭만 처리한다 (노드 이동 없음).
 */
const copyIcon: Element = {
  type: "element",
  tagName: "svg",
  properties: {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ariaHidden: "true",
  },
  children: [
    {
      type: "element",
      tagName: "rect",
      properties: { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" },
      children: [],
    },
    {
      type: "element",
      tagName: "path",
      properties: {
        d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
      },
      children: [],
    },
  ],
};

function readClass(props: Record<string, unknown> | undefined): string {
  if (!props) return "";
  // hast 정상 경로: className 배열 / shiki 경로: class 문자열
  const v = props.className ?? props.class;
  if (Array.isArray(v)) return v.map(String).join(" ");
  if (typeof v === "string") return v;
  return "";
}

function getLanguage(node: Element): string {
  const dataLang =
    node.properties?.dataLanguage ?? node.properties?.["data-language"];
  if (typeof dataLang === "string") return dataLang;

  const codeChild = node.children.find(
    (c): c is Element => (c as Element).tagName === "code"
  );
  const cls = readClass(codeChild?.properties as Record<string, unknown>);
  const match = /language-([\w-]+)/.exec(cls);
  return match ? match[1] : "text";
}

function isShikiPre(node: Element): boolean {
  if (node.tagName !== "pre") return false;
  return readClass(node.properties as Record<string, unknown>).includes("shiki");
}

function isAlreadyWrapped(parent: Element | Root | undefined): boolean {
  if (!parent || parent.type !== "element") return false;
  const el = parent as Element;
  return readClass(el.properties as Record<string, unknown>)
    .split(/\s+/)
    .includes("code-block");
}

export default function rehypeCodeChrome() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (!isShikiPre(node)) return;
      if (isAlreadyWrapped(parent as Element | Root)) return;

      const lang = getLanguage(node);

      const head: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block__head"] },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["code-block__lang"] },
            children: [{ type: "text", value: lang }],
          },
          {
            type: "element",
            tagName: "button",
            properties: {
              type: "button",
              className: ["code-block__copy"],
              dataCopy: "true",
              ariaLabel: "코드 복사",
            },
            children: [
              copyIcon,
              {
                type: "element",
                tagName: "span",
                properties: { className: ["code-block__copy-label"] },
                children: [{ type: "text", value: "Copy" }],
              },
            ],
          },
        ],
      };

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [head, node as ElementContent],
      };

      (parent as Element | Root).children[index] = wrapper;
      return [SKIP, index + 1];
    });
  };
}
