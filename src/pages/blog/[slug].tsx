import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import {
  getAllBlogPosts,
  getAllBlogSlugs,
  getBlogPostMdx,
} from "@/lib/blog";
import { BlogMeta } from "@/types/category";
import Callout from "@/components/mdx/Callout";
import Figure from "@/components/mdx/Figure";
import SeriesNav from "@/components/mdx/SeriesNav";
import { useEffect, useRef } from "react";

interface BlogPostPageProps {
  meta: BlogMeta;
  mdxSource: MDXRemoteSerializeResult;
  textLength: number;
  seriesSiblings: BlogMeta[];
}

// MDX에서 직접 사용할 수 있는 컴포넌트
const mdxComponents = {
  Callout,
  Figure,
};

export default function BlogPostPage({
  meta,
  mdxSource,
  textLength,
  seriesSiblings,
}: BlogPostPageProps) {
  const readingMinutes = Math.max(1, Math.round(textLength / 500));
  const bodyRef = useRef<HTMLDivElement>(null);

  // 렌더 후 shiki 코드 블록에 언어 라벨/복사 버튼 주입 (TIL MarkdownViewer와 동일 로직)
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    root.querySelectorAll("pre.shiki").forEach((pre) => {
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
        try {
          await navigator.clipboard.writeText(pre.textContent ?? "");
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

    root.querySelectorAll("a[href^='http']").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }, [mdxSource]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="text-sm mb-6" style={{ color: "var(--text-subtle)" }}>
        <Link href="/" className="hover:opacity-80">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:opacity-80">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span style={{ color: "var(--text-body)" }}>{meta.slug}</span>
      </nav>

      {/* 포스트 헤더 */}
      <header
        className="mb-10 pb-8 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <h1
          className="text-4xl font-bold leading-[1.3] tracking-tight mb-5"
          style={{ color: "var(--text-strong)" }}
        >
          {meta.title}
        </h1>
        {meta.description && (
          <p
            className="text-lg leading-[1.7] mb-5"
            style={{ color: "var(--text-muted)" }}
          >
            {meta.description}
          </p>
        )}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
          style={{ color: "var(--text-subtle)" }}
        >
          <time>{meta.date}</time>
          <span style={{ color: "var(--border-default)" }}>·</span>
          <span>{readingMinutes}분 읽기</span>
        </div>
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full"
                style={{
                  background: "var(--accent-softer)",
                  color: "var(--accent)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* 시리즈 네비게이션 */}
      {meta.series && (
        <SeriesNav current={meta} siblings={seriesSiblings} />
      )}

      {/* 본문 */}
      <article ref={bodyRef} className="prose-kr">
        <MDXRemote {...mdxSource} components={mdxComponents} />
      </article>

      {/* 하단 네비게이션 */}
      <div
        className="mt-16 pt-8 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Link
          href="/blog"
          className="px-4 py-2 rounded-lg transition-colors"
          style={{ color: "var(--accent)" }}
        >
          ← 블로그 목록으로
        </Link>
      </div>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllBlogSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const { meta, mdxSource, textLength } = await getBlogPostMdx(slug);

  // 같은 시리즈 포스트 수집
  const seriesSiblings = meta.series
    ? getAllBlogPosts().filter((p) => p.series?.name === meta.series?.name)
    : [];

  return { props: { meta, mdxSource, textLength, seriesSiblings } };
};
