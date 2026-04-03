import type { NextApiRequest, NextApiResponse } from "next";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogMeta } from "@/types/category";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<BlogMeta[]>
) {
  const posts = getAllBlogPosts();
  res.status(200).json(posts);
}
