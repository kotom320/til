"use client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  BlogMeta,
  CategoryNode,
} from "@/types/category";
import { ChevronRight, ChevronDown, X } from "lucide-react";
import SidebarSearchBar from "./SidebarSearchBar";
import { getAllBlogPostsClient } from "@/lib/posts-client";

interface SidebarProps {
  categories: CategoryNode[];
  onClose?: () => void;
}

function CategoryItem({
  node,
  level = 0,
  onClose,
}: {
  node: CategoryNode;
  level?: number;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = router.asPath === node.path;
  const isParentActive = router.asPath.startsWith(node.path + "/");
  const hasChildren = node.children && node.children.length > 0;

  const activeStyle = {
    background: "var(--accent-soft)",
    color: "var(--accent)",
  } as const;
  const parentStyle = {
    background: "var(--bg-muted)",
    color: "var(--text-body)",
  } as const;
  const baseStyle = { color: "var(--text-muted)" } as const;

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={toggleExpand}
          className="flex w-full items-center justify-between py-2 px-3 rounded-lg transition-colors"
          style={{
            ...(isActive ? activeStyle : isParentActive ? parentStyle : baseStyle),
            paddingLeft: `${level * 12 + 12}px`,
            fontWeight: isActive ? 600 : 400,
          }}
        >
          <span className="flex items-center">
            {hasChildren && (
              <span className="mr-2 transition-transform duration-200">
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
            )}
            {node.name}
          </span>
        </button>
        {hasChildren && node.children && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="mt-1">
              {node.children.map((child) => (
                <CategoryItem
                  key={child.path}
                  node={child}
                  level={level + 1}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Link
        href={node.path}
        className="block py-2 px-3 rounded-lg transition-colors"
        style={{
          ...(isActive ? activeStyle : isParentActive ? parentStyle : baseStyle),
          paddingLeft: `${level * 12 + 12}px`,
          fontWeight: isActive ? 600 : 400,
        }}
        onClick={onClose}
      >
        {node.name}
      </Link>
    </div>
  );
}

function BlogList({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAllBlogPostsClient().then((data) => {
      if (active) {
        setPosts(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-5 rounded animate-pulse"
            style={{ background: "var(--bg-muted)" }}
          />
        ))}
      </div>
    );
  }

  // 시리즈와 단편 분리
  const seriesMap = new Map<string, BlogMeta[]>();
  const standalone: BlogMeta[] = [];
  for (const p of posts) {
    if (p.series) {
      const list = seriesMap.get(p.series.name) ?? [];
      list.push(p);
      seriesMap.set(p.series.name, list);
    } else {
      standalone.push(p);
    }
  }
  for (const list of seriesMap.values()) {
    list.sort((a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0));
  }

  const isCurrent = (slug: string) => router.asPath === `/blog/${slug}`;

  return (
    <div className="space-y-4">
      {/* 전체 보기 */}
      <Link
        href="/blog"
        onClick={onClose}
        className="block py-2 px-3 rounded-lg transition-colors text-sm"
        style={
          router.pathname === "/blog"
            ? {
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontWeight: 600,
              }
            : { color: "var(--text-muted)" }
        }
      >
        전체 글 보기
      </Link>

      {/* 시리즈 */}
      {Array.from(seriesMap.entries()).map(([name, list]) => (
        <SeriesSection
          key={name}
          name={name}
          posts={list}
          isCurrent={isCurrent}
          onClose={onClose}
        />
      ))}

      {/* 단편 */}
      {standalone.length > 0 && (
        <div>
          <p
            className="px-3 mb-1.5 text-[11px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-subtle)" }}
          >
            Articles
          </p>
          <div className="space-y-0.5">
            {standalone.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                onClick={onClose}
                className="block py-1.5 px-3 rounded-md text-xs leading-snug transition-colors line-clamp-2"
                style={
                  isCurrent(post.slug)
                    ? {
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        fontWeight: 600,
                      }
                    : { color: "var(--text-muted)" }
                }
                title={post.title}
              >
                {post.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeriesSection({
  name,
  posts,
  isCurrent,
  onClose,
}: {
  name: string;
  posts: BlogMeta[];
  isCurrent: (slug: string) => boolean;
  onClose?: () => void;
}) {
  const anyCurrent = posts.some((p) => isCurrent(p.slug));
  const [isExpanded, setIsExpanded] = useState(anyCurrent);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-1.5 px-3 rounded-md text-[11px] font-mono uppercase tracking-wider transition-colors"
        style={{ color: "var(--text-subtle)" }}
      >
        <span className="flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          Series · {name}
        </span>
        <span>{posts.length}편</span>
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              onClick={onClose}
              className="block py-1.5 px-3 pl-7 rounded-md text-xs leading-snug transition-colors line-clamp-2"
              style={
                isCurrent(post.slug)
                  ? {
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontWeight: 600,
                    }
                  : { color: "var(--text-muted)" }
              }
              title={post.title}
            >
              <span
                className="mr-2 font-mono"
                style={{ color: "var(--text-subtle)" }}
              >
                {String(post.series?.order ?? 0).padStart(2, "0")}
              </span>
              {post.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ categories, onClose }: SidebarProps) {
  const router = useRouter();
  const isBlog = router.pathname.startsWith("/blog");

  return (
    <aside
      className="w-64 flex flex-col h-screen"
      style={{
        background: "var(--bg-base)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* 헤더 */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-lg font-bold transition-colors"
            style={{ color: "var(--text-strong)" }}
            onClick={onClose}
          >
            dongwook.dev
          </Link>
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 섹션 탭 — 세그먼트 컨트롤 */}
        <div
          className="flex p-0.5 rounded-lg mb-4"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <SectionTab href="/" active={!isBlog} onClose={onClose} label="TIL" />
          <SectionTab
            href="/blog"
            active={isBlog}
            onClose={onClose}
            label="Blog"
          />
        </div>

        {!isBlog && <SidebarSearchBar />}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isBlog ? (
          <BlogList onClose={onClose} />
        ) : (
          <>
            <Link
              href="/"
              onClick={onClose}
              className="block py-2 px-3 rounded-lg transition-colors mb-2"
              style={
                router.pathname === "/"
                  ? {
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontWeight: 600,
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              전체 포스트
            </Link>
            {categories.map((category) => (
              <CategoryItem
                key={category.path}
                node={category}
                onClose={onClose}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

function SectionTab({
  href,
  active,
  label,
  onClose,
}: {
  href: string;
  active: boolean;
  label: string;
  onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex-1 text-center py-1.5 text-sm font-semibold rounded-md transition-all ${
        active ? "" : "hover:opacity-80"
      }`}
      style={
        active
          ? {
              background: "var(--bg-base)",
              color: "var(--accent)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              border: "1px solid var(--accent-soft)",
            }
          : {
              color: "var(--text-muted)",
              background: "transparent",
              border: "1px solid transparent",
            }
      }
    >
      {label}
    </Link>
  );
}
