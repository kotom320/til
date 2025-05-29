// src/context/CategoryContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { CategoryNode } from "@/types/category";

const CategoryContext = createContext<CategoryNode[] | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [tree, setTree] = useState<CategoryNode[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setTree);
  }, []);

  return (
    <CategoryContext.Provider value={tree}>{children}</CategoryContext.Provider>
  );
}

export function useCategoryTree() {
  const ctx = useContext(CategoryContext);
  if (ctx === null) {
    throw new Error("CategoryProvider가 필요합니다");
  }
  return ctx;
}
