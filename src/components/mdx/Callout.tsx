import { AlertCircle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "tip";

const toneStyles: Record<
  Tone,
  { icon: ReactNode; color: string; bg: string; border: string }
> = {
  info: {
    icon: <Info size={18} />,
    color: "var(--tone-info)",
    bg: "var(--tone-info-bg)",
    border: "var(--tone-info)",
  },
  success: {
    icon: <CheckCircle2 size={18} />,
    color: "var(--tone-success)",
    bg: "var(--tone-success-bg)",
    border: "var(--tone-success)",
  },
  warning: {
    icon: <AlertCircle size={18} />,
    color: "var(--tone-warning)",
    bg: "var(--tone-warning-bg)",
    border: "var(--tone-warning)",
  },
  tip: {
    icon: <Lightbulb size={18} />,
    color: "var(--tone-tip)",
    bg: "var(--tone-tip-bg)",
    border: "var(--tone-tip)",
  },
};

export default function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const s = toneStyles[tone];
  return (
    <aside
      className="my-6 rounded-lg px-4 py-3"
      style={{
        background: s.bg,
        borderLeft: `3px solid ${s.border}`,
      }}
    >
      <div
        className="flex items-center gap-2 mb-1 text-sm font-semibold"
        style={{ color: s.color }}
      >
        {s.icon}
        {title && <span>{title}</span>}
      </div>
      <div style={{ color: "var(--text-body)" }}>{children}</div>
    </aside>
  );
}
