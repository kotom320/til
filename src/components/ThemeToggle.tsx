"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${className}`}
      style={{
        borderColor: "var(--border-subtle)",
        color: "var(--text-muted)",
        background: "var(--bg-subtle)",
      }}
    >
      {/* 서버 렌더 시 아이콘을 고정해 hydration mismatch 방지 */}
      {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
