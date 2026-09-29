"use client";
import { useCallback, useEffect, useState } from "react";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import { gymUrl } from "@/lib/api";
import { api, fmtDate, rs } from "@/lib/dashboardApi";
import type { SaasPlan, SubscriptionStatus } from "@/lib/types";
import { Badge, NoAccess, useDashboard } from "@/components/dashboard/ui";

type PlatformGym = {
  id: string; slug: string; name: string; city: string; plan: SaasPlan; status: SubscriptionStatus;
  trialEndsAt: string | null; currentPeriodEnd: string | null; createdAt: string; members: number; staff: number; canWrite: boolean;
};
type PlatformStats = { gyms: number; members: number; mrr: number; byStatus: Partial<Record<SubscriptionStatus, number>> };

// For the GymFlow owner: all gyms, MRR and support actions
export default function PlatformPage() {
  const { me, toast } = useDashboard();
  const [gyms, setGyms] = useState<PlatformGym[] | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  const load = useCallback(() => {
    api<PlatformGym[]>("/platform/gyms").then(setGyms).catch((e) => toast(e.message, "err"));
    api<PlatformStats>("/platform/stats").then(setStats).catch(() => {});
  }, [toast]);
  useEffect(() => { if (me.isSuperAdmin) load(); }, [load, me.isSuperAdmin]);

  if (!me.isSuperAdmin) return <NoAccess />;

  const extendTrial = async (g: PlatformGym) => {
    try {
      await api(`/platform/gyms/${g.id}`, { method: "PATCH", body: { subscriptionStatus: "TRIALING", trialEndsAt: new Date(Date.now() + 14 * 864e5) } });
      toast(`${g.name}'s trial extended by 14 days`);
      load();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <>
      <div className="adm-stats">
        <div className="adm-stat"><div><span>Total gyms</span><strong>{stats?.gyms ?? "—"}</strong></div></div>
        <div className="adm-stat"><div><span>MRR (monthly recurring)</span><strong style={{ color: "#4ade80" }}>{rs(stats?.mrr)}</strong></div></div>
        <div className="adm-stat"><div><span>Active / Trial</span><strong>{stats?.byStatus.ACTIVE ?? 0} / {stats?.byStatus.TRIALING ?? 0}</strong></div></div>
        <div className="adm-stat"><div><span>Members (sab gyms)</span><strong>{stats?.members ?? "—"}</strong></div></div>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Gym</th><th>City</th><th>Plan</th><th>Status</th><th>Members</th><th>Staff</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {!gyms && <tr><td colSpan={8} className="adm-empty">Loading...</td></tr>}
            {gyms?.map((g) => (
              <tr key={g.id}>
                <td><b>{g.name}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{g.slug}</div></td>
                <td>{g.city}</td>
                <td>{g.plan === "PRO" ? "Pro" : "Starter"}</td>
                <td>
                  <Badge value={g.status} />
                  {g.status === "TRIALING" && g.trialEndsAt && <div style={{ color: "var(--muted)", fontSize: 11 }}>till {fmtDate(g.trialEndsAt)}</div>}
                </td>
                <td>{g.members}</td>
                <td>{g.staff}</td>
                <td>{fmtDate(g.createdAt)}</td>
                <td>
                  <div className="actions">
                    {g.status !== "ACTIVE" && <button className="adm-btn sm" onClick={() => extendTrial(g)}>+14 days trial</button>}
                    <a className="adm-btn icon" href={gymUrl(g.slug)} target="_blank" rel="noopener" title="Website"><FaArrowUpRightFromSquare /></a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
