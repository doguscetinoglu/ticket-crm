export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: "Bekliyor",     cls: "badge badge-pending" },
    IN_REVIEW: { label: "İncelemede",   cls: "badge badge-review" },
    APPROVED:  { label: "Onaylandı",    cls: "badge badge-approved" },
    REJECTED:  { label: "Reddedildi",   cls: "badge badge-rejected" },
    CANCELLED: { label: "İptal Edildi", cls: "badge badge-cancelled" },
  };
  const cfg = map[status] ?? map.PENDING;
  return <span className={cfg.cls}>{cfg.label}</span>;
}

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL:         "Yıllık İzin",
  SICK:           "Sağlık İzni",
  ADMINISTRATIVE: "İdari İzin",
  MATERNITY:      "Doğum İzni",
  OTHER:          "Diğer",
};

export function leaveTypeLabel(type: string): string {
  return LEAVE_TYPE_LABELS[type] ?? type;
}
