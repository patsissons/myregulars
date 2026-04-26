"use client";

import { useState } from "react";
import { computeInitials, hueFromString } from "@/lib/datastore/helpers";

interface AvatarProps {
  name: string;
  size?: number;
  photoUrl?: string;
  className?: string;
}

export function Avatar({ name, size = 36, photoUrl, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = computeInitials(name);
  const hue = hueFromString(initials);
  const fontSize = Math.round(size * 0.4);

  const showImg = photoUrl && !imgError;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        backgroundColor: showImg ? "transparent" : undefined,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- needs onError fallback for initials
        <img
          src={photoUrl}
          alt={name}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            borderRadius: "50%",
            fontSize,
            fontWeight: 600,
            lineHeight: 1,
            // Use CSS custom properties for theme-aware colors
            backgroundColor: `oklch(var(--avatar-bg-l, 0.92) 0.04 ${hue})`,
            color: `oklch(var(--avatar-fg-l, 0.30) 0.07 ${hue})`,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
