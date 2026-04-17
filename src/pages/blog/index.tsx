import { GetStaticProps } from "next";
import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogMeta } from "@/types/category";

interface BlogIndexProps {
  posts: BlogMeta[];
}

interface Group {
  id: string;
  title: string;
  subtitle?: string;
  posts: BlogMeta[];
}

/**
 * Track A (포트폴리오 동반): portfolio.slug 별로 묶되, 시리즈는 대표글 한 편만 먼저 노출.
 * Track B (독립): portfolio 없는 글 모두.
 */
function groupPosts(posts: BlogMeta[]): Group[] {
  const portfolioGroups = new Map<string, Group>();
  const independent: BlogMeta[] = [];

  for (const post of posts) {
    if (post.portfolio) {
      const id = post.portfolio.slug;
      if (!portfolioGroups.has(id)) {
        portfolioGroups.set(id, {
          id,
          title: post.portfolio.title,
          subtitle: "포트폴리오 확장편",
          posts: [],
        });
      }
      portfolioGroups.get(id)!.posts.push(post);
    } else {
      independent.push(post);
    }
  }

  // 각 그룹 내 정렬: 시리즈는 order 순, 아니면 date desc
  for (const group of portfolioGroups.values()) {
    group.posts.sort((a, b) => {
      if (a.series && b.series && a.series.name === b.series.name) {
        return a.series.order - b.series.order;
      }
      return a.date > b.date ? -1 : 1;
    });
  }

  const groups: Group[] = [];
  for (const g of portfolioGroups.values()) groups.push(g);

  if (independent.length) {
    groups.push({
      id: "independent",
      title: "독립 기술 아티클",
      subtitle: "포트폴리오와 무관한 경험·패턴·트러블슈팅",
      posts: independent,
    });
  }

  return groups;
}

function PostRow({ post }: { post: BlogMeta }) {
  const seriesLabel = post.series
    ? `${post.series.name} · ${String(post.series.order).padStart(2, "0")}`
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
  const groups = groupPosts(posts);

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
          포트폴리오에 담지 못한 기술적 깊이와 경험담을 정리합니다.
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
          {groups.map((group) => (
            <section key={group.id}>
              <header className="mb-4">
                {group.subtitle && (
                  <p
                    className="text-xs font-mono uppercase tracking-wider mb-1"
                    style={{ color: "var(--accent)" }}
                  >
                    {group.subtitle}
                  </p>
                )}
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--text-strong)" }}
                >
                  {group.title}
                </h2>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {group.posts.length}편
                </p>
              </header>
              <div>
                {group.posts.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </div>
            </section>
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
