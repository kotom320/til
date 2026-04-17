import { GetStaticProps } from "next";
import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogMeta } from "@/types/category";

interface BlogIndexProps {
  posts: BlogMeta[];
}

interface SeriesGroup {
  name: string;
  posts: BlogMeta[];
}

/**
 * 블로그는 자기 완결적이다. 포트폴리오의 존재를 알지 못한다.
 * 시리즈(연재) 포스트는 상단에 묶어 보여주고, 나머지는 최신순 단편 리스트.
 */
function splitPosts(posts: BlogMeta[]): {
  seriesGroups: SeriesGroup[];
  standalone: BlogMeta[];
} {
  const seriesMap = new Map<string, BlogMeta[]>();
  const standalone: BlogMeta[] = [];

  for (const post of posts) {
    if (post.series) {
      const list = seriesMap.get(post.series.name) ?? [];
      list.push(post);
      seriesMap.set(post.series.name, list);
    } else {
      standalone.push(post);
    }
  }

  const seriesGroups: SeriesGroup[] = Array.from(seriesMap.entries()).map(
    ([name, ps]) => ({
      name,
      posts: ps.sort(
        (a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0)
      ),
    })
  );

  return { seriesGroups, standalone };
}

function PostRow({ post }: { post: BlogMeta }) {
  const seriesLabel = post.series
    ? `${String(post.series.order).padStart(2, "0")}화`
    : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block py-4 border-b transition-colors"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {seriesLabel && (
            <div
              className="text-xs font-mono mb-1"
              style={{ color: "var(--text-subtle)" }}
            >
              {seriesLabel}
            </div>
          )}
          <h3
            className="text-base font-semibold group-hover:underline"
            style={{ color: "var(--text-strong)" }}
          >
            {post.title}
          </h3>
          {(post.description || post.summary) && (
            <p
              className="mt-1 text-sm line-clamp-2"
              style={{ color: "var(--text-muted)" }}
            >
              {post.description ?? post.summary}
            </p>
          )}
        </div>
        <time
          className="text-xs shrink-0 mt-1"
          style={{ color: "var(--text-subtle)" }}
        >
          {post.date}
        </time>
      </div>
    </Link>
  );
}

export default function BlogIndex({ posts }: BlogIndexProps) {
  const { seriesGroups, standalone } = splitPosts(posts);

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
          실무에서 겪은 문제와 구현 과정을 길게 풀어쓴 글을 모아둡니다.
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
        <div className="space-y-12">
          {/* 시리즈 그룹 */}
          {seriesGroups.map((group) => (
            <section key={group.name}>
              <header className="mb-4">
                <p
                  className="text-xs font-mono uppercase tracking-wider mb-1"
                  style={{ color: "var(--accent)" }}
                >
                  Series · {group.posts.length}편
                </p>
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--text-strong)" }}
                >
                  {group.name}
                </h2>
              </header>
              <div>
                {group.posts.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </div>
            </section>
          ))}

          {/* 단편 글 */}
          {standalone.length > 0 && (
            <section>
              <header className="mb-4">
                <p
                  className="text-xs font-mono uppercase tracking-wider mb-1"
                  style={{ color: "var(--accent)" }}
                >
                  Articles · {standalone.length}편
                </p>
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--text-strong)" }}
                >
                  단편 글
                </h2>
              </header>
              <div>
                {standalone.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const posts = getAllBlogPosts();
  return { props: { posts } };
};
