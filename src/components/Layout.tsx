"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { CategoryNode } from "@/types/category";
import { getCategoryTreeClient } from "@/lib/posts-client";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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
      <div
        className="flex min-h-screen"
        style={{ background: "var(--bg-subtle)" }}
      >
        <aside
          className="w-64 border-r p-4"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="animate-pulse">
            <div
              className="h-6 rounded mb-4"
              style={{ background: "var(--bg-muted)" }}
            />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 rounded"
                  style={{ background: "var(--bg-muted)" }}
                />
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg-subtle)" }}
    >
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
          style={{ background: "rgb(0 0 0 / 0.35)" }}
          onClick={toggleSidebar}
        />
      )}

      {/* 사이드바 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--bg-base)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <Sidebar categories={categories} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <div
          className="min-h-screen"
          style={{ background: "var(--bg-base)" }}
        >
          {/* 데스크톱 헤더 (테마 토글) */}
          <div className="hidden lg:flex items-center justify-end px-6 pt-4">
            <ThemeToggle />
          </div>

          {/* 모바일 헤더 */}
          <div
            className="lg:hidden flex items-center justify-between p-4 border-b"
            style={{
              background: "var(--bg-base)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <button
              onClick={toggleSidebar}
              aria-label="메뉴 열기"
              className="flex items-center justify-center w-9 h-9 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
