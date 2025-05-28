import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import { getPostSlugs, getPostHtml } from "@/lib/markdown";

interface PostPageProps {
  slug: string;
  metadata: {
    title: string;
    date: string;
    summary?: string;
  };
  contentHtml: string;
}

export default function PostPage({
  slug,
  metadata,
  contentHtml,
}: Readonly<PostPageProps>) {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <Head>
        <title>{metadata.title} | TIL</title>
      </Head>
      <h1 className="text-2xl font-bold mb-2">{metadata.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{metadata.date}</p>
      <article
        className="prose prose-neutral"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </main>
  );
}

// 가능한 모든 글의 slug를 경로로 만듦
export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getPostSlugs().map((filename) => filename.replace(/\.md$/, ""));
  const paths = slugs.map((slug) => ({ params: { slug } }));

  return {
    paths,
    fallback: false,
  };
};

// 각 글에 대한 데이터를 HTML로 변환해서 props로 넘김
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const { metadata, contentHtml } = await getPostHtml(slug);

  return {
    props: {
      slug,
      metadata,
      contentHtml,
    },
  };
};
