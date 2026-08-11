export function Logo({ width = 160, height = 50 }: { width?: number; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 100"
      width={width}
      height={height}
      role="img"
      aria-label="Pivot'e"
      className="shrink-0"
    >
      <g transform="translate(10, 10)">
        <path d="M 25 80 L 40 20" stroke="#3A1078" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 40 20 C 75 20, 80 60, 50 60"
          fill="none"
          stroke="#3A1078"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle cx="50" cy="60" r="12" fill="#0B6640" />
      </g>
      <text
        x="105"
        y="75"
        className="fill-slate-900 dark:fill-white"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="52"
        letterSpacing="-1"
      >
        Pivot<tspan fill="#3A1078">&apos;e</tspan>
      </text>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
      Engineered &amp; Maintained by Amal Tomy © Pivot&apos;e. All Rights Reserved.
    </footer>
  );
}
