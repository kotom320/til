import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { BlogMeta, BlogPortfolioLink, BlogPost } from "@/types/category";
import { serializeMdx } from "./mdx";

const BLOG_DIR = path.join(process.cwd(), "blog");

const EXTENSIONS = [".mdx", ".md"];

function parseFrontmatter(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return matter(raw);
}

function resolveBlogFile(slug: string): string | null {
  for (const ext of EXTENSIONS) {
    const p = path.join(BLOG_DIR, `${slug}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function toMeta(slug: string, data: Record<string, unknown>): BlogMeta {
  // Next.js는 undefined 직렬화 불가 → 없는 필드는 아예 생략한다.
  const meta: BlogMeta = {
    slug,
    title: (data.title as string) ?? slug,
    date: data.date ? String(data.date) : "",
  };

  if (typeof data.summary === "string") meta.summary = data.summary;
  if (typeof data.description === "string")
    meta.description = data.description;
  if (Array.isArray(data.tags)) meta.tags = data.tags as string[];
  if (data.portfolio && typeof data.portfolio === "object") {
    meta.portfolio = data.portfolio as BlogPortfolioLink;
  }
  if (data.series && typeof data.series === "object") {
    meta.series = data.series as { name: string; order: number };
  }
  return meta;
}

export function getAllBlogPosts(): BlogMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => EXTENSIONS.some((ext) => f.endsWith(ext)));

  return files
    .map((file) => {
      const slug = file.replace(/\.(mdx|md)$/, "");
      const { data } = parseFrontmatter(path.join(BLOG_DIR, file));
      return toMeta(slug, data);
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getBlogPost(slug: string): BlogPost {
  const filePath = resolveBlogFile(slug);
  if (!filePath) {
    throw new Error(`Blog post not found: ${slug}`);
  }
  const { data, content } = parseFrontmatter(filePath);
  return { meta: toMeta(slug, data), content };
}

export async function getBlogPostMdx(slug: string): Promise<{
  meta: BlogMeta;
  mdxSource: MDXRemoteSerializeResult;
  textLength: number;
}> {
  const post = getBlogPost(slug);
  const mdxSource = await serializeMdx(post.content);
  const textLength = post.content.replace(/\s/g, "").length;
  return { meta: post.meta, mdxSource, textLength };
}

export function getAllBlogSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => EXTENSIONS.some((ext) => f.endsWith(ext)))
    .map((f) => f.replace(/\.(mdx|md)$/, ""));
}
