import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { CategoryContext } from "@/context/CategoryContext";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, []);

  return (
    <CategoryContext.Provider value={categories}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </CategoryContext.Provider>
  );
}
