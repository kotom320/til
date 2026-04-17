import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import MarkdownViewer from "@/components/MarkdownViewer";
import { getAllBlogSlugs, getBlogPostHtml } from "@/lib/blog";
import { BlogMeta } from "@/types/category";

interface BlogPostPageProps {
  meta: BlogMeta;
  html: string;
  textLength: number;
}

export default function BlogPostPage({
  meta,
  html,
  textLength,
}: BlogPostPageProps) {
  const readingMinutes = Math.max(1, Math.round(textLength / 500));

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

      {/* 본문 */}
      <article>
        <MarkdownViewer html={html} />
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
  const { meta, html, textLength } = await getBlogPostHtml(slug);
  return { props: { meta, html, textLength } };
};
