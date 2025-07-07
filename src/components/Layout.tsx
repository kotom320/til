"use client";
// src/components/Layout.tsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { CategoryNode } from "@/types/category";
import { getCategoryTreeClient } from "@/lib/posts-client";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategoryTreeClient();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="min-h-screen bg-white">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar categories={categories} />
      <main className="flex-1 overflow-auto">
        <div className="min-h-screen bg-white">{children}</div>
      </main>
    </div>
  );
}
