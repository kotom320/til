import type { NextApiRequest, NextApiResponse } from "next";
import { getCategoryTree } from "@/lib/posts";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tree = getCategoryTree();
    res.status(200).json(tree);
  } catch (error) {
    console.error("Error fetching category tree:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}
