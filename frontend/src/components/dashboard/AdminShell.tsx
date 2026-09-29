"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FaArrowUpRightFromSquare, FaBars, FaCalendarCheck, FaChartPie, FaCircleQuestion, FaClock, FaCreditCard, FaDumbbell,
  FaEnvelope, FaGear, FaIdCard, FaImages, FaListCheck, FaMoneyBillWave, FaNewspaper, FaQrcode, FaRightFromBracket,
  FaServer, FaStar, FaTags, FaUserPlus, FaUsersGear, FaUserTie,
} from "react-icons/fa6";
import { gymUrl } from "@/lib/api";
import { api, getGymId, getToken, setGymId, setToken } from "@/lib/dashboardApi";
import type { Me, Permission } from "@/lib/types";
import { DashboardContext, Toast, type Counts } from "./ui";

type NavItem = { label: string } | { href: string; icon: IconType; text: string; perm?: Permission; superAdmin?: true; count?: keyof Counts };

const NAV: NavItem[] = [
  { label: "Main" },
  { href: "/dashboard", icon: FaChartPie, text: "Dashboard", perm: "dashboard:view" },
  { href: "/dashboard/attendance", icon: FaQrcode, text: "Attendance", perm: "attendance:view" },
  { href: "/dashboard/members", icon: FaIdCard, text: "Members", perm: "members:view" },
  { href: "/dashboard/payments", icon: FaMoneyBillWave, text: "Payments", perm: "payments:view" },
  { label: "Website Inbox" },
  { href: "/dashboard/leads", icon: FaUserPlus, text: "Trial Leads", perm: "inbox:view", count: "newLeads" },
  { href: "/dashboard/bookings", icon: FaCalendarCheck, text: "Class Bookings", perm: "inbox:view", count: "pendingBookings" },
  { href: "/dashboard/messages", icon: FaEnvelope, text: "Messages", perm: "inbox:view", count: "unreadMessages" },
  { href: "/dashboard/subscribers", icon: FaNewspaper, text: "Subscribers", perm: "inbox:view" },
  { label: "Website Content" },
  { href: "/dashboard/classes", icon: FaClock, text: "Class Schedule", perm: "content:view" },
  { href: "/dashboard/plans", icon: FaTags, text: "Membership Plans", perm: "content:write" },
  { href: "/dashboard/programs", icon: FaDumbbell, text: "Programs", perm: "content:write" },
  { href: "/dashboard/trainers", icon: FaUserTie, text: "Trainers", perm: "content:write" },
  { href: "/dashboard/gallery", icon: FaImages, text: "Gallery", perm: "content:write" },
  { href: "/dashboard/testimonials", icon: FaStar, text: "Testimonials", perm: "content:write" },
  { href: "/dashboard/features", icon: FaListCheck, text: "Features", perm: "content:write" },
  { href: "/dashboard/faqs", icon: FaCircleQuestion, text: "FAQs", perm: "content:write" },
  { label: "Gym" },
  { href: "/dashboard/staff", icon: FaUsersGear, text: "Staff & Roles", perm: "staff:manage" },
  { href: "/dashboard/billing", icon: FaCreditCard, text: "Billing & Plan", perm: "billing:manage" },
  { href: "/dashboard/settings", icon: FaGear, text: "Settings", perm: "content:write" },
  { label: "Platform" },
  { href: "/dashboard/platform", icon: FaServer, text: "All Gyms (Admin)", superAdmin: true },
];

const ROLE_LABEL = { OWNER: "Owner", RECEPTIONIST: "Receptionist", TRAINER: "Trainer" };

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [gymId, setActiveGym] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({});
  const [open, setOpen] = useState(false);
  const [toastState, setToastState] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToastState({ msg, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastState(null), 3200);
  }, []);

  const refreshMe = useCallback(async () => {
    const profile = await api<Me>("/auth/me");
    setMe(profile);
    // Keep the selected gym if the user still belongs to it, otherwise use the first
    const current = profile.gyms.find((g) => g.id === getGymId()) ?? profile.gyms[0];
    setGymId(current?.id ?? null);
    setActiveGym(current?.id ?? null);
  }, []);

  const refreshCounts = useCallback(() => {
    if (!getGymId()) return;
    api<Counts>("/gym/stats").then((s) => setCounts({ newLeads: s.newLeads, pendingBookings: s.pendingBookings, unreadMessages: s.unreadMessages })).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) return void router.replace("/login");
    refreshMe().catch(() => router.replace("/login"));
  }, [router, refreshMe]);

  useEffect(() => { if (gymId) refreshCounts(); }, [gymId, refreshCounts]);
  useEffect(() => setOpen(false), [path]);

  const logout = () => { setToken(null); router.replace("/login"); };
  const switchGym = (id: string) => {
    setGymId(id);
    setActiveGym(id);
    router.push("/dashboard");
  };

  if (!me) return <div className="adm"><div className="adm-loading">Loading...</div></div>;

  const gym = me.gyms.find((g) => g.id === gymId);
  // A super admin who isn't staff at any gym: platform page only
  if (!gym) {
    return (
      <div className="adm">
        <div className="adm-content" style={{ maxWidth: 1200, margin: "0 auto" }}>
          {me.isSuperAdmin && path.startsWith("/dashboard/platform") ? (
            <DashboardContext.Provider value={{ me, gym: null as never, can: () => false, toast, counts, refreshCounts, refreshMe }}>{children}</DashboardContext.Provider>
          ) : (
            <div className="adm-empty">You are not a staff member of any gym. <Link href="/signup" style={{ color: "var(--primary)" }}>Register your gym</Link></div>
          )}
          <button className="adm-btn danger" onClick={logout}><FaRightFromBracket /> Logout</button>
        </div>
        <Toast toast={toastState} />
      </div>
    );
  }

  const can = (p: Permission) => gym.permissions.includes(p);
  const items = NAV.filter((n, i) => {
    if ("label" in n) {
      // Only show a section label if at least one link under it is visible
      const next = NAV.slice(i + 1);
      const end = next.findIndex((x) => "label" in x);
      return (end === -1 ? next : next.slice(0, end)).some((x) => "href" in x && (x.superAdmin ? me.isSuperAdmin : !x.perm || can(x.perm)));
    }
    return n.superAdmin ? me.isSuperAdmin : !n.perm || can(n.perm);
  });
  const links = items.filter((n): n is Extract<NavItem, { href: string }> => "href" in n);
  const current = [...links].sort((a, b) => b.href.length - a.href.length).find((n) => path === n.href || path.startsWith(n.href + "/"));
  const sub = gym.subscription;

  return (
    <DashboardContext.Provider value={{ me, gym, can, toast, counts, refreshCounts, refreshMe }}>
      <div className="adm">
        <aside className={`adm-side ${open ? "open" : ""}`}>
          <div className="adm-brand"><FaDumbbell /> GYMFLOW</div>
          <div className="adm-gym">
            {me.gyms.length > 1 ? (
              <select value={gym.id} onChange={(e) => switchGym(e.target.value)} aria-label="Gym">
                {me.gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            ) : (
              <b>{gym.name}</b>
            )}
            <small>{ROLE_LABEL[gym.role]} · {gym.plan === "PRO" ? "Pro" : "Starter"} plan</small>
          </div>
          <nav className="adm-nav">
            {items.map((n, i) =>
              "label" in n ? (
                <div key={i} className="adm-nav-label">{n.label}</div>
              ) : (
                <Link key={n.href} href={n.href} className={current?.href === n.href ? "active" : ""}>
                  <n.icon /> {n.text}
                  {n.count && (counts[n.count] ?? 0) > 0 && <span className="count">{counts[n.count]}</span>}
                </Link>
              )
            )}
          </nav>
          <div className="adm-side-foot">
            <a href={gymUrl(gym.slug)} target="_blank" rel="noopener" className="adm-btn"><FaArrowUpRightFromSquare /> View Website</a>
            <button className="adm-btn danger" onClick={logout}><FaRightFromBracket /> Logout</button>
          </div>
        </aside>
        <div className={`adm-overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
        <div className="adm-main">
          <header className="adm-top">
            <button className="adm-btn icon adm-burger" onClick={() => setOpen(true)} aria-label="Menu"><FaBars /></button>
            <h1>{current?.text || "Dashboard"}</h1>
            <div className="spacer" />
            <span style={{ color: "var(--muted)" }}>👋 {me.name}</span>
          </header>
          {(!sub.canWrite || sub.reason || (sub.daysLeft !== undefined && sub.daysLeft <= 5)) && (
            <div className={`adm-banner ${sub.canWrite ? "warn" : "err"}`}>
              {!sub.canWrite ? `⛔ ${sub.reason} — the dashboard is read-only for now.` : sub.reason ? `⚠️ ${sub.reason}` : `⏳ ${sub.daysLeft} days left in your free trial.`}
              {can("billing:manage") && <Link href="/dashboard/billing" className="adm-btn sm primary">Choose a plan</Link>}
            </div>
          )}
          <div className="adm-content" key={gym.id}>{children}</div>
        </div>
        <Toast toast={toastState} />
      </div>
    </DashboardContext.Provider>
  );
}
