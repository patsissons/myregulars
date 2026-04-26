interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 44 }: LogoMarkProps) {
  const radius = Math.round((size * 231) / 1024);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, borderRadius: radius, overflow: "hidden" }}
    >
      <rect width="1024" height="1024" fill="#f5e3df" />
      <circle
        cx="512"
        cy="512"
        r="213"
        fill="none"
        stroke="#9a3f4b"
        strokeWidth="6.4"
        opacity="0.35"
      />
      <circle
        cx="512"
        cy="512"
        r="341"
        fill="none"
        stroke="#9a3f4b"
        strokeWidth="6.4"
        opacity="0.25"
      />
      <circle cx="512" cy="512" r="85" fill="#9a3f4b" />
      <circle cx="661" cy="358" r="38" fill="#9a3f4b" />
      <circle cx="290" cy="606" r="47" fill="#9a3f4b" />
      <circle cx="742" cy="725" r="34" fill="#9a3f4b" />
      <circle cx="427" cy="196" r="30" fill="#9a3f4b" />
    </svg>
  );
}
