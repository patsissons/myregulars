"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { normalizeDatastoreUri } from "@/lib/datastore/uri";
import { navigate } from "@/lib/router/history";
import { routes, type Route } from "@/lib/router/routes";
import { useIsMobile } from "@/lib/use-media";

const BULLETS = [
  {
    title: "Organized by place",
    body: "Café, gym, bar — wherever you're a regular.",
  },
  {
    title: "Quick before you walk in",
    body: "Glance at faces and details in seconds.",
  },
  {
    title: "Yours to share",
    body: "Give a partner read-only access with one link.",
  },
];

const DESCRIPTION =
  "A small, private notebook for the regulars in your life. Your data stays in your own datastore — a GitHub Gist or a hosted account — yours to keep, share, or take with you.";

interface LandingScreenProps {
  route: Extract<Route, { kind: "landing" }>;
}

export function LandingScreen({ route }: LandingScreenProps) {
  const { isAuthenticated, hosted } = useAuth();
  const isMobile = useIsMobile();
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkError, setLinkError] = useState("");

  const open = route.open;
  const signedIn = isAuthenticated || hosted.isAuthenticated;

  // A share link (`?gist=` / `?vault=`) opens the vault straight away; the
  // landing entry is replaced so Back doesn't bounce through it.
  useEffect(() => {
    if (open) navigate(routes.vault(open), { replace: true, transition: "none" });
  }, [open]);

  // Returning users skip the pitch.
  useEffect(() => {
    if (!open && signedIn) navigate(routes.vaults(), { replace: true, transition: "none" });
  }, [open, signedIn]);

  function handleOpenByLink() {
    if (!linkInput.trim()) {
      setLinkError("Enter a vault link or gist ID.");
      return;
    }
    try {
      const uri = normalizeDatastoreUri(linkInput.trim());
      navigate(routes.vault(uri));
    } catch {
      setLinkError("Invalid vault link. Try a gist ID or share URL.");
    }
  }

  const linkField = (
    <div className="flex flex-1 items-center gap-2">
      <div className="flex-1">
        <Input
          placeholder="gist:abc123 or share URL"
          value={linkInput}
          onChange={(e) => {
            setLinkInput(e.target.value);
            setLinkError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleOpenByLink()}
          autoFocus
        />
        {linkError && (
          <p className="mt-1 text-[12px]" style={{ color: "var(--mr-danger)" }}>
            {linkError}
          </p>
        )}
      </div>
      <Button variant="primary" size="lg" onClick={handleOpenByLink}>
        Open
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className="safe-x flex min-h-dvh flex-col"
        style={{ background: "var(--mr-bg)", color: "var(--mr-text)" }}
      >
        <div className="safe-top flex flex-1 flex-col px-7 pt-[70px]">
          <LogoMark size={44} />

          <h1
            className="mt-8"
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              color: "var(--mr-text)",
            }}
          >
            Remember the people
            <br />
            at the places you go.
          </h1>

          <p className="mt-4 text-[14px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
            {DESCRIPTION}
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {BULLETS.map((bullet) => (
              <div key={bullet.title} className="flex items-start gap-3">
                <div
                  className="mt-1.5 flex-shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--mr-accent)",
                  }}
                />
                <div>
                  <p className="text-[14px] font-[500]" style={{ color: "var(--mr-text)" }}>
                    {bullet.title}
                  </p>
                  <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
                    {bullet.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="safe-bottom mt-auto flex flex-col gap-3 pt-8 pb-10">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate(routes.connect())}
              className="text-[14px]"
              style={{ paddingTop: 14, paddingBottom: 14, height: "auto" } as React.CSSProperties}
            >
              Get started
            </Button>
            {!showLinkInput ? (
              <button
                type="button"
                onClick={() => setShowLinkInput(true)}
                className="py-2 text-center text-[13px] font-[500]"
                style={{ color: "var(--mr-dim)" }}
              >
                Have a vault link? Open it
              </button>
            ) : (
              linkField
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--mr-bg)", color: "var(--mr-text)" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-[540px] px-8">
          <LogoMark size={44} />

          <h1
            className="mt-8"
            style={{
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--mr-text)",
            }}
          >
            Remember the people
            <br />
            at the places you go.
          </h1>

          <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
            {DESCRIPTION}
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(routes.connect())}
              className="gap-2"
            >
              Get started
            </Button>

            {!showLinkInput ? (
              <Button variant="secondary" size="lg" onClick={() => setShowLinkInput(true)}>
                Open by link
              </Button>
            ) : (
              linkField
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
