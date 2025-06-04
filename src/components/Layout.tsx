"use client";
// src/components/Layout.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useCategoryTree } from "@/context/CategoryContext";
import { CategoryNode } from "@/types/category";
import { ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  const tree = useCategoryTree();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (path: string) => {
    setOpenMap((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (nodes: CategoryNode[]) => (
    <ul className="space-y-1">
      {nodes.map((node) => {
        const isOpen = openMap[node.path];
        const hasChildren = Boolean(node.children?.length);
        return (
          <li key={node.path}>
            {hasChildren ? (
              <>
                <button
                  onClick={() => toggle(node.path)}
                  className="flex w-full items-center justify-between px-2 py-1 hover:bg-gray-200 rounded"
                >
                  <span className="flex items-center text-gray-700">
                    {isOpen ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <span className="ml-2">{node.name}</span>
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 overflow-hidden"
                    >
                      {renderTree(node.children!)}
                    </motion.ul>
                  )}
                </AnimatePresence>
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
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-50 border-r p-4 text-sm overflow-auto">
        <p className="text-gray-600 mb-4">고동욱</p>
        <nav className="mb-4">
          <Link
            href="/"
            className="block px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded"
          >
            홈
          </Link>
        </nav>
        <h2 className="font-semibold text-gray-700 mb-4">목록</h2>
        {renderTree(tree)}
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
