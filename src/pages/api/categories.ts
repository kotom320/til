import type { NextApiRequest, NextApiResponse } from "next";
import { getCategoryTree } from "@/lib/getCategoryTree";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const tree = getCategoryTree();
  res.status(200).json(tree);
}
