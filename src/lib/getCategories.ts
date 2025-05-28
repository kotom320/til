// lib/getCategories.ts
import fs from "fs";
import path from "path";

export const getCategories = () => {
  const postsDir = path.join(process.cwd(), "posts");
  return fs
    .readdirSync(postsDir)
    .filter((name) => fs.statSync(path.join(postsDir, name)).isDirectory());
};
