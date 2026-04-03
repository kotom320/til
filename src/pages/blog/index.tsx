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
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-500 mt-2">
          실무에서 진행한 프로젝트와 개선 경험을 기록합니다.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          아직 작성된 글이 없습니다.
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.slug}>
              <Link href={`/blog/${post.slug}`}>
                <div className="group border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h2>
                      {post.description ? (
                        <p className="text-gray-600 mt-2 line-clamp-2 text-sm leading-relaxed">
                          {post.description}
                        </p>
                      ) : post.summary ? (
                        <p className="text-gray-600 mt-2 line-clamp-2 text-sm leading-relaxed">
                          {post.summary}
                        </p>
                      ) : null}
                    </div>
                    <time className="text-sm text-gray-400 shrink-0 mt-1">
                      {post.date}
                    </time>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
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
