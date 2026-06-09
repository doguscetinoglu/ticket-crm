import type { Metadata } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: "İzin Portalı",
  description: "Çalışan İzin Takip ve Onay Sistemi",
};

export default function LeavePortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="lp-root">{children}</div>;
}
