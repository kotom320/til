import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { GetStaticPaths, GetStaticProps } from "next";
import { remark } from "remark";
import html from "remark-html";

interface Props {
  title: string;
  date: string;
  contentHtml: string;
}

export default function PostPage({ title, date, contentHtml }: Props) {
  return (
    <div>
      <article className="prose prose-neutral max-w-none">
        <h1>{title}</h1>
        <p className="text-sm text-gray-500">{date}</p>
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </article>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const postsDir = path.join(process.cwd(), "posts");
  const categories = fs.readdirSync(postsDir);

  const paths: { params: { category: string; slug: string } }[] = [];

  for (const category of categories) {
    const categoryPath = path.join(postsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      paths.push({
        params: { category, slug },
      });
    }
  }

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { category, slug } = params as { category: string; slug: string };

  const fullPath = path.join(process.cwd(), "posts", category, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    props: {
      title: data.title ?? slug,
      date: data.date ?? "",
      contentHtml,
    },
  };
};
