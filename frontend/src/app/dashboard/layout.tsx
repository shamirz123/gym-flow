import type { Metadata } from "next";
import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/AdminShell";
import "./dashboard.css";

export const metadata: Metadata = { title: "GymFlow Dashboard", robots: { index: false } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
