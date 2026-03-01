"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function EscrowRouteHubPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const publicId = String(params.id);
  const joinToken = searchParams.get("join_token") ?? "";

  const claimHref = `/claim?public_id=${encodeURIComponent(publicId)}${
    joinToken ? `&join_token=${encodeURIComponent(joinToken)}` : ""
  }`;
  const senderHref = `/escrow/${encodeURIComponent(publicId)}/sender${
    joinToken ? `?join_token=${encodeURIComponent(joinToken)}` : ""
  }`;
  const recipientHref = `/escrow/${encodeURIComponent(publicId)}/recipient${
    joinToken ? `?join_token=${encodeURIComponent(joinToken)}` : ""
  }`;

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h1 className="text-2xl font-bold">Escrow Route Hub</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Public ID: <span className="font-mono text-neutral-200">{publicId}</span>
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          Continue through the shared claim page, then each user goes to sender or recipient workspace.
        </p>

        <div className="mt-5 grid gap-2">
          <Link
            href={claimHref}
            className="w-full text-center bg-[#0070f3] hover:bg-[#005bc4] rounded-lg px-3 py-2 text-sm"
          >
            Open Shared Claim Page
          </Link>
          <Link
            href={senderHref}
            className="w-full text-center bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-2 text-sm"
          >
            Open Sender Workspace
          </Link>
          <Link
            href={recipientHref}
            className="w-full text-center bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-2 text-sm"
          >
            Open Recipient Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
