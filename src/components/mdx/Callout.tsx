import { AlertCircle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "tip";

const toneStyles: Record<
  Tone,
  { icon: ReactNode; color: string; bg: string; border: string }
> = {
  info: {
    icon: <Info size={18} />,
    color: "#2563eb",
    bg: "var(--accent-softer)",
    border: "var(--accent)",
  },
  success: {
    icon: <CheckCircle2 size={18} />,
    color: "#16a34a",
    bg: "rgba(34,197,94,0.08)",
    border: "#16a34a",
  },
  warning: {
    icon: <AlertCircle size={18} />,
    color: "#d97706",
    bg: "rgba(234,179,8,0.08)",
    border: "#d97706",
  },
  tip: {
    icon: <Lightbulb size={18} />,
    color: "#7c3aed",
    bg: "rgba(139,92,246,0.08)",
    border: "#7c3aed",
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
