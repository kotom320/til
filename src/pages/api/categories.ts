import type { NextApiRequest, NextApiResponse } from "next";
import { getCategories } from "@/lib/getCategories";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const categories = getCategories();
  res.status(200).json(categories);
}
