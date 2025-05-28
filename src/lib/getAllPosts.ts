// src/lib/getAllPosts.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostMeta {
  title: string;
  date: string;
  category: string;
  slug: string;
}

export const getAllPosts = (): PostMeta[] => {
  const basePath = path.join(process.cwd(), "posts");
  const categories = fs
    .readdirSync(basePath)
    .filter((dir) => fs.statSync(path.join(basePath, dir)).isDirectory());

  const posts: PostMeta[] = [];

  for (const category of categories) {
    const categoryDir = path.join(basePath, category);
    const files = fs.readdirSync(categoryDir);

    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(content);

      posts.push({
        title: data.title ?? file.replace(/\.md$/, ""),
        date: data.date,
        category,
        slug: file.replace(/\.md$/, ""),
      });
    }
  }

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
};
