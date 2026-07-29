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
 * - shiki 기반 듀얼 테마(vitesse-light/vitesse-dark) 코드 하이라이팅
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
      // github-* 는 쿨 그레이 계열이라 웜 페이퍼 배경 위에서 색이 튄다.
      themes: { light: "vitesse-light", dark: "vitesse-dark" },
      defaultColor: false,
    })
    .use(rehypeCodeChrome)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return String(file);
}
