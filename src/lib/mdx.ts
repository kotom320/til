import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import rehypeCodeChrome from "./rehype-code-chrome";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

/**
 * MDX 문자열을 빌드 타임에 직렬화한다.
 * - shiki 기반 듀얼 테마 코드 하이라이팅
 * - remark-gfm (테이블/체크리스트)
 * - MDX 안에서 React 컴포넌트 사용 가능 (<Callout>, <ProjectLink> 등)
 *
 * Node 환경(getStaticProps)에서만 호출해야 한다.
 */
export async function serializeMdx(
  source: string
): Promise<MDXRemoteSerializeResult> {
  return serialize(source, {
    parseFrontmatter: false, // frontmatter는 gray-matter로 이미 분리되어 들어옴
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [
          rehypeShiki,
          {
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: false,
          },
        ] as never,
        rehypeCodeChrome as never,
      ],
      // format: "md"로 파싱해 기존 Markdown 콘텐츠의 `<`, `<=` 등 수학 기호가
      // JSX로 오인되는 것을 방지. JSX 인라인은 포기하되 cross-link/시리즈 등
      // 주요 기능은 frontmatter 기반으로 유지한다.
      format: "md",
    },
  });
}
