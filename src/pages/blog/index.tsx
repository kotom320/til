import { GetStaticProps } from "next";
import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogMeta } from "@/types/category";

interface BlogIndexProps {
  posts: BlogMeta[];
}

export default function BlogIndex({ posts }: BlogIndexProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--text-strong)" }}
        >
          Blog
        </h1>
        <p className="mt-2" style={{ color: "var(--text-muted)" }}>
          실무에서 진행한 프로젝트와 개선 경험을 기록합니다.
        </p>
      </div>

      {posts.length === 0 ? (
        <div
          className="text-center py-16"
          style={{ color: "var(--text-subtle)" }}
        >
          아직 작성된 글이 없습니다.
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <article key={post.slug}>
              <Link href={`/blog/${post.slug}`}>
                <div
                  className="group rounded-xl p-6 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2
                        className="text-xl font-semibold group-hover:underline transition-colors"
                        style={{ color: "var(--text-strong)" }}
                      >
                        {post.title}
                      </h2>
                      {(post.description || post.summary) && (
                        <p
                          className="mt-2 line-clamp-2 text-sm leading-relaxed"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {post.description ?? post.summary}
                        </p>
                      )}
                    </div>
                    <time
                      className="text-sm shrink-0 mt-1"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {post.date}
                    </time>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            background: "var(--bg-muted)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const posts = getAllBlogPosts();
  return { props: { posts } };
};
