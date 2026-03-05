import type { ApplicationStatus } from "@/lib/types";

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  neu: {
    label: "Neu",
    className: "bg-yellow-100 text-yellow-700",
  },
  in_bearbeitung: {
    label: "In Bearbeitung",
    className: "bg-blue-100 text-blue-700",
  },
  genehmigt: {
    label: "Genehmigt",
    className: "bg-green-100 text-green-700",
  },
  abgelehnt: {
    label: "Abgelehnt",
    className: "bg-red-100 text-red-700",
  },
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export default function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.neu;
  return (
    <span
      className={`inline-flex text-xs px-2 py-0.5 rounded-full ${config.className}`}
    >
      {config.label}
    </span>
  );
}
