"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCheck, FaDownload, FaMagnifyingGlass, FaPen, FaPlus, FaTrash, FaUserCheck, FaWhatsapp } from "react-icons/fa6";
import { api, fmtDate, rs, wa } from "@/lib/dashboardApi";
import { FEATURE_ICONS } from "@/components/site/icons";
import { Badge, Field, Modal, NoAccess, useDashboard } from "./ui";
import type { Column, ResourceConfig, Row } from "./resources";

export default function ResourcePage({ name, config }: { name: string; config: ResourceConfig }) {
  const router = useRouter();
  const { toast, refreshCounts, can } = useDashboard();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Partial<Row> | null>(null); // {} = new, {...row} = edit
  const [saving, setSaving] = useState(false);
  const canWrite = can(config.write);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter && config.filter) params.set(config.filter.name, filter);
      setRows(await api<Row[]>(`/gym/${name}?${params}`));
    } catch (e) {
      toast((e as Error).message, "err");
      setRows([]);
    }
  }, [name, filter, config.filter, toast]);

  useEffect(() => { if (can(config.view)) load(); }, [load, can, config.view]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    let list = needle ? rows.filter((r) => config.columns.some(([k]) => String(r[k] ?? "").toLowerCase().includes(needle))) : rows;
    if (config.sortClient) list = [...list].sort(config.sortClient);
    return list;
  }, [rows, q, config]);

  if (!can(config.view)) return <NoAccess />;

  // Send only the form fields (not id, createdAt, gymId, etc.)
  const payload = (row: Partial<Row>) => Object.fromEntries(config.fields.map((f) => [f.name, row[f.name]]).filter(([, v]) => v !== undefined && v !== ""));

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      await api(`/gym/${name}${isNew ? "" : "/" + editing.id}`, { method: isNew ? "POST" : "PUT", body: payload(editing) });
      toast(isNew ? `${config.singular} added ✅` : "Changes saved ✅");
      setEditing(null);
      load();
      refreshCounts();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    if (!confirm(`Are you sure you want to delete this ${config.singular.toLowerCase()}?`)) return;
    try {
      await api(`/gym/${name}/${row.id}`, { method: "DELETE" });
      toast("Deleted");
      load();
      refreshCounts();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const patch = async (row: Row, data: Record<string, unknown>) => {
    try {
      await api(`/gym/${name}/${row.id}`, { method: "PUT", body: data });
      setRows((list) => list?.map((r) => (r.id === row.id ? { ...r, ...data } : r)) ?? null);
      refreshCounts();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const convert = async (row: Row) => {
    if (!confirm(`Make ${row.name} a member? (The Members page will open so you can collect the fee)`)) return;
    try {
      await api(`/gym/leads/${row.id}/convert`, { method: "POST" });
      toast("Member created ✅ Now collect the fee");
      refreshCounts();
      router.push("/dashboard/members?status=expired");
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const exportCsv = () => {
    const cols = config.columns.map(([k]) => k);
    const csv = [cols.join(","), ...visible.map((r) => cols.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${name}.csv`;
    a.click();
  };

  const cell = (row: Row, [key, , render]: Column) => {
    const v = row[key];
    switch (render) {
      case "image": return v ? <img className="thumb" src={v} alt="" /> : "—";
      case "money": return rs(v);
      case "bool": return v ? <FaCheck color="#4ade80" /> : <span style={{ color: "var(--muted)" }}>—</span>;
      case "date": return fmtDate(v);
      case "clip": return <div className="clip" title={v}>{v}</div>;
      case "count": return `${v?.length || 0} items`;
      case "badge": return <Badge value={v} />;
      case "icon": { const I = FEATURE_ICONS[v]; return I ? <I size={18} color="var(--primary)" /> : v; }
      case "status":
        return canWrite ? (
          <select className="inline" value={v} onChange={(e) => patch(row, { status: e.target.value })}>
            {config.statusOptions?.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : <Badge value={v} />;
      default: return v ?? "—";
    }
  };

  return (
    <>
      <div className="adm-toolbar">
        <div className="search">
          <FaMagnifyingGlass />
          <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {config.filter && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            {config.filter.options.map((o) => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}
          </select>
        )}
        <div style={{ flex: 1 }} />
        {config.csv && <button className="adm-btn" onClick={exportCsv}><FaDownload /> Export CSV</button>}
        {canWrite && <button className="adm-btn primary" onClick={() => setEditing({ ...(config.defaults || {}) })}><FaPlus /> Add {config.singular}</button>}
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>{config.columns.map(([k, label]) => <th key={k}>{label}</th>)}<th /></tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={99} className="adm-empty">Loading...</td></tr>}
            {rows && visible.length === 0 && <tr><td colSpan={99} className="adm-empty">No records found</td></tr>}
            {visible.map((row) => (
              <tr key={row.id} className={config.markRead && !row.read ? "unread" : ""}>
                {config.columns.map((c) => <td key={c[0]}>{cell(row, c)}</td>)}
                <td>
                  <div className="actions">
                    {canWrite && config.markRead && !row.read && <button className="adm-btn sm" onClick={() => patch(row, { read: true })}>Mark read</button>}
                    {config.convert && row.status !== "joined" && can("members:write") && (
                      <button className="adm-btn sm green" onClick={() => convert(row)} title="Convert to member"><FaUserCheck /> Member</button>
                    )}
                    {config.waText && row.phone && (
                      <a className="adm-btn icon green" href={wa(row.phone, config.waText(row))} target="_blank" rel="noopener" title="WhatsApp"><FaWhatsapp /></a>
                    )}
                    {canWrite && <button className="adm-btn icon" onClick={() => setEditing({ ...row })} title="Edit"><FaPen /></button>}
                    {canWrite && <button className="adm-btn icon danger" onClick={() => remove(row)} title="Delete"><FaTrash /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={`${editing.id ? "Edit" : "Add"} ${config.singular}`}
          onClose={() => setEditing(null)}
          onSubmit={save}
          footer={<>
            <button type="button" className="adm-btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="adm-btn primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </>}
        >
          {config.fields.map((f) => (
            <Field key={f.name} field={f} value={editing[f.name]} onChange={(k, v) => setEditing((e) => ({ ...e, [k]: v }))} />
          ))}
        </Modal>
      )}
    </>
  );
}
