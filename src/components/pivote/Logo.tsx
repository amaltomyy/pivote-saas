export function Logo({ width = 160, height = 50 }: { width?: number; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 100"
      width={width}
      height={height}
      role="img"
      aria-label="Pivot'e"
      className="block shrink-0"
      preserveAspectRatio="xMinYMid meet"
    >
      {/* Circular mark: rounded "P" bowl with an inner counter and apostrophe */}
      <g transform="translate(8, 12)">
        <circle cx="38" cy="38" r="36" fill="#004E64" className="dark:hidden" />
        <circle cx="38" cy="38" r="36" fill="#3B91A8" className="hidden dark:block" />
        <path
          d="M 20 66 L 20 24 A 10 10 0 0 1 30 14 L 42 14 A 17 17 0 0 1 42 48 L 34 48"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 55 24 C 59 28, 59 34, 55 38"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
      <text
        x="98"
        y="68"
        className="fill-[#172126] dark:fill-[#F2F6F7]"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="50"
        letterSpacing="-1.5"
      >
        Pivot
        <tspan className="fill-[#004E64] dark:fill-[#3B91A8]">&apos;e</tspan>
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
