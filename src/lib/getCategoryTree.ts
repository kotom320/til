import fs from "fs";
import path from "path";
import { CategoryNode } from "@/types/category";

const POSTS_DIR = path.join(process.cwd(), "posts");

export function getCategoryTree(
  dir = POSTS_DIR,
  parentPath = ""
): CategoryNode[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .map((dirent) => {
      const name = dirent.name.replace(/\.md$/, "");
      const fullPath = path.join(dir, dirent.name);
      const urlPath = `${parentPath}/${name}`;

      if (dirent.isDirectory()) {
        return {
          name,
          path: `/post${urlPath}`,
          children: getCategoryTree(fullPath, urlPath),
        };
      } else if (dirent.name.endsWith(".md")) {
        return { name, path: `/post${urlPath}` };
      }

      return null as any;
    })
    .filter(Boolean);
}
