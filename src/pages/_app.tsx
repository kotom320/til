import type { AppProps } from "next/app";
import Layout from "@/components/Layout";
import "@/styles/globals.css";
import { CategoryProvider } from "@/context/CategoryContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CategoryProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </CategoryProvider>
  );
}
