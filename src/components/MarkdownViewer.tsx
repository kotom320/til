"use client";
import { useEffect, useRef } from "react";

interface Props {
  html: string;
}

/**
 * 빌드 타임에 unified 파이프라인(shiki + rehypeCodeChrome)으로 변환된 HTML을 렌더.
 * 코드 블록은 이미 래핑되어 HTML 안에 포함되므로, 런타임에는 복사 버튼 클릭만
 * 이벤트 위임으로 처리한다 (DOM 이동 없음 — React 트리 안정).
 */
export default function MarkdownViewer({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>(".code-block__copy");
      if (!btn) return;
      const pre = btn
        .closest(".code-block")
        ?.querySelector<HTMLElement>("pre.shiki");
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent ?? "");
        btn.classList.add("copied");
        const label = btn.querySelector<HTMLElement>(".code-block__copy-label");
        if (label) label.textContent = "Copied";
        setTimeout(() => {
          btn.classList.remove("copied");
          if (label) label.textContent = "Copy";
        }, 1500);
      } catch {}
    };

    root.addEventListener("click", handleClick);
    return () => root.removeEventListener("click", handleClick);
  }, [html]);

  return (
    <div
      ref={ref}
      className="prose-kr"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
