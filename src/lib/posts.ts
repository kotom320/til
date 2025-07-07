import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  PostMeta,
  PostContent,
  CategoryInfo,
  CategoryNode,
} from "@/types/category";

const POSTS_DIR = path.join(process.cwd(), "posts");

/**
 * 주어진 경로에서 모든 마크다운 파일을 재귀적으로 찾습니다.
 */
function findMarkdownFiles(dir: string, relativePath = ""): string[] {
  const files: string[] = [];

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const currentRelativePath = path.join(relativePath, item.name);

      if (item.isDirectory()) {
        // 디렉토리인 경우 재귀적으로 탐색
        files.push(...findMarkdownFiles(fullPath, currentRelativePath));
      } else if (item.name.endsWith(".md")) {
        // 마크다운 파일인 경우 추가
        files.push(currentRelativePath);
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${dir}:`, error);
  }

  return files;
}

/**
 * 파일 경로에서 카테고리와 슬러그를 추출합니다.
 */
function parseFilePath(filePath: string): { category: string; slug: string } {
  const parts = filePath.split(path.sep);
  const slug = parts[parts.length - 1].replace(/\.md$/, "");
  const category = parts.slice(0, -1).join("/");

  return { category, slug };
}

/**
 * tags 데이터를 안전하게 배열로 변환합니다.
 */
function normalizeTags(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((tag) => typeof tag === "string");
  if (typeof tags === "string") return [tags];
  return [];
}

/**
 * 모든 포스트의 메타데이터를 가져옵니다.
 */
export function getAllPosts(): PostMeta[] {
  const markdownFiles = findMarkdownFiles(POSTS_DIR);
  const posts: PostMeta[] = [];

  for (const filePath of markdownFiles) {
    try {
      const fullPath = path.join(POSTS_DIR, filePath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const { data } = matter(content);
      const { category, slug } = parseFilePath(filePath);

      posts.push({
        title: data.title ?? slug,
        date: data.date ?? new Date().toISOString().split("T")[0],
        category,
        slug,
        fullPath: filePath,
        summary: data.summary,
        tags: normalizeTags(data.tags),
      });
    } catch (error) {
      console.warn(`Error processing file ${filePath}:`, error);
    }
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * 특정 카테고리의 포스트들을 가져옵니다.
 */
export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter((post) => post.category === category);
}

/**
 * 특정 카테고리와 슬러그로 포스트 내용을 가져옵니다.
 */
export function getPostBySlug(category: string, slug: string): PostContent {
  const filePath = path.join(POSTS_DIR, category, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post not found: ${category}/${slug}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const { data, content: markdownContent } = matter(content);

  return {
    content: markdownContent,
    frontmatter: {
      title: data.title ?? slug,
      date: data.date ?? new Date().toISOString().split("T")[0],
      tags: normalizeTags(data.tags),
      summary: data.summary,
    },
  };
}

/**
 * 카테고리 트리를 생성합니다.
 */
export function getCategoryTree(
  baseDir = POSTS_DIR,
  relativePath = ""
): CategoryNode[] {
  const nodes: CategoryNode[] = [];

  try {
    const items = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(baseDir, item.name);
      const currentRelativePath = path.join(relativePath, item.name);

      if (item.isDirectory()) {
        // 디렉토리인 경우
        const children = getCategoryTree(fullPath, currentRelativePath);
        nodes.push({
          name: item.name,
          path: `/post/${currentRelativePath}`,
          children,
          isDirectory: true,
        });
      } else if (item.name.endsWith(".md")) {
        // 마크다운 파일인 경우
        const name = item.name.replace(/\.md$/, "");
        nodes.push({
          name,
          path: `/post/${currentRelativePath.replace(/\.md$/, "")}`,
          isDirectory: false,
          isPost: true,
        });
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${baseDir}:`, error);
  }

  return nodes;
}

/**
 * 카테고리 정보를 가져옵니다.
 */
export function getCategoryInfo(categoryPath: string): CategoryInfo {
  const fullPath = path.join(POSTS_DIR, categoryPath);

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    throw new Error(`Category not found: ${categoryPath}`);
  }

  const items = fs.readdirSync(fullPath, { withFileTypes: true });
  const posts: PostMeta[] = [];
  const subcategories: CategoryInfo[] = [];

  for (const item of items) {
    const itemPath = path.join(fullPath, item.name);

    if (item.isDirectory()) {
      // 하위 카테고리
      const subcategoryPath = path.join(categoryPath, item.name);
      subcategories.push(getCategoryInfo(subcategoryPath));
    } else if (item.name.endsWith(".md")) {
      // 포스트 파일
      try {
        const content = fs.readFileSync(itemPath, "utf-8");
        const { data } = matter(content);
        const slug = item.name.replace(/\.md$/, "");

        posts.push({
          title: data.title ?? slug,
          date: data.date ?? new Date().toISOString().split("T")[0],
          category: categoryPath,
          slug,
          fullPath: path.join(categoryPath, item.name),
          summary: data.summary,
          tags: normalizeTags(data.tags),
        });
      } catch (error) {
        console.warn(`Error processing post ${itemPath}:`, error);
      }
    }
  }

  return {
    name: path.basename(categoryPath),
    path: `/post/${categoryPath}`,
    posts: posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    subcategories,
  };
}

/**
 * 모든 카테고리 경로를 가져옵니다.
 */
export function getAllCategoryPaths(): string[] {
  const paths: string[] = [];

  function collectPaths(dir: string, relativePath = "") {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const currentRelativePath = path.join(relativePath, item.name);
          paths.push(currentRelativePath);
          collectPaths(path.join(dir, item.name), currentRelativePath);
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dir}:`, error);
    }
  }

  collectPaths(POSTS_DIR);
  return paths;
}

/**
 * 모든 포스트 경로를 가져옵니다.
 */
export function getAllPostPaths(): Array<{ category: string; slug: string }> {
  const markdownFiles = findMarkdownFiles(POSTS_DIR);

  return markdownFiles.map((filePath) => {
    const { category, slug } = parseFilePath(filePath);
    return { category, slug };
  });
}
