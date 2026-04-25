/**
 * Inline logo components — use these inside the app where the mark should
 * inherit the active brand color via currentColor. For static use (favicons,
 * external sites, README), reference the files in /public/images/ instead.
 */

export function LogoMark({
  size = 28,
  className,
  checkColor = "var(--primary-foreground, #ffffff)",
}: {
  size?: number;
  className?: string;
  checkColor?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="22" width="34" height="34" rx="7" fill="currentColor" opacity="0.25" />
      <rect x="13" y="13" width="34" height="34" rx="7" fill="currentColor" opacity="0.5" />
      <rect x="22" y="4" width="34" height="34" rx="7" fill="currentColor" />
      <path
        d="M30 21 L36 27 L47 16"
        stroke={checkColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWordmark({
  iconSize = 28,
  textClass = "text-foreground",
  className,
}: {
  iconSize?: number;
  textClass?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={iconSize} className="text-primary shrink-0" />
      <span className={`text-[15px] font-semibold tracking-tight ${textClass}`}>
        TaskFlow
      </span>
    </span>
  );
}
