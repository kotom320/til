import type { NextApiRequest, NextApiResponse } from "next";
import { getAllPosts, getPostsByCategory } from "@/lib/posts";
import { PostMeta } from "@/types/category";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { category } = req.query;

    if (category && typeof category === "string") {
      // 특정 카테고리의 포스트만 반환
      const posts = getPostsByCategory(category);
      res.status(200).json(posts);
    } else {
      // 모든 포스트 반환
      const posts = getAllPosts();
      res.status(200).json(posts);
    }
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
}
