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

  // 코드 블록은 rehypeCodeChrome이 빌드 타임에 이미 래핑해뒀다.
  // 런타임에는 복사 버튼 클릭만 이벤트 위임으로 처리한다.
  useEffect(() => {
    const root = bodyRef.current;
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
