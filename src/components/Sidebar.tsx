"use client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  CategoryNode,
} from "@/types/category";
import { ChevronRight, ChevronDown, X } from "lucide-react";
import SidebarSearchBar from "./SidebarSearchBar";

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

export default function Sidebar({ categories, onClose }: SidebarProps) {
  const router = useRouter();

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

        <SidebarSearchBar />
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
      </div>
    </aside>
  );
}
