export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Founderive"
      className={`inline-flex font-sans text-[20px] leading-none font-semibold tracking-[-0.045em] ${className}`}
    >
      <span aria-hidden="true" className="text-teal">founder</span>
      <span aria-hidden="true" className="text-navy">ive</span>
    </span>
  );
}
