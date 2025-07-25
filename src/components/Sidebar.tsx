"use client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { CategoryNode } from "@/types/category";
import { ChevronRight, ChevronDown } from "lucide-react";

interface SidebarProps {
  categories: CategoryNode[];
}

function CategoryItem({
  node,
  level = 0,
}: {
  node: CategoryNode;
  level?: number;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = router.asPath === node.path;
  const isParentActive = router.asPath.startsWith(node.path + "/");
  const hasChildren = node.children && node.children.length > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={toggleExpand}
          className={`flex w-full items-center justify-between py-2 px-3 rounded-lg transition-colors ${
            isActive
              ? "bg-blue-100 text-blue-700 font-medium"
              : isParentActive
              ? "bg-gray-50 text-gray-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
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
              isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="mt-1">
              {node.children.map((child) => (
                <CategoryItem key={child.path} node={child} level={level + 1} />
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
        className={`block py-2 px-3 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-100 text-blue-700 font-medium"
            : isParentActive
            ? "bg-gray-50 text-gray-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        {node.name}
      </Link>
    </div>
  );
}

export default function Sidebar({ categories }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">카테고리</h2>
        <Link
          href="/"
          className="block py-2 px-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          전체 포스트
        </Link>
      </div>
      <nav className="space-y-1">
        {categories.map((category) => (
          <CategoryItem key={category.path} node={category} />
        ))}
      </nav>
    </aside>
  );
}
