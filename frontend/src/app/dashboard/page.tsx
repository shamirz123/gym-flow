"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FaCalendarCheck, FaEnvelope, FaIdCard, FaMoneyBillWave, FaQrcode, FaTriangleExclamation, FaUserClock, FaUserPlus, FaWhatsapp,
} from "react-icons/fa6";
import { gymUrl } from "@/lib/api";
import { api, fmtDate, rs, wa } from "@/lib/dashboardApi";
import type { Member } from "@/lib/types";
import { Badge, useDashboard } from "@/components/dashboard/ui";

type Stats = {
  activeMembers: number; expiring: number; expired: number; totalMembers: number; todayCheckins: number;
  expiringList: Member[];
  newLeads?: number; pendingBookings?: number; unreadMessages?: number;
  recentLeads?: { id: string; name: string; phone: string; plan: string; goal: string; status: string; createdAt: string }[];
  revenue?: { label: string; total: number }[]; revenueThisMonth?: number; revenueLastMonth?: number;
};

export default function DashboardPage() {
  return <Suspense><Dashboard /></Suspense>;
}

function Dashboard() {
  const { toast, gym, can } = useDashboard();
  const welcome = useSearchParams().get("welcome");
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/gym/stats").then(setS).catch((e) => toast(e.message, "err"));
  }, [toast]);

  if (!s) return <div className="adm-loading">Loading dashboard...</div>;

  const growth = s.revenueLastMonth ? Math.round((((s.revenueThisMonth ?? 0) - s.revenueLastMonth) / s.revenueLastMonth) * 100) : null;
  const max = Math.max(...(s.revenue ?? []).map((r) => r.total), 1);

  const cards: { href: string; icon: IconType; color: string; label: string; value: string | number; sub?: React.ReactNode; show: boolean }[] = [
    { href: "/dashboard/attendance", icon: FaQrcode, color: "#ff4d1c", label: "Check-ins today", value: s.todayCheckins, show: true },
    { href: "/dashboard/members?status=active", icon: FaIdCard, color: "#22c55e", label: "Active Members", value: s.activeMembers, show: true },
    { href: "/dashboard/members?status=expiring", icon: FaUserClock, color: "#eab308", label: "Expiring (7 days)", value: s.expiring, show: true },
    { href: "/dashboard/members?status=expired", icon: FaTriangleExclamation, color: "#ef4444", label: "Fee Pending", value: s.expired, show: true },
    {
      href: "/dashboard/payments", icon: FaMoneyBillWave, color: "#a855f7", label: "Revenue (this month)", value: rs(s.revenueThisMonth), show: s.revenueThisMonth !== undefined,
      sub: growth !== null && <em style={{ color: growth >= 0 ? "#4ade80" : "#f87171" }}>{growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% vs last month</em>,
    },
    { href: "/dashboard/leads", icon: FaUserPlus, color: "#3b82f6", label: "New Trial Leads", value: s.newLeads ?? 0, show: s.newLeads !== undefined },
    { href: "/dashboard/bookings", icon: FaCalendarCheck, color: "#06b6d4", label: "Pending Bookings", value: s.pendingBookings ?? 0, show: s.pendingBookings !== undefined },
    { href: "/dashboard/messages", icon: FaEnvelope, color: "#f472b6", label: "Unread Messages", value: s.unreadMessages ?? 0, show: s.unreadMessages !== undefined },
  ];

  const reminder = (m: Member) => {
    const days = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / 864e5);
    return days < 0
      ? `Hello ${m.name}! Your ${gym.name} membership expired on ${fmtDate(m.expiryDate)}. Please pay your fee (${rs(m.monthlyFee)}) to continue. Thank you!`
      : `Hello ${m.name}! Your ${gym.name} membership expires ${days === 0 ? "today" : `in ${days} days`} (${fmtDate(m.expiryDate)}). Fee: ${rs(m.monthlyFee)}. Thank you!`;
  };

  return (
    <>
      {welcome && (
        <div className="adm-card" style={{ borderColor: "var(--primary)" }}>
          <h3>🎉 {gym.name} is ready!</h3>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>
            Your website is live: <a href={gymUrl(gym.slug)} target="_blank" rel="noopener" style={{ color: "var(--primary)" }}>{gymUrl(gym.slug).replace(/^https?:\/\//, "")}</a>.
            Next, add your phone and address in Settings, then add your members.
          </p>
          <div className="adm-toolbar">
            <Link href="/dashboard/settings" className="adm-btn primary">1. Settings</Link>
            <Link href="/dashboard/members" className="adm-btn">2. Add members</Link>
            <Link href="/dashboard/staff" className="adm-btn">3. Invite staff</Link>
          </div>
        </div>
      )}

      <div className="adm-stats">
        {cards.filter((c) => c.show).map((c) => (
          <Link key={c.label} href={c.href} className="adm-stat">
            <div className="ic" style={{ background: c.color + "22", color: c.color }}><c.icon /></div>
            <div><span>{c.label}</span><strong>{c.value}</strong>{c.sub}</div>
          </Link>
        ))}
      </div>

      <div className={s.revenue ? "adm-grid-2" : ""}>
        {s.revenue && (
          <div className="adm-card">
            <h3>Revenue — last 6 months <Link href="/dashboard/payments" className="adm-btn sm">All payments</Link></h3>
            <div className="adm-chart">
              {s.revenue.map((r) => (
                <div className="bar" key={r.label}>
                  <div style={{ height: `${(r.total / max) * 100}%` }} data-v={rs(r.total)} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="adm-card">
          <h3>⚠️ Fee reminders <Link href="/dashboard/members?status=expiring" className="adm-btn sm">View all</Link></h3>
          <div className="adm-list">
            {s.expiringList.length === 0 && <div className="adm-empty">All member fees are up to date 🎉</div>}
            {s.expiringList.map((m) => (
              <div key={m.id}>
                <div className="grow"><b>{m.name}</b><small>{m.plan} · {m.status === "expired" ? "Expired" : "Expires"} {fmtDate(m.expiryDate)}</small></div>
                <Badge value={m.status} />
                {can("members:write") && <a className="adm-btn icon green" href={wa(m.phone, reminder(m))} target="_blank" rel="noopener" title="WhatsApp reminder"><FaWhatsapp /></a>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {s.recentLeads && (
        <div className="adm-card">
          <h3>Latest trial leads <Link href="/dashboard/leads" className="adm-btn sm">View all</Link></h3>
          <div className="adm-list">
            {s.recentLeads.length === 0 && <div className="adm-empty">No leads yet</div>}
            {s.recentLeads.map((l) => (
              <div key={l.id}>
                <div className="grow"><b>{l.name}</b><small>{l.phone} · {l.plan} · {l.goal} · {fmtDate(l.createdAt)}</small></div>
                <Badge value={l.status} />
                <a className="adm-btn icon green" target="_blank" rel="noopener" title="WhatsApp"
                  href={wa(l.phone, `Hello ${l.name}! You requested a free trial at ${gym.name}. When would you like to visit?`)}>
                  <FaWhatsapp />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
