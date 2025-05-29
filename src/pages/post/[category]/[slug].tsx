import { GetStaticPaths, GetStaticProps } from "next";
import MarkdownViewer from "@/components/MarkdownViewer";
import { getCategories } from "@/lib/getCategories";
import { getPostBySlug } from "@/lib/getPostBySlug";
import { getAllPostsByCategory } from "@/lib/getAllPostsByCategory";

interface PostProps {
  content: string;
  frontmatter: {
    title: string;
    date: string;
    tags?: string[];
    summary?: string;
  };
}

export default function PostPage({ content, frontmatter }: PostProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-4">{frontmatter.title}</h1>
      <p className="text-gray-500 text-sm mb-8">{frontmatter.date}</p>
      <MarkdownViewer content={content} />
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const categories = getCategories();
  const paths = categories.flatMap((category) => {
    const posts = getAllPostsByCategory(category);
    return posts.map((post) => ({
      params: { category, slug: post.slug },
    }));
  });
  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const category = params?.category as string;
  const slug = params?.slug as string;
  const { content, frontmatter } = getPostBySlug(category, slug);
  return {
    props: {
      content,
      frontmatter,
    },
  };
};
