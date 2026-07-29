import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import rehypeCodeChrome from "./rehype-code-chrome";

/**
 * 마크다운 문자열을 HTML 문자열로 변환합니다.
 * - shiki 기반 듀얼 테마(github-light-default/nord) 코드 하이라이팅
 * - rehype-raw로 인라인 HTML 지원
 * - remark-gfm으로 테이블/체크리스트 등 GFM 지원
 *
 * 이 함수는 Node 환경(getStaticProps)에서만 호출해야 합니다.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeShiki, {
      // min-light 는 채도가 낮아 밝은 파란 그라운드에서 흐리게 묻힌다.
      // github-light-default 가 색 구분이 또렷하다.
      themes: { light: "github-light-default", dark: "nord" },
      defaultColor: false,
    })
    .use(rehypeCodeChrome)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return String(file);
}
