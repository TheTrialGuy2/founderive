import type { ReactNode } from "react";

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="text-xs font-semibold tracking-[0.12em] text-teal-dark uppercase">{eyebrow}</p>}
      <h1 className="mt-1 font-serif text-[2rem] leading-[1.15] font-normal tracking-[-0.025em] text-navy md:text-4xl">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-[15px] leading-6 text-muted">{children}</div>}
    </header>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-paper p-5 ${className}`}>
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

export function ProgressBar({ value, max, tone = "lime", label }: { value: number; max: number; tone?: "lime" | "coral" | "navy"; label?: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color = tone === "lime" ? "bg-lime" : tone === "coral" ? "bg-coral" : "bg-teal-dark";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sand" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

