import fs from "fs";
import path from "path";
import matter from "gray-matter";

export function getAllPostsByCategory(category: string) {
  const dirPath = path.join(process.cwd(), "posts", category);
  const filenames = fs.readdirSync(dirPath);

  return filenames
    .filter((name) => name.endsWith(".md"))
    .map((filename) => {
      const filePath = path.join(dirPath, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);
      return {
        slug: filename.replace(/\.md$/, ""),
        title: data.title as string,
        date: data.date as string,
      };
    });
}
