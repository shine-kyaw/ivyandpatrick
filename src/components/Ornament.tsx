/** The small gold divider from the printed card: a rule, a lens and two seeds. */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <svg className={`divider ${className}`} viewBox="0 0 240 14" aria-hidden="true" focusable="false">
      <path d="M0 7h92M148 7h92" stroke="currentColor" strokeWidth="1" />
      <path d="M104 7c5-4.6 11-6 16-6s11 1.4 16 6c-5 4.6-11 6-16 6s-11-1.4-16-6z" fill="currentColor" />
      <ellipse cx="97" cy="7" rx="4" ry="2.2" fill="currentColor" />
      <ellipse cx="143" cy="7" rx="4" ry="2.2" fill="currentColor" />
    </svg>
  );
}

type SprigProps = { name: "a" | "b" | "c" | "d"; className?: string };
const SIZES = { a: [347, 377], b: [300, 432], c: [313, 302], d: [256, 224] } as const;

/** A vine lifted from the couple's chinoiserie card. Purely decorative. */
export function Sprig({ name, className = "" }: SprigProps) {
  const [w, h] = SIZES[name];
  return (
    <img
      className={`sprig sprig--${name} ${className}`}
      src={`/art/sprig-${name}.webp`}
      width={w}
      height={h}
      alt=""
      loading="lazy"
      decoding="async"
      aria-hidden="true"
    />
  );
}
