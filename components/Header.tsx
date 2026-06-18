import Link from "next/link";

// Rapport wordmark — present, editorial. Logo links home. no-print.
export function Wordmark({ size = "base" }: { size?: "base" | "lg" }) {
  const big = size === "lg";
  return (
    <span className="inline-flex items-baseline gap-2 font-serif tracking-tight text-ink">
      <span className={big ? "text-6xl" : "text-2xl"}>Rapport</span>
      <span className={`${big ? "h-2.5 w-2.5" : "h-1.5 w-1.5"} translate-y-[-0.1em] rounded-full bg-accent`} aria-hidden />
    </span>
  );
}

export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-hair bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-reading items-center justify-between px-6 py-3">
        <Link href="/" aria-label="Rapport — home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[11px] text-muted">
          <Link href="/me" className="hover:text-ink">
            /me
          </Link>
          {right}
        </nav>
      </div>
    </header>
  );
}
