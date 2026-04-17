import { Html, Head, Main, NextScript } from "next/document";

/**
 * 테마 플래시(Flash of Incorrect Theme) 방지용 인라인 스크립트.
 * React가 hydrate 되기 전에 html[data-theme]을 세팅해 놓는다.
 */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="ko">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
