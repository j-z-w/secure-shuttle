import type { EscrowStatus } from "@/app/lib/types";

const statusConfig: Record<
  EscrowStatus,
  { label: string; bg: string; text: string; ring: string }
> = {
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
  const cfg = statusConfig[status] ?? statusConfig.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}
