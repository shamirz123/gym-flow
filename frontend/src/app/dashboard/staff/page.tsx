"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FaPlus, FaTrash } from "react-icons/fa6";
import { api, ApiError, fmtDate } from "@/lib/dashboardApi";
import type { Role } from "@/lib/types";
import { Badge, Modal, NoAccess, useDashboard } from "@/components/dashboard/ui";

type Staff = { id: string; userId: string; name: string; email: string; role: Role; createdAt: string };

const ROLE_INFO: Record<Role, string> = {
  OWNER: "Everything — revenue, staff, billing, settings",
  RECEPTIONIST: "Members, collecting fees, check-ins, website inbox (no revenue)",
  TRAINER: "View members, check-ins, class schedule (no money)",
};

export default function StaffPage() {
  const { toast, can, me } = useDashboard();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api<Staff[]>("/gym/staff").then(setStaff).catch((e) => toast(e.message, "err"));
  }, [toast]);
  useEffect(() => { if (can("staff:manage")) load(); }, [load, can]);

  if (!can("staff:manage")) return <NoAccess />;

  const changeRole = async (s: Staff, role: Role) => {
    try {
      await api(`/gym/staff/${s.id}`, { method: "PUT", body: { role } });
      toast(`${s.name} is now a ${role.toLowerCase()}`);
      load();
    } catch (e) { toast((e as Error).message, "err"); load(); }
  };

  const remove = async (s: Staff) => {
    if (!confirm(`Remove ${s.name}'s access to this gym?`)) return;
    try {
      await api(`/gym/staff/${s.id}`, { method: "DELETE" });
      toast("Staff member removed");
      load();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <>
      <div className="adm-card">
        <h3>What each role can do</h3>
        <div className="adm-list">
          {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
            <div key={r}><Badge value={r} /><div className="grow"><small>{ROLE_INFO[r]}</small></div></div>
          ))}
        </div>
      </div>

      <div className="adm-toolbar">
        <div style={{ flex: 1 }} />
        <button className="adm-btn primary" onClick={() => setAdding(true)}><FaPlus /> Add Staff</button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Name</th><th>Email (login)</th><th>Role</th><th>Added</th><th /></tr></thead>
          <tbody>
            {!staff && <tr><td colSpan={5} className="adm-empty">Loading...</td></tr>}
            {staff?.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b>{s.userId === me.id && <span style={{ color: "var(--muted)" }}> (you)</span>}</td>
                <td>{s.email}</td>
                <td>
                  <select className="inline" value={s.role} disabled={s.userId === me.id} onChange={(e) => changeRole(s, e.target.value as Role)}>
                    <option value="OWNER">Owner</option><option value="RECEPTIONIST">Receptionist</option><option value="TRAINER">Trainer</option>
                  </select>
                </td>
                <td>{fmtDate(s.createdAt)}</td>
                <td><div className="actions">{s.userId !== me.id && <button className="adm-btn icon danger" onClick={() => remove(s)}><FaTrash /></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddStaff onClose={() => setAdding(false)} onDone={() => { setAdding(false); toast("Staff member added ✅ Share their email and password with them"); load(); }} />}
    </>
  );
}

function AddStaff({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast, can } = useDashboard();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "RECEPTIONIST" as Role });
  const [limit, setLimit] = useState(false);
  const save = async () => {
    try {
      await api("/gym/staff", { method: "POST", body: { ...f, password: f.password || undefined } });
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.data.code === "PLAN_LIMIT") setLimit(true);
      toast((e as Error).message, "err");
    }
  };
  return (
    <Modal title="Add Staff" onClose={onClose} onSubmit={save}
      footer={<><button type="button" className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn primary">Add</button></>}>
      {limit && can("billing:manage") && <div className="adm-banner warn" style={{ borderRadius: 10 }}>Staff limit reached. <Link href="/dashboard/billing" className="adm-btn sm primary">Upgrade</Link></div>}
      <label className="fld">Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="fld">Email (used to log in)<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label className="fld">Password (for new accounts, 8+ characters)
        <input type="text" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Leave empty if this email already has a GymFlow account" />
      </label>
      <label className="fld">Role
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          <option value="RECEPTIONIST">Receptionist</option><option value="TRAINER">Trainer</option><option value="OWNER">Owner (partner)</option>
        </select>
      </label>
      <small style={{ color: "var(--muted)" }}>{ROLE_INFO[f.role]}</small>
    </Modal>
  );
}
