import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDirectory = path.join(process.cwd(), "posts");

export function getPostSlugs(): string[] {
  return fs.readdirSync(postsDirectory).filter((file) => file.endsWith(".md"));
}

export function getPostBySlug(slug: string) {
  const fullPath = path.join(postsDirectory, slug);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: slug.replace(/\.md$/, ""),
    metadata: data,
    content,
  };
}

export async function getPostHtml(slug: string) {
  const { metadata, content } = getPostBySlug(`${slug}.md`);
  const processed = await remark().use(html).process(content);
  const contentHtml = processed.toString();

  return {
    slug,
    metadata,
    contentHtml,
  };
}
