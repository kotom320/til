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
 * - shiki 기반 듀얼 테마(min-light/nord) 코드 하이라이팅
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
      // Industry 는 쿨한 테크니컬 그라운드라 웜 계열(vitesse)이 맞지 않는다.
      // min-light 는 문자열이 스틸블루(#2b5581)라 accent 와 같은 계열로 붙는다.
      themes: { light: "min-light", dark: "nord" },
      defaultColor: false,
    })
    .use(rehypeCodeChrome)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return String(file);
}
