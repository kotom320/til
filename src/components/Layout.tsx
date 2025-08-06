"use client";
// src/components/Layout.tsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { CategoryNode } from "@/types/category";
import { getCategoryTreeClient } from "@/lib/posts-client";
import { Menu, X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-opacity-80 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 사이드바 */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <Sidebar
          categories={categories}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-screen bg-white">
          {/* 모바일 헤더 */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-4">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
