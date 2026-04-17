"use client";
import { useEffect, useRef } from "react";

interface Props {
  html: string;
}

/**
 * 빌드 타임에 unified 파이프라인(shiki 포함)으로 변환된 HTML을 렌더한다.
 * 마운트 후 모든 `pre.shiki` 코드 블록을 찾아 언어 라벨 + 복사 버튼 헤더로 래핑한다.
 */
export default function MarkdownViewer({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const codeBlocks = root.querySelectorAll("pre.shiki");
    codeBlocks.forEach((pre) => {
      // 이미 래핑된 경우 스킵
      if (pre.parentElement?.classList.contains("code-block")) return;

      const lang =
        pre.getAttribute("data-language") ??
        pre.querySelector("code")?.className.match(/language-([\w-]+)/)?.[1] ??
        "text";

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";

      const head = document.createElement("div");
      head.className = "code-block__head";

      const langLabel = document.createElement("span");
      langLabel.textContent = lang;
      head.appendChild(langLabel);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-block__copy";
      copyBtn.setAttribute("aria-label", "코드 복사");
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;
      copyBtn.addEventListener("click", async () => {
        const text = pre.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.classList.add("copied");
          copyBtn.querySelector("span")!.textContent = "Copied";
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.querySelector("span")!.textContent = "Copy";
          }, 1500);
        } catch {}
      });
      head.appendChild(copyBtn);

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(head);
      wrapper.appendChild(pre);
    });

    // 외부 링크는 새 탭으로
    root.querySelectorAll("a[href^='http']").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }, [html]);

  return (
    <div
      ref={ref}
      className="prose-kr"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
