"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getAllPostsClient } from "@/lib/posts-client";
import { PostMeta } from "@/types/category";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";

const POSTS_PER_PAGE = 8;

export default function Home() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const page = parseInt(router.query.page as string) || 1;
    setCurrentPage(page);
  }, [router.query.page]);

  useEffect(() => {
    getAllPostsClient()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    "all",
    ...Array.from(new Set(posts.map((p) => p.category.split("/")[0]))).sort(),
  ];

  const filtered =
    activeCategory === "all"
      ? posts
      : posts.filter((p) => p.category.split("/")[0] === activeCategory);

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const currentPosts = filtered.slice(startIndex, startIndex + POSTS_PER_PAGE);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* 히어로 */}
      <section className="mb-12">
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ color: "var(--text-strong)" }}
        >
          dongwook.dev
        </h1>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
          넓게 보고, 깊게 이해하고, 기록합니다.
        </p>
      </section>

      {/* 검색 */}
      <div className="mb-6">
        <SearchBar className="max-w-full" />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              activeCategory === cat
                ? { background: "var(--accent)", color: "#fff" }
                : {
                    background: "var(--bg-muted)",
                    color: "var(--text-muted)",
                  }
            }
          >
            {cat === "all" ? "전체" : cat}
          </button>
        ))}
      </div>

      {/* 포스트 수 */}
      <p className="text-sm mb-6" style={{ color: "var(--text-subtle)" }}>
        {filtered.length}개의 포스트
      </p>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {currentPosts.map((post) => (
          <PostCard key={`${post.category}/${post.slug}`} post={post} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl="/"
      />
    </div>
  );
}

function PostCard({ post }: { post: PostMeta }) {
  const categoryLabel = post.category.split("/").pop() ?? post.category;
  const topCategory = post.category.split("/")[0];

  return (
    <Link href={`/post/${post.category}/${post.slug}`}>
      <article
        className="flex flex-col p-5 rounded-xl border h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* 카테고리 뱃지 */}
        <span
          className="inline-block self-start text-xs font-semibold px-2 py-0.5 rounded-md mb-3"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          {topCategory !== categoryLabel
            ? `${topCategory} / ${categoryLabel}`
            : categoryLabel}
        </span>

        {/* 제목 */}
        <h2
          className="font-semibold leading-snug mb-2 line-clamp-2"
          style={{ color: "var(--text-strong)" }}
        >
          {post.title}
        </h2>

        {/* 요약 */}
        {post.summary && (
          <p
            className="text-sm leading-relaxed line-clamp-2 mb-4 flex-1"
            style={{ color: "var(--text-muted)" }}
          >
            {post.summary}
          </p>
        )}

        {/* 하단: 날짜 + 대표 태그 */}
        <div
          className="flex items-center justify-between mt-auto pt-3 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
            {post.date}
          </span>
          {post.tags && post.tags.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-muted)",
                color: "var(--text-subtle)",
              }}
            >
              {post.tags[0]}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-12 animate-pulse">
        <div
          className="h-3 w-20 rounded mb-3"
          style={{ background: "var(--bg-muted)" }}
        />
        <div
          className="h-9 w-44 rounded mb-3"
          style={{ background: "var(--bg-muted)" }}
        />
        <div
          className="h-4 w-64 rounded"
          style={{ background: "var(--bg-muted)" }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border animate-pulse"
            style={{
              borderColor: "var(--border-subtle)",
              minHeight: 160,
            }}
          >
            <div
              className="h-4 w-16 rounded mb-3"
              style={{ background: "var(--bg-muted)" }}
            />
            <div
              className="h-5 rounded mb-2"
              style={{ background: "var(--bg-muted)" }}
            />
            <div
              className="h-4 rounded w-4/5"
              style={{ background: "var(--bg-muted)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
