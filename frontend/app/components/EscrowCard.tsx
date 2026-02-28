import Link from "next/link";
import type { Escrow } from "@/app/lib/types";
import EscrowStatusBadge from "./EscrowStatusBadge";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function EscrowCard({ escrow }: { escrow: Escrow }) {
  const solAmount = escrow.expected_amount_lamports
    ? (escrow.expected_amount_lamports / 1_000_000_000).toFixed(4)
    : null;

  return (
    <Link
      href={`/escrow/${escrow.public_id}`}
      className="block bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-neutral-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold truncate">
          {escrow.label || "Untitled Escrow"}
        </h3>
        <EscrowStatusBadge status={escrow.status} />
      </div>
      <p className="font-[family-name:var(--font-geist-mono)] text-xs text-neutral-500 truncate mb-3">
        {escrow.public_key}
      </p>
      <div className="flex items-center justify-between text-sm">
        {solAmount && (
          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-300">
            {solAmount} SOL
          </span>
        )}
        <span className="text-neutral-500 text-xs ml-auto">
          {timeAgo(escrow.created_at)}
        </span>
      </div>
    </Link>
  );
}
