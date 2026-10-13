import type { ReactNode } from "react";
import type { Layer } from "@/data/types";

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-7">
      {eyebrow && <p className="text-xs font-semibold tracking-[0.12em] text-teal-dark uppercase">{eyebrow}</p>}
      <h1 className="mt-1 text-4xl font-semibold tracking-[-0.045em] text-navy">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-sm text-muted">{children}</div>}
    </header>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(18,32,51,0.04)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          {title && <h2 className="font-semibold tracking-[-0.01em] text-navy">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-sand text-ink",
  good: "bg-aqua text-teal-dark ring-1 ring-teal/30",
  warn: "bg-[#fff3d6] text-[#7a5300]",
  bad: "bg-coral-soft text-[#8a2d1c]",
  info: "bg-aqua text-teal-dark",
  dark: "bg-navy text-white",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

const LAYER_COPY: Record<Layer, { label: string; tone: Tone; who: string }> = {
  private: { label: "Private", tone: "dark", who: "Only you" },
  program: { label: "Program", tone: "info", who: "You + program staff and mentors" },
  reported: { label: "Reported", tone: "good", who: "Rolled up for funders after you confirm" },
};

export function LayerBadge({ layer }: { layer: Layer }) {
  const c = LAYER_COPY[layer];
  return (
    <span title={c.who}>
      <Badge tone={c.tone}>{c.label}</Badge>
    </span>
  );
}

export const layerWho = (layer: Layer) => LAYER_COPY[layer].who;

export function ProgressBar({ value, max, tone = "lime" }: { value: number; max: number; tone?: "lime" | "coral" | "navy" }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color = tone === "lime" ? "bg-lime" : tone === "coral" ? "bg-coral" : "bg-teal-dark";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-[0_1px_2px_rgba(18,32,51,0.04)]">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-navy">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", type = "button", disabled }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-navy text-white shadow-sm hover:bg-navy-light"
      : "border border-line bg-paper text-navy hover:border-teal/50 hover:bg-aqua/35";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}>
      {children}
    </button>
  );
}

/** Small "builds: …" tag that ties program work to the company record. */
export function Builds({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-navy">
      <span className="rounded-md bg-aqua px-1.5 py-0.5 font-semibold text-teal-dark">Builds</span>
      {children}
    </span>
  );
}

/** Progress ring with the value in the middle. */
export function Ring({ value, max, label, size = 88 }: { value: number; max: number; label: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max === 0 ? 0 : Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value} of ${max}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sand)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct >= 1 ? "var(--color-teal-dark)" : "var(--color-lime)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-navy font-sans font-semibold" fontSize={size / 4}>
          {value}
          <tspan className="fill-muted font-sans" fontSize={size / 8}>
            /{max}
          </tspan>
        </text>
      </svg>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/** One dot per week, oldest on the left. `weeks[0]` is this week. */
export function WeekDots({ weeks, labels }: { weeks: boolean[]; labels?: string[] }) {
  const ordered = [...weeks].reverse();
  return (
    <div className="flex items-end gap-1.5">
      {ordered.map((on, i) => {
        const isCurrent = i === ordered.length - 1;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`block h-4 w-4 rounded-full ${on ? "bg-teal ring-1 ring-teal-dark/20" : isCurrent ? "border-2 border-dashed border-teal/60" : "bg-sand"}`}
              title={on ? "Active" : isCurrent ? "This week" : "Missed"}
            />
            {labels && <span className="text-[10px] text-muted">{labels[labels.length - 1 - i]}</span>}
          </div>
        );
      })}
    </div>
  );
}
