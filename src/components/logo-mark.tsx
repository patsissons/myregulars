interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 44 }: LogoMarkProps) {
  const radius = Math.round(size * (12 / 44));
  const fontSize = Math.round(size * (18 / 44));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "var(--mr-text)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "var(--mr-bg)",
          fontSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          userSelect: "none",
        }}
      >
        R
      </span>
    </div>
  );
}
