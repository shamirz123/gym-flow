"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheck } from "react-icons/fa6";
import { api, fmtDate } from "@/lib/dashboardApi";
import type { SaasPlan, SubscriptionStatus } from "@/lib/types";
import { Badge, NoAccess, useDashboard } from "@/components/dashboard/ui";

type Billing = {
  mode: "stripe" | "demo";
  plan: SaasPlan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  state: { canWrite: boolean; reason?: string; daysLeft?: number };
  usage: { members: number; staff: number; maxMembers: number | null; maxStaff: number | null };
  plans: { id: SaasPlan; name: string; pricePkr: number; features: string[] }[];
};

export default function BillingPageWrapper() {
  return <Suspense><BillingPage /></Suspense>;
}

function BillingPage() {
  const { toast, can, refreshMe } = useDashboard();
  const params = useSearchParams();
  const [b, setB] = useState<Billing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Billing>("/gym/billing").then(setB).catch((e) => toast(e.message, "err"));
  }, [toast]);

  useEffect(() => { if (can("billing:manage")) load(); }, [load, can]);

  // Returning from Stripe
  useEffect(() => {
    const c = params.get("checkout");
    if (c === "success") { toast("✅ Subscription activated — thank you!"); refreshMe(); }
    if (c === "cancelled") toast("Checkout was cancelled", "err");
  }, [params, toast, refreshMe]);

  if (!can("billing:manage")) return <NoAccess />;
  if (!b) return <div className="adm-loading">Loading...</div>;

  const checkout = async (plan: SaasPlan) => {
    setBusy(plan);
    try {
      const { url } = await api<{ url: string }>("/gym/billing/checkout", { method: "POST", body: { plan } });
      // Stripe mode: go to Stripe's checkout page; demo mode: straight back with success
      location.href = url;
    } catch (e) {
      toast((e as Error).message, "err");
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!confirm("Cancel the subscription? Everything keeps working until the end of the paid period.")) return;
    try {
      await api("/gym/billing/cancel", { method: "POST" });
      toast("Subscription cancelled");
      load();
      refreshMe();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  const portal = async () => {
    const { url } = await api<{ url: string | null }>("/gym/billing/portal", { method: "POST" });
    if (url) location.href = url;
    else toast("Stripe portal is not available (demo mode)", "err");
  };

  const pct = (n: number, max: number | null) => (max ? Math.min(100, (n / max) * 100) : 8);
  const active = b.status === "ACTIVE";

  return (
    <>
      {b.mode === "demo" && (
        <div className="adm-banner warn" style={{ borderRadius: 12, border: "1px solid #854d0e" }}>
          🧪 Demo billing mode: no real payment is taken and plans activate instantly. For real Stripe (test mode, free) set STRIPE_SECRET_KEY in the backend .env.
        </div>
      )}

      <div className="adm-grid-2">
        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>Current plan <Badge value={b.status} /></h3>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{b.plan === "PRO" ? "Pro" : "Starter"}</div>
          <p style={{ color: "var(--muted)" }}>
            {b.status === "TRIALING" && b.trialEndsAt && <>Free trial until {fmtDate(b.trialEndsAt)} {b.state.daysLeft !== undefined && `(${b.state.daysLeft} days left)`}</>}
            {b.status === "ACTIVE" && b.currentPeriodEnd && <>Next billing date: {fmtDate(b.currentPeriodEnd)}</>}
            {b.status === "CANCELED" && <>Cancelled — {b.currentPeriodEnd ? `active until ${fmtDate(b.currentPeriodEnd)}` : "inactive"}</>}
            {b.status === "PAST_DUE" && <>Payment failed — please update your card</>}
          </p>
          {b.state.reason && <p style={{ color: b.state.canWrite ? "#facc15" : "#f87171" }}>{b.state.reason}</p>}
          <div className="adm-toolbar">
            {b.mode === "stripe" && active && <button className="adm-btn" onClick={portal}>Invoices & card</button>}
            {active && <button className="adm-btn danger" onClick={cancel}>Cancel subscription</button>}
          </div>
        </div>

        <div className="adm-card" style={{ display: "grid", gap: 16 }}>
          <h3>Usage</h3>
          <div style={{ display: "grid", gap: 6 }}>
            <span>Active members: <b>{b.usage.members}</b> / {b.usage.maxMembers ?? "∞"}</span>
            <div className="meter"><i style={{ width: `${pct(b.usage.members, b.usage.maxMembers)}%` }} /></div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <span>Staff accounts: <b>{b.usage.staff}</b> / {b.usage.maxStaff ?? "∞"}</span>
            <div className="meter"><i style={{ width: `${pct(b.usage.staff, b.usage.maxStaff)}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h3>Plans</h3>
        <div className="bill-plans">
          {b.plans.map((p) => {
            const current = p.id === b.plan && active;
            return (
              <div key={p.id} className={`bill-plan ${current ? "current" : ""}`}>
                <h4>{p.name}</h4>
                <div className="p">Rs {p.pricePkr.toLocaleString("en-US")} <small>/ month</small></div>
                <ul>{p.features.map((f) => <li key={f}><FaCheck color="#4ade80" /> {f}</li>)}</ul>
                {current ? (
                  <button className="adm-btn" disabled>Current plan</button>
                ) : (
                  <button className="adm-btn primary" disabled={!!busy} onClick={() => checkout(p.id)}>
                    {busy === p.id ? "Redirecting..." : active ? `Switch to ${p.name}` : `Choose ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
