import Link from "next/link";
import { ListOrdered } from "lucide-react";
import type { BlogMeta } from "@/types/category";

/**
 * 시리즈 포스트 상단에 표시하는 인덱스 네비게이터.
 * 같은 series.name을 가진 포스트들을 order 순으로 노출하고 현재 글을 강조한다.
 */
export default function SeriesNav({
  current,
  siblings,
}: {
  current: BlogMeta;
  siblings: BlogMeta[];
}) {
  if (!current.series || siblings.length <= 1) return null;
  const sorted = [...siblings].sort(
    (a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0)
  );

  return (
    <nav
      className="my-6 rounded-lg p-4"
      style={{
        background: "var(--bg-muted)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center gap-2 text-sm font-semibold mb-2"
        style={{ color: "var(--text-strong)" }}
      >
        <ListOrdered size={16} />
        <span>{current.series.name} 시리즈</span>
      </div>
      <ol className="space-y-1 text-sm">
        {sorted.map((post) => {
          const isCurrent = post.slug === current.slug;
          return (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-2 transition-colors"
                style={{
                  color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                <span style={{ color: "var(--text-subtle)" }}>
                  {String(post.series?.order ?? 0).padStart(2, "0")}
                </span>
                <span>{post.title}</span>
                {isCurrent && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                    background: "var(--accent-softer)",
                    color: "var(--accent)",
                    }}
                  >
                    현재 글
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
