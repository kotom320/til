import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import MarkdownViewer from "@/components/MarkdownViewer";
import { getAllBlogSlugs, getBlogPost } from "@/lib/blog";
import { BlogPost } from "@/types/category";

interface BlogPostPageProps {
  post: BlogPost;
}

export default function BlogPostPage({ post }: BlogPostPageProps) {
  const { meta, content } = post;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-700">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-gray-700">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{meta.slug}</span>
      </nav>

      {/* 포스트 헤더 */}
      <header className="mb-10 pb-8 border-b border-gray-200">
        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
          {meta.title}
        </h1>
        {meta.description && (
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            {meta.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <time>{meta.date}</time>
          {meta.tags && meta.tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* 본문 */}
      <article className="prose prose-lg max-w-none">
        <MarkdownViewer content={content} />
      </article>

      {/* 하단 네비게이션 */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link
          href="/blog"
          className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
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
  const post = getBlogPost(slug);
  return { props: { post } };
};
