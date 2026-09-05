export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--mr-bg)" }}
    >
      <div className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
        Loading…
      </div>
    </div>
  );
}
