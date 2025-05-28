import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDirectory = path.join(process.cwd(), "posts");

export function getPostSlugs(): string[] {
  const walk = (dir: string): string[] => {
    return fs.readdirSync(dir).flatMap((entry) => {
      const fullPath = path.join(dir, entry);
      return fs.statSync(fullPath).isDirectory()
        ? walk(fullPath)
        : [path.relative(postsDirectory, fullPath)];
    });
  };

  return walk(postsDirectory);
}

export function getPostBySlug(slug: string) {
  const fullPath = path.join(postsDirectory, slug);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const category = slug.split(path.sep)[0]; // javascript, typescript 등

  return {
    slug: slug.replace(/\.md$/, "").replace(/\\/g, "/"),
    category,
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
