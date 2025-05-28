import Link from "next/link";
import { getPostSlugs, getPostBySlug } from "@/lib/markdown";

interface Post {
  slug: string;
  metadata: {
    title: string;
    date: string;
    summary?: string;
  };
}

export default function Home({ posts }: Readonly<{ posts: Post[] }>) {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Today I Learned</h1>
      <ul className="space-y-6">
        {posts.map(({ slug, metadata }) => (
          <li
            key={slug}
            className="p-4 border rounded-md hover:shadow-sm transition"
          >
            <Link
              href={`/post/${slug}`}
              className="text-xl font-semibold text-blue-600 hover:underline"
            >
              {metadata.title}
            </Link>
            <p className="text-sm text-gray-500 mt-1">{metadata.date}</p>
            {metadata.summary && (
              <p className="text-gray-700 mt-2">{metadata.summary}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export async function getStaticProps() {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1));

  return {
    props: {
      posts,
    },
  };
}
