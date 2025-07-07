"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllPostsClient } from "@/lib/posts-client";
import { PostMeta } from "@/types/category";

export default function Home() {
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getAllPostsClient();
        setPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">전체 포스트</h1>
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">전체 포스트</h1>
      <div className="grid gap-6">
        {posts.map((post) => (
          <article
            key={`${post.category}/${post.slug}`}
            className="border-b border-gray-200 pb-6"
          >
            <Link href={`/post/${post.category}/${post.slug}`}>
              <div className="group">
                <h2 className="text-xl font-semibold text-blue-600 group-hover:text-blue-800 transition-colors">
                  {post.title}
                </h2>
                <div className="text-sm text-gray-500 mt-1">
                  <span>{post.category}</span>
                  <span className="mx-2">•</span>
                  <span>{post.date}</span>
                </div>
                {post.summary && (
                  <p className="text-gray-700 mt-2 line-clamp-2">
                    {post.summary}
                  </p>
                )}
                {post.tags &&
                  Array.isArray(post.tags) &&
                  post.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
