import { GitHubMark } from "@/components/icons/github-mark";
import type { HostedAuthProviderId } from "@/lib/datastore/constants";

interface MarkProps {
  size?: number;
  className?: string;
}

function Svg({
  size = 20,
  className,
  viewBox = "0 0 24 24",
  children,
}: MarkProps & { viewBox?: string; children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      {children}
    </svg>
  );
}

export function GoogleMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.78 4.4-5.35 4.4-3.22 0-5.85-2.66-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.9 14.6 3 12 3 6.98 3 2.9 7.03 2.9 12s4.08 9 9.1 9c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.06-.15-1.51z" />
    </Svg>
  );
}

export function AppleMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M16.365 1.43c0 1.14-.42 2.05-1.13 2.79-.79.84-1.86 1.43-2.88 1.35-.13-1.09.42-2.18 1.07-2.86.74-.79 2.02-1.36 2.94-1.28zM20.5 17.05c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.93-.99-4.02-.98-2.09.01-2.52.99-4.06.97-1.73-.02-3.06-1.79-4.05-3.36C-.01 16.6-.3 11.27 1.34 8.55c1.04-1.72 2.69-2.73 4.24-2.73 1.58 0 2.57 1 3.87 1 1.26 0 2.03-1 3.86-1 1.38 0 2.84.75 3.88 2.05-3.41 1.87-2.86 6.74.31 8.18z" />
    </Svg>
  );
}

export function MetaMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 6C4.46 6 2 8.9 2 12s2.46 6 5.5 6c2.1 0 3.6-1.3 4.5-2.8C12.9 16.7 14.4 18 16.5 18 19.54 18 22 15.1 22 12s-2.46-6-5.5-6c-2.1 0-3.6 1.3-4.5 2.8C11.1 7.3 9.6 6 7.5 6zm0 2.5c1.3 0 2.2 1.05 2.9 2.15l.6 1.35-.6 1.35c-.7 1.1-1.6 2.15-2.9 2.15-1.6 0-2.8-1.6-2.8-3.5S5.9 8.5 7.5 8.5zm9 0c1.6 0 2.8 1.6 2.8 3.5s-1.2 3.5-2.8 3.5c-1.3 0-2.2-1.05-2.9-2.15l-.6-1.35.6-1.35c.7-1.1 1.6-2.15 2.9-2.15z" />
    </Svg>
  );
}

export function XMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
  );
}

/** Renders the brand mark for a hosted social-login provider. */
export function HostedProviderMark({
  provider,
  size,
  className,
}: MarkProps & { provider: HostedAuthProviderId }) {
  switch (provider) {
    case "github":
      return <GitHubMark size={size} className={className} />;
    case "google":
      return <GoogleMark size={size} className={className} />;
    case "apple":
      return <AppleMark size={size} className={className} />;
    case "facebook":
      return <MetaMark size={size} className={className} />;
    case "twitter":
      return <XMark size={size} className={className} />;
  }
}
