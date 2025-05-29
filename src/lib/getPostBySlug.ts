// src/lib/posts.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "posts");

export function getPostBySlug(category: string, slug: string) {
  const fullPath = path.join(POSTS_DIR, category, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  return {
    content,
    frontmatter: data as {
      title: string;
      date: string;
      tags?: string[];
      summary?: string;
    },
  };
}

export function getAllSlugs() {
  return fs.readdirSync(path.join(POSTS_DIR)).flatMap((category) =>
    fs
      .readdirSync(path.join(POSTS_DIR, category))
      .filter((file) => file.endsWith(".md"))
      .map((file) => ({ category, slug: file.replace(/\.md$/, "") }))
  );
}
