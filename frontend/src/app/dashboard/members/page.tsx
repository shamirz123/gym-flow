"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FaClockRotateLeft, FaIdCard, FaMagnifyingGlass, FaMoneyBillWave, FaPen, FaPlus, FaRotate, FaTrash, FaWhatsapp } from "react-icons/fa6";
import { SITE_URL } from "@/lib/api";
import { api, ApiError, fmtDate, fmtTime, rs, toInputDate, wa } from "@/lib/dashboardApi";
import type { Attendance, Member, MembershipPlan, Payment, PaymentMethod } from "@/lib/types";
import { Badge, Modal, NoAccess, useDashboard } from "@/components/dashboard/ui";

const TABS: [string, string][] = [["", "All"], ["active", "Active"], ["expiring", "Expiring"], ["expired", "Expired"], ["left", "Left"]];
const METHODS: PaymentMethod[] = ["cash", "jazzcash", "easypaisa", "bank", "card"];
const cardUrl = (m: Member) => `${SITE_URL}/card/${m.qrToken}`;

type ModalState = { type: "add" } | { type: "edit" | "renew" | "history"; member: Member } | null;

export default function MembersPageWrapper() {
  return <Suspense><MembersPage /></Suspense>;
}

function MembersPage() {
  const params = useSearchParams();
  const { toast, refreshCounts, can, gym } = useDashboard();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState(params.get("status") || "");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const load = useCallback(() => {
    api<Member[]>("/gym/members").then(setMembers).catch((e) => toast(e.message, "err"));
  }, [toast]);

  useEffect(() => {
    if (!can("members:view")) return;
    load();
    api<MembershipPlan[]>("/gym/plans").then(setPlans).catch(() => {});
  }, [load, can]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": members?.length || 0 };
    members?.forEach((m) => (c[m.status] = (c[m.status] || 0) + 1));
    return c;
  }, [members]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (members || []).filter((m) => (!status || m.status === status) && (!needle || m.name.toLowerCase().includes(needle) || m.phone.includes(needle)));
  }, [members, status, q]);

  if (!can("members:view")) return <NoAccess />;

  const done = (msg: string) => { toast(msg); setModal(null); load(); refreshCounts(); };

  const remove = async (m: Member) => {
    if (!confirm(`Delete ${m.name} and all of their payments and attendance?`)) return;
    try {
      await api(`/gym/members/${m.id}`, { method: "DELETE" });
      done("Member deleted");
    } catch (e) { toast((e as Error).message, "err"); }
  };

  const resetQr = async (m: Member) => {
    if (!confirm(`Disable ${m.name}'s old QR card and create a new one? (use this if the card is lost)`)) return;
    try {
      await api(`/gym/members/${m.id}/reset-qr`, { method: "POST" });
      done("New QR card created — send it to the member again");
    } catch (e) { toast((e as Error).message, "err"); }
  };

  const reminder = (m: Member) =>
    m.status === "expired"
      ? `Hello ${m.name}! Your ${gym.name} membership expired on ${fmtDate(m.expiryDate)}. Please pay your fee (${rs(m.monthlyFee)}) to continue. Thank you!`
      : `Hello ${m.name}! Your ${gym.name} membership expires on ${fmtDate(m.expiryDate)}. Fee: ${rs(m.monthlyFee)}. Thank you!`;
  const cardMsg = (m: Member) => `Hello ${m.name}! Welcome to ${gym.name} 💪 Here is your digital membership card — show the QR code at reception:\n${cardUrl(m)}`;

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-tabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={status === k ? "active" : ""} onClick={() => setStatus(k)}>{l}<b>{counts[k] || 0}</b></button>
          ))}
        </div>
        <div className="search">
          <FaMagnifyingGlass />
          <input placeholder="Search by name or phone..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        {can("members:write") && <button className="adm-btn primary" onClick={() => setModal({ type: "add" })}><FaPlus /> Add Member</button>}
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Plan</th><th>Monthly Fee</th><th>Expiry</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {members === null && <tr><td colSpan={7} className="adm-empty">Loading...</td></tr>}
            {members && visible.length === 0 && <tr><td colSpan={7} className="adm-empty">No members found</td></tr>}
            {visible.map((m) => (
              <tr key={m.id}>
                <td><b>{m.name}</b>{m.trainer && <div style={{ color: "var(--muted)", fontSize: 12 }}>Trainer: {m.trainer}</div>}</td>
                <td>{m.phone}</td>
                <td>{m.plan || "—"}</td>
                <td>{rs(m.monthlyFee)}</td>
                <td>{fmtDate(m.expiryDate)}</td>
                <td><Badge value={m.status} /></td>
                <td>
                  <div className="actions">
                    {can("payments:write") && <button className="adm-btn sm primary" onClick={() => setModal({ type: "renew", member: m })}><FaMoneyBillWave /> Fee</button>}
                    <a className="adm-btn icon" href={cardUrl(m)} target="_blank" rel="noopener" title="Digital card (QR)"><FaIdCard /></a>
                    {can("members:write") && (
                      <a className="adm-btn icon green" href={wa(m.phone, m.status === "active" ? cardMsg(m) : reminder(m))} target="_blank" rel="noopener"
                        title={m.status === "active" ? "Send card on WhatsApp" : "Send fee reminder on WhatsApp"}><FaWhatsapp /></a>
                    )}
                    <button className="adm-btn icon" onClick={() => setModal({ type: "history", member: m })} title="History"><FaClockRotateLeft /></button>
                    {can("members:write") && <button className="adm-btn icon" onClick={() => setModal({ type: "edit", member: m })} title="Edit"><FaPen /></button>}
                    {can("members:write") && <button className="adm-btn icon" onClick={() => resetQr(m)} title="Reset QR (lost card)"><FaRotate /></button>}
                    {can("members:delete") && <button className="adm-btn icon danger" onClick={() => remove(m)} title="Delete"><FaTrash /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === "add" && <MemberForm plans={plans} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "edit" && <MemberForm member={modal.member} plans={plans} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "renew" && <RenewForm member={modal.member} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "history" && <History member={modal.member} onClose={() => setModal(null)} />}
    </>
  );
}

function MemberForm({ member, plans, onClose, onDone }: { member?: Member; plans: MembershipPlan[]; onClose: () => void; onDone: (m: string) => void }) {
  const { toast, can } = useDashboard();
  const isNew = !member;
  const first = plans[0];
  const [f, setF] = useState<Record<string, any>>(
    member
      ? { ...member, joinDate: toInputDate(member.joinDate), expiryDate: toInputDate(member.expiryDate) }
      : { name: "", phone: "", gender: "male", plan: first?.name || "", monthlyFee: first?.monthly || 0, trainer: "", joinDate: toInputDate(new Date()), months: 1, amount: first?.monthly || 0, admission: 0, method: "cash", notes: "" }
  );
  const [saving, setSaving] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const t = e.target as HTMLInputElement;
    setF((x) => ({ ...x, [k]: t.type === "number" ? +t.value : t.type === "checkbox" ? t.checked : t.value }));
  };

  const pickPlan = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = plans.find((x) => x.name === e.target.value);
    setF((x) => ({ ...x, plan: e.target.value, monthlyFee: p?.monthly ?? x.monthlyFee, amount: (p?.monthly ?? x.monthlyFee) * (x.months || 1) }));
  };

  const save = async () => {
    setSaving(true);
    const { id, status, qrToken, createdAt, gymId, ...body } = f;
    try {
      await api(`/gym/members${isNew ? "" : "/" + member!.id}`, { method: isNew ? "POST" : "PUT", body });
      onDone(isNew ? "Member added ✅" : "Member updated ✅");
    } catch (e) {
      if (e instanceof ApiError && e.data.code === "PLAN_LIMIT") setLimitHit(true);
      toast((e as Error).message, "err");
      setSaving(false);
    }
  };

  return (
    <Modal title={isNew ? "Add Member" : `Edit — ${member!.name}`} onClose={onClose} onSubmit={save} wide
      footer={<><button type="button" className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button></>}>
      {limitHit && (
        <div className="adm-banner warn" style={{ margin: "-4px 0 4px", borderRadius: 10 }}>
          You've reached your plan's member limit. {can("billing:manage") && <Link href="/dashboard/billing" className="adm-btn sm primary">Upgrade to Pro</Link>}
        </div>
      )}
      <div className="adm-row">
        <label className="fld">Full Name<input required value={f.name} onChange={set("name")} /></label>
        <label className="fld">Phone<input required value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" /></label>
      </div>
      <div className="adm-row three">
        <label className="fld">Gender<select value={f.gender} onChange={set("gender")}><option value="male">Male</option><option value="female">Female</option></select></label>
        <label className="fld">Plan
          <select value={f.plan} onChange={pickPlan}>{plans.map((p) => <option key={p.id}>{p.name}</option>)}<option value="Custom">Custom</option></select>
        </label>
        <label className="fld">Monthly Fee<input type="number" min="0" value={f.monthlyFee} onChange={set("monthlyFee")} /></label>
      </div>
      <div className="adm-row">
        <label className="fld">Trainer (optional)<input value={f.trainer || ""} onChange={set("trainer")} /></label>
        <label className="fld">Join Date<input type="date" value={f.joinDate} onChange={set("joinDate")} /></label>
      </div>
      {isNew ? (
        <>
          <p className="adm-section-title">First payment</p>
          <div className="adm-row three">
            <label className="fld">Months
              <input type="number" min="1" max="24" value={f.months} onChange={(e) => setF((x) => ({ ...x, months: +e.target.value, amount: x.monthlyFee * +e.target.value }))} />
            </label>
            <label className="fld">Fee Received<input type="number" min="0" value={f.amount} onChange={set("amount")} /></label>
            <label className="fld">Admission Fee<input type="number" min="0" value={f.admission} onChange={set("admission")} /></label>
          </div>
          <label className="fld">Payment Method<select value={f.method} onChange={set("method")}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
        </>
      ) : (
        <div className="adm-row">
          <label className="fld">Expiry Date<input type="date" value={f.expiryDate} onChange={set("expiryDate")} /></label>
          <label className="chk" style={{ alignSelf: "end", paddingBottom: 10 }}><input type="checkbox" checked={!!f.active} onChange={set("active")} /> Member is currently active</label>
        </div>
      )}
      <label className="fld">Notes<textarea value={f.notes || ""} onChange={set("notes")} placeholder="Medical conditions, goals, etc." /></label>
    </Modal>
  );
}

function RenewForm({ member, onClose, onDone }: { member: Member; onClose: () => void; onDone: (m: string) => void }) {
  const { toast } = useDashboard();
  const [f, setF] = useState({ months: 1, amount: member.monthlyFee, method: "cash" as PaymentMethod, note: "" });
  const [saving, setSaving] = useState(false);

  const base = new Date(member.expiryDate) > new Date() ? new Date(member.expiryDate) : new Date();
  const newExpiry = new Date(base);
  newExpiry.setMonth(newExpiry.getMonth() + (+f.months || 1));

  const save = async () => {
    setSaving(true);
    try {
      await api(`/gym/members/${member.id}/renew`, { method: "POST", body: f });
      onDone(`${rs(f.amount)} fee received ✅`);
    } catch (e) {
      toast((e as Error).message, "err");
      setSaving(false);
    }
  };

  return (
    <Modal title={`Collect fee — ${member.name}`} onClose={onClose} onSubmit={save}
      footer={<><button type="button" className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn primary" disabled={saving}>{saving ? "Saving..." : "Receive Payment"}</button></>}>
      <div className="adm-list">
        <div><div className="grow"><small>Current expiry</small><b>{fmtDate(member.expiryDate)}</b></div><Badge value={member.status} /></div>
        <div><div className="grow"><small>New expiry</small><b style={{ color: "#4ade80" }}>{fmtDate(newExpiry)}</b></div></div>
      </div>
      <div className="adm-row">
        <label className="fld">Months
          <select value={f.months} onChange={(e) => setF({ ...f, months: +e.target.value, amount: member.monthlyFee * +e.target.value })}>
            {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
          </select>
        </label>
        <label className="fld">Amount (Rs.)<input type="number" min="0" required value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></label>
      </div>
      <label className="fld">Method<select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label className="fld">Note (optional)<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Discount, receipt no., etc." /></label>
    </Modal>
  );
}

function History({ member, onClose }: { member: Member; onClose: () => void }) {
  const { can } = useDashboard();
  const [data, setData] = useState<{ payments: Payment[]; attendance: Attendance[] } | null>(null);
  useEffect(() => { api(`/gym/members/${member.id}`).then(setData).catch(() => setData({ payments: [], attendance: [] })); }, [member.id]);
  const total = data?.payments.reduce((s, p) => s + p.amount, 0) || 0;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const visitsThisMonth = data?.attendance.filter((a) => new Date(a.checkedInAt) >= monthStart).length ?? 0;

  return (
    <Modal title={`History — ${member.name}`} onClose={onClose} wide>
      {!data ? <div className="adm-empty">Loading...</div> : (
        <>
          <div className="adm-stats">
            {can("payments:view") && <div className="adm-stat"><div><span>Total paid</span><strong>{rs(total)}</strong></div></div>}
            <div className="adm-stat"><div><span>Visits this month</span><strong>{visitsThisMonth}</strong></div></div>
            <div className="adm-stat"><div><span>Member since</span><strong style={{ fontSize: 16 }}>{fmtDate(member.joinDate)}</strong></div></div>
          </div>
          {can("payments:view") && (
            <>
              <p className="adm-section-title">Payments</p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Date</th><th>Amount</th><th>Months</th><th>Type</th><th>Method</th><th>Note</th></tr></thead>
                  <tbody>
                    {data.payments.length === 0 && <tr><td colSpan={6} className="adm-empty">No payments</td></tr>}
                    {data.payments.map((p) => (
                      <tr key={p.id}><td>{fmtDate(p.paidAt)}</td><td><b>{rs(p.amount)}</b></td><td>{p.months}</td><td>{p.type.replace("_", " ")}</td><td>{p.method}</td><td className="clip">{p.note || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="adm-section-title">Attendance (last 60 visits)</p>
          <div className="adm-list">
            {data.attendance.length === 0 && <div className="adm-empty">No check-ins yet</div>}
            {data.attendance.slice(0, 15).map((a) => (
              <div key={a.id}><div className="grow"><b>{fmtDate(a.checkedInAt)}</b><small>{fmtTime(a.checkedInAt)} · {a.method === "QR" ? "QR scan" : "Manual"}</small></div></div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
