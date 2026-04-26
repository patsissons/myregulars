import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5e3df",
        borderRadius: 40,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width={160} height={160}>
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
    </div>,
    { ...size },
  );
}
