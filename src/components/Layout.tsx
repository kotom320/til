"use client";
// src/components/Layout.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useCategoryTree } from "@/context/CategoryContext";
import { CategoryNode } from "@/types/category";

export default function Layout({ children }: { children: React.ReactNode }) {
  const tree = useCategoryTree();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (path: string) => {
    setOpenMap((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (nodes: CategoryNode[]) => (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.children ? (
            <>
              <button
                onClick={() => toggle(node.path)}
                className="flex w-full items-center justify-between px-2 py-1 hover:bg-gray-200 rounded"
              >
                <span className="text-gray-700">{node.name}</span>
                <span className="text-gray-500">
                  {openMap[node.path] ? "▼" : "▶"}
                </span>
              </button>
              {openMap[node.path] && (
                <div className="ml-4">{renderTree(node.children!)}</div>
              )}
            </>
          ) : (
            <Link
              href={node.path}
              className="block px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded"
            >
              {node.name}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-50 border-r p-4 text-sm overflow-auto">
        <h2 className="font-semibold text-gray-700 mb-4">목록</h2>
        {renderTree(tree)}
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
