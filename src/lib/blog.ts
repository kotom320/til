import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { BlogMeta, BlogPost } from "@/types/category";
import { markdownToHtml } from "./markdown";

const BLOG_DIR = path.join(process.cwd(), "blog");

export function getAllBlogPosts(): BlogMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug,
        title: data.title ?? slug,
        date: data.date ? String(data.date) : "",
        summary: data.summary,
        description: data.description,
        tags: data.tags,
      } satisfies BlogMeta;
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getBlogPost(slug: string): BlogPost {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    meta: {
      slug,
      title: data.title ?? slug,
      date: data.date ? String(data.date) : "",
      summary: data.summary,
      description: data.description,
      tags: data.tags,
    },
    content,
  };
}

export async function getBlogPostHtml(
  slug: string
): Promise<{ meta: BlogMeta; html: string; textLength: number }> {
  const post = getBlogPost(slug);
  const html = await markdownToHtml(post.content);
  const textLength = post.content.replace(/\s/g, "").length;
  return { meta: post.meta, html, textLength };
}

export function getAllBlogSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
