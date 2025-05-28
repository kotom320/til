// src/components/Layout.tsx
import { ReactNode } from "react";
import Link from "next/link";
import { useCategories } from "@/context/CategoryContext";

export default function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const categories = useCategories();

  return (
    <div className="min-h-screen flex">
      <aside className="w-48 bg-gray-50 border-r p-4 text-sm">
        <h2 className="font-semibold text-gray-700 mb-4">카테고리</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              전체
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category}>
              <Link
                href={`/post/${category}`}
                className="text-gray-600 hover:text-blue-600"
              >
                {category}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
