import { PostMeta, CategoryNode } from "@/types/category";

/**
 * 클라이언트 사이드에서 카테고리 트리를 가져옵니다.
 */
export async function getCategoryTreeClient(): Promise<CategoryNode[]> {
  try {
    const response = await fetch("/api/categories");
    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching category tree:", error);
    return [];
  }
}

/**
 * 클라이언트 사이드에서 모든 포스트를 가져옵니다.
 */
export async function getAllPostsClient(): Promise<PostMeta[]> {
  try {
    const response = await fetch("/api/posts");
    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

/**
 * 클라이언트 사이드에서 특정 카테고리의 포스트를 가져옵니다.
 */
export async function getPostsByCategoryClient(
  category: string
): Promise<PostMeta[]> {
  try {
    const response = await fetch(
      `/api/posts?category=${encodeURIComponent(category)}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch posts by category");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching posts by category:", error);
    return [];
  }
}
