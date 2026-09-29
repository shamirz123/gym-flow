"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaDownload, FaPlus, FaTrash } from "react-icons/fa6";
import { api, fmtDate, rs, toInputDate } from "@/lib/dashboardApi";
import type { Member, Payment, PaymentMethod } from "@/lib/types";
import { Modal, NoAccess, useDashboard } from "@/components/dashboard/ui";

const METHODS: PaymentMethod[] = ["cash", "jazzcash", "easypaisa", "bank", "card"];
const TYPES = ["personal_training", "admission", "fee", "other"] as const;

export default function PaymentsPage() {
  const { toast, refreshCounts, can } = useDashboard();
  const now = new Date();
  const [range, setRange] = useState({ from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toInputDate(now), method: "" });
  const [data, setData] = useState<{ payments: Payment[]; total: number } | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams(Object.entries(range).filter(([, v]) => v));
    api(`/gym/payments?${p}`).then(setData).catch((e) => toast(e.message, "err"));
  }, [range, toast]);
  useEffect(() => { if (can("payments:view")) load(); }, [load, can]);

  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    data?.payments.forEach((p) => (m[p.method] = (m[p.method] || 0) + p.amount));
    return m;
  }, [data]);

  if (!can("payments:view")) return <NoAccess />;

  const remove = async (p: Payment) => {
    if (!confirm(`Delete this ${rs(p.amount)} payment? (The member's expiry will not change)`)) return;
    await api(`/gym/payments/${p.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "err"));
    load();
    refreshCounts();
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [["Date", "Member", "Amount", "Months", "Type", "Method", "Note"], ...data.payments.map((p) => [fmtDate(p.paidAt), p.memberName, p.amount, p.months, p.type, p.method, p.note || ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `payments-${range.from}-to-${range.to}.csv`;
    a.click();
  };

  const quick = (months: number) => {
    const from = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const to = months ? new Date(now.getFullYear(), now.getMonth() - months + 1, 0) : now;
    setRange({ ...range, from: toInputDate(from), to: toInputDate(to) });
  };

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-tabs">
          <button onClick={() => quick(0)}>This month</button>
          <button onClick={() => quick(1)}>Last month</button>
        </div>
        <input type="date" style={{ width: "auto" }} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <span style={{ color: "var(--muted)" }}>to</span>
        <input type="date" style={{ width: "auto" }} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <select value={range.method} onChange={(e) => setRange({ ...range, method: e.target.value })}>
          <option value="">All methods</option>
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="adm-btn" onClick={exportCsv} disabled={!data?.payments.length}><FaDownload /> CSV</button>
        {can("payments:write") && <button className="adm-btn primary" onClick={() => setAdding(true)}><FaPlus /> Add Payment</button>}
      </div>

      <div className="adm-stats">
        <div className="adm-stat"><div><span>Total collection</span><strong style={{ color: "#4ade80" }}>{rs(data?.total)}</strong><em style={{ color: "var(--muted)" }}>{data?.payments.length || 0} payments</em></div></div>
        {Object.entries(byMethod).map(([m, t]) => (
          <div className="adm-stat" key={m}><div><span style={{ textTransform: "capitalize" }}>{m}</span><strong>{rs(t)}</strong></div></div>
        ))}
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Date</th><th>Member</th><th>Amount</th><th>Months</th><th>Type</th><th>Method</th><th>Note</th><th /></tr></thead>
          <tbody>
            {!data && <tr><td colSpan={8} className="adm-empty">Loading...</td></tr>}
            {data?.payments.length === 0 && <tr><td colSpan={8} className="adm-empty">No payments in this period</td></tr>}
            {data?.payments.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.paidAt)}</td><td><b>{p.memberName}</b></td><td><b>{rs(p.amount)}</b></td><td>{p.months}</td>
                <td>{p.type.replace("_", " ")}</td><td style={{ textTransform: "capitalize" }}>{p.method}</td><td className="clip">{p.note || "—"}</td>
                <td><div className="actions">{can("payments:delete") && <button className="adm-btn icon danger" onClick={() => remove(p)}><FaTrash /></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddPayment onClose={() => setAdding(false)} onDone={() => { setAdding(false); toast("Payment added ✅"); load(); refreshCounts(); }} />}
    </>
  );
}

// Payments other than monthly fees (admission, personal training). Use the "Fee" button on the Members page for fees.
function AddPayment({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useDashboard();
  const [members, setMembers] = useState<Member[]>([]);
  const [f, setF] = useState({ memberId: "", amount: "", months: 0, type: "personal_training", method: "cash", note: "", paidAt: toInputDate(new Date()) });
  useEffect(() => {
    api<Member[]>("/gym/members").then((m) => { setMembers(m); setF((x) => ({ ...x, memberId: m[0]?.id || "" })); });
  }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    try {
      await api("/gym/payments", { method: "POST", body: { ...f, amount: +f.amount, months: +f.months } });
      onDone();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <Modal title="Add Payment" onClose={onClose} onSubmit={save}
      footer={<><button type="button" className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn primary">Save</button></>}>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>For monthly fees, use the <b>Fee</b> button on the Members page — it also extends the expiry.</p>
      <label className="fld">Member<select required value={f.memberId} onChange={set("memberId")}>{members.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}</select></label>
      <div className="adm-row">
        <label className="fld">Amount<input type="number" min="1" required value={f.amount} onChange={set("amount")} /></label>
        <label className="fld">Date<input type="date" value={f.paidAt} onChange={set("paidAt")} /></label>
      </div>
      <div className="adm-row">
        <label className="fld">Type<select value={f.type} onChange={set("type")}>{TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></label>
        <label className="fld">Method<select value={f.method} onChange={set("method")}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
      </div>
      <label className="fld">Note<input value={f.note} onChange={set("note")} /></label>
    </Modal>
  );
}
