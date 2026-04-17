import { ExternalLink } from "lucide-react";

const PORTFOLIO_BASE = "https://kotom320.github.io/portfolio";

/**
 * 블로그 포스트 상단에 노출되는 "이 글은 [X] 포트폴리오의 확장편입니다" 배지.
 * frontmatter.portfolio 를 기반으로 자동 렌더될 수도 있고,
 * MDX 본문 중간에 명시적으로 사용할 수도 있다.
 */
export default function ProjectLink({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  return (
    <a
      href={`${PORTFOLIO_BASE}/projects/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 my-4 px-4 py-2.5 rounded-lg text-sm transition-colors no-underline"
      style={{
        background: "var(--accent-softer)",
        border: "1px solid var(--accent-soft)",
        color: "var(--accent)",
      }}
    >
      <span style={{ color: "var(--text-subtle)" }}>포트폴리오 확장편</span>
      <span className="font-medium">{title}</span>
      <ExternalLink size={14} />
    </a>
  );
}
