import Link from "next/link";

export default function SiteNav() {
  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-geist-mono)] text-white font-semibold tracking-tight"
        >
          Secure Shuttle
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/escrows"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/pay"
            className="text-sm bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg font-medium text-white"
          >
            New Payment
          </Link>
        </div>
      </div>
    </nav>
  );
}
