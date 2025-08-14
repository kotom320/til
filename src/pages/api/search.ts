import { NextApiRequest, NextApiResponse } from "next";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { SearchResult } from "@/types/category";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResult[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { q: query } = req.query;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const searchQuery = query.trim().toLowerCase();
    const allPosts = getAllPosts();
    const searchResults: SearchResult[] = [];

    for (const post of allPosts) {
      let relevanceScore = 0;
      const matchedFields: SearchResult["matchedFields"] = {};

      // 제목에서 검색
      if (post.title.toLowerCase().includes(searchQuery)) {
        relevanceScore += 10;
        matchedFields.title = true;
      }

      // 요약에서 검색
      if (post.summary && post.summary.toLowerCase().includes(searchQuery)) {
        relevanceScore += 5;
        matchedFields.summary = true;
      }

      // 태그에서 검색
      if (
        post.tags &&
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery))
      ) {
        relevanceScore += 3;
        matchedFields.tags = true;
      }

      // 내용에서 검색 (파일 내용을 읽어서 검색)
      try {
        const postContent = getPostBySlug(post.category, post.slug);
        if (postContent.content.toLowerCase().includes(searchQuery)) {
          relevanceScore += 1;
          matchedFields.content = true;
        }
      } catch (error) {
        // 파일을 읽을 수 없는 경우 무시
        console.warn(`Could not read content for ${post.fullPath}:`, error);
      }

      // 검색 결과가 있는 경우에만 추가
      if (relevanceScore > 0) {
        searchResults.push({
          post,
          matchedFields,
          relevanceScore,
        });
      }
    }

    // 관련성 점수로 정렬 (높은 점수부터)
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.status(200).json(searchResults);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
