import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import MarkdownViewer from "@/components/MarkdownViewer";
import Pagination from "@/components/Pagination";
import {
  getCategoryInfo,
  getAllCategoryPaths,
  getPostBySlug,
  getAllPostPaths,
  getAllPosts,
} from "@/lib/posts";
import { CategoryInfo, PostContent } from "@/types/category";

const POSTS_PER_PAGE = 5;

interface PostPageProps {
  type: "category" | "post";
  categoryInfo?: CategoryInfo;
  categoryPath?: string;
  postContent?: PostContent;
  postMeta?: {
    category: string;
    slug: string;
  };
}

export default function DynamicPage({
  type,
  categoryInfo,
  categoryPath,
  postContent,
  postMeta,
}: PostPageProps) {
  if (type === "category" && categoryInfo && categoryPath) {
    return (
      <CategoryPage categoryInfo={categoryInfo} categoryPath={categoryPath} />
    );
  }

  if (type === "post" && postContent && postMeta) {
    return <PostPage content={postContent} postMeta={postMeta} />;
  }

  return <div>페이지를 찾을 수 없습니다.</div>;
}

function CategoryPage({
  categoryInfo,
  categoryPath,
}: {
  categoryInfo: CategoryInfo;
  categoryPath: string;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // URL 쿼리에서 페이지 번호 가져오기
  useEffect(() => {
    const page = parseInt(router.query.page as string) || 1;
    setCurrentPage(page);
  }, [router.query.page]);

  // 현재 페이지의 포스트들 계산
  const totalPages = Math.ceil(categoryInfo.posts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const currentPosts = categoryInfo.posts.slice(startIndex, endIndex);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">
            홈
          </Link>
          {categoryPath.split("/").map((segment, index) => {
            const path = categoryPath
              .split("/")
              .slice(0, index + 1)
              .join("/");
            return (
              <span key={path}>
                <span className="mx-2">/</span>
                <Link href={`/post/${path}`} className="hover:text-gray-700">
                  {segment}
                </Link>
              </span>
            );
          })}
        </nav>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{categoryInfo.name}</h1>
          <div className="text-sm text-gray-500">
            총 {categoryInfo.posts.length}개의 포스트
          </div>
        </div>
      </div>

      {/* 하위 카테고리 */}
      {categoryInfo.subcategories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">하위 카테고리</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryInfo.subcategories.map((subcategory) => (
              <Link
                key={subcategory.path}
                href={subcategory.path}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-medium text-blue-600">
                  {subcategory.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {subcategory.posts.length}개의 포스트
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 포스트 목록 */}
      {categoryInfo.posts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">포스트</h2>
          <div className="space-y-4">
            {currentPosts.map((post) => (
              <article
                key={post.slug}
                className="border-b border-gray-200 pb-4"
              >
                <Link href={`/post/${post.category}/${post.slug}`}>
                  <div className="group">
                    <h3 className="text-lg font-medium text-blue-600 group-hover:text-blue-800 transition-colors">
                      {post.title}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1">
                      {post.date}
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

          {/* 페이지네이션 */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl={`/post/${categoryPath}`}
          />

          {/* 페이지 정보 */}
          <div className="text-center text-sm text-gray-500 mt-4">
            {categoryInfo.posts.length > 0 && (
              <span>
                {startIndex + 1}-{Math.min(endIndex, categoryInfo.posts.length)}{" "}
                / {categoryInfo.posts.length} 포스트
              </span>
            )}
          </div>
        </div>
      )}

      {categoryInfo.subcategories.length === 0 &&
        categoryInfo.posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">이 카테고리에 포스트가 없습니다.</p>
          </div>
        )}
    </div>
  );
}

function PostPage({
  content,
  postMeta,
}: {
  content: PostContent;
  postMeta: { category: string; slug: string };
}) {
  const { category, slug } = postMeta;
  const categorySegments = category.split("/");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 브레드크럼 네비게이션 */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-700">
          홈
        </Link>
        {categorySegments.map((segment, index) => {
          const path = categorySegments.slice(0, index + 1).join("/");
          return (
            <span key={path}>
              <span className="mx-2">/</span>
              <Link href={`/post/${path}`} className="hover:text-gray-700">
                {segment}
              </Link>
            </span>
          );
        })}
        <span className="mx-2">/</span>
        <span className="text-gray-700">{slug}</span>
      </nav>

      {/* 포스트 헤더 */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{content.frontmatter.title}</h1>
        <div className="flex items-center gap-4 text-gray-500 mb-4">
          <span>{content.frontmatter.date}</span>
          <span>•</span>
          <span>{category}</span>
        </div>
        {content.frontmatter.tags &&
          Array.isArray(content.frontmatter.tags) &&
          content.frontmatter.tags.length > 0 && (
            <div className="flex gap-2">
              {content.frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
      </header>

      {/* 포스트 내용 */}
      <article className="prose prose-lg max-w-none">
        <MarkdownViewer content={content.content} />
      </article>

      {/* 네비게이션 버튼 */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex justify-between">
          <Link
            href={`/post/${category}`}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            ← 카테고리로 돌아가기
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            홈으로 가기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const categoryPaths = getAllCategoryPaths();
  const postPaths = getAllPostPaths();

  const paths = [
    // 카테고리 경로
    ...categoryPaths.map((categoryPath) => ({
      params: { path: categoryPath.split("/") },
    })),
    // 포스트 경로
    ...postPaths.map(({ category, slug }) => ({
      params: { path: [...category.split("/"), slug] },
    })),
  ];

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const pathSegments = params?.path as string[];

  if (!pathSegments || pathSegments.length === 0) {
    return { notFound: true };
  }

  try {
    // 마지막 세그먼트가 .md 파일인지 확인 (포스트인지 카테고리인지 판단)
    const allPosts = getAllPosts();
    const lastSegment = pathSegments[pathSegments.length - 1];
    const categoryPath = pathSegments.slice(0, -1).join("/");

    // 포스트인지 확인
    const isPost = allPosts.some(
      (post) => post.category === categoryPath && post.slug === lastSegment
    );

    if (isPost) {
      // 포스트 페이지
      const { content, frontmatter } = getPostBySlug(categoryPath, lastSegment);

      return {
        props: {
          type: "post",
          postContent: { content, frontmatter },
          postMeta: { category: categoryPath, slug: lastSegment },
        },
      };
    } else {
      // 카테고리 페이지
      const categoryPath = pathSegments.join("/");
      const categoryInfo = getCategoryInfo(categoryPath);

      return {
        props: {
          type: "category",
          categoryInfo,
          categoryPath,
        },
      };
    }
  } catch (error) {
    console.error(`Error processing path ${pathSegments.join("/")}:`, error);
    return { notFound: true };
  }
};
