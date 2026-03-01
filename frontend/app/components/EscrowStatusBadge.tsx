import type { EscrowStatus } from "@/app/lib/types";

type StatusStyle = { label: string; bg: string; text: string; ring: string };

const statusConfig: Record<string, StatusStyle> = {
  open: {
    label: "Open",
    bg: "bg-slate-900",
    text: "text-slate-300",
    ring: "ring-slate-700",
  },
  roles_pending: {
    label: "Roles Pending",
    bg: "bg-blue-950",
    text: "text-blue-300",
    ring: "ring-blue-700",
  },
  roles_claimed: {
    label: "Roles Claimed",
    bg: "bg-indigo-950",
    text: "text-indigo-300",
    ring: "ring-indigo-700",
  },
  funded: {
    label: "Funded",
    bg: "bg-cyan-950",
    text: "text-cyan-300",
    ring: "ring-cyan-700",
  },
  service_complete: {
    label: "Service Complete",
    bg: "bg-emerald-950",
    text: "text-emerald-300",
    ring: "ring-emerald-700",
  },
  disputed: {
    label: "Disputed",
    bg: "bg-red-950",
    text: "text-red-300",
    ring: "ring-red-700",
  },
  active: {
    label: "Active",
    bg: "bg-blue-950",
    text: "text-blue-300",
    ring: "ring-blue-700",
  },
  release_pending: {
    label: "Releasing",
    bg: "bg-yellow-950",
    text: "text-yellow-300",
    ring: "ring-yellow-700",
  },
  released: {
    label: "Released",
    bg: "bg-green-950",
    text: "text-green-300",
    ring: "ring-green-700",
  },
  refund_pending: {
    label: "Refunding",
    bg: "bg-orange-950",
    text: "text-orange-300",
    ring: "ring-orange-700",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-neutral-800",
    text: "text-neutral-400",
    ring: "ring-neutral-600",
  },
};

export default function EscrowStatusBadge({ status }: { status: EscrowStatus }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    bg: "bg-neutral-900",
    text: "text-neutral-300",
    ring: "ring-neutral-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}
