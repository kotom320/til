import fs from "fs";
import path from "path";
import Link from "next/link";
import { GetStaticPaths, GetStaticProps } from "next";
import Layout from "@/components/Layout";

interface Props {
  category: string;
  slugs: string[];
}

export default function CategoryPage({ category, slugs }: Props) {
  return (
    <div>
      <h1 className="text-xl font-bold mb-6">{category}</h1>
      <ul className="list-disc pl-5 space-y-2">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              href={`/post/${category}/${slug}`}
              className="text-blue-600 hover:underline"
            >
              {slug}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const postsDir = path.join(process.cwd(), "posts");
  const categories = fs.readdirSync(postsDir).filter((name) => {
    return fs.statSync(path.join(postsDir, name)).isDirectory();
  });

  const paths = categories.map((category) => ({
    params: { category },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const category = params?.category as string;
  const categoryPath = path.join(process.cwd(), "posts", category);
  const files = fs.readdirSync(categoryPath);

  const slugs = files
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));

  return {
    props: {
      category,
      slugs,
    },
  };
};
