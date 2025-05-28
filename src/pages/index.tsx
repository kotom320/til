// src/pages/index.tsx
import Link from "next/link";
import { GetStaticProps } from "next";
import { getAllPosts, PostMeta } from "@/lib/getAllPosts";

interface HomeProps {
  posts: PostMeta[];
}

export default function Home({ posts }: Readonly<HomeProps>) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">전체 </h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={`${post.category}/${post.slug}`}>
            <Link href={`/post/${post.category}/${post.slug}`}>
              <div className="text-blue-600 hover:underline">{post.title}</div>
              <div className="text-gray-500 text-sm">{post.date}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getStaticProps: GetStaticProps = () => {
  const posts = getAllPosts();

  return {
    props: {
      posts,
    },
  };
};
