"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FaImage, FaPlus, FaTrash, FaUpload, FaXmark } from "react-icons/fa6";
import { uploadImage } from "@/lib/dashboardApi";
import type { GymAccess, Me, Permission } from "@/lib/types";

/* ---------- Dashboard context (provided by DashboardShell) ---------- */
export type Counts = Partial<Record<"newLeads" | "pendingBookings" | "unreadMessages", number>>;
export type DashboardCtx = {
  me: Me;
  gym: GymAccess;
  can: (p: Permission) => boolean;
  toast: (msg: string, type?: "ok" | "err") => void;
  counts: Counts;
  refreshCounts: () => void;
  refreshMe: () => Promise<void>;
};
export const DashboardContext = createContext<DashboardCtx | null>(null);
export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardShell");
  return ctx;
};

export function Toast({ toast }: { toast: { msg: string; type: "ok" | "err" } | null }) {
  if (!toast) return null;
  return <div className={`adm-toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>;
}

// Shown instead of the page when the role lacks permission
export function NoAccess() {
  return <div className="adm-empty">🔒 Your role doesn't have access to this page. Please contact the gym owner.</div>;
}

/* ---------- Modal ---------- */
type ModalProps = { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; onSubmit?: () => void };
export function Modal({ title, onClose, children, footer, wide, onSubmit }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const inner = (
    <>
      <div className="adm-modal-head">
        <h2>{title}</h2>
        <button type="button" className="adm-btn icon" onClick={onClose} aria-label="Close"><FaXmark /></button>
      </div>
      <div className="adm-modal-body">{children}</div>
      {footer && <div className="adm-modal-foot">{footer}</div>}
    </>
  );
  return (
    <div className="adm-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {onSubmit ? (
        <form className={`adm-modal-box ${wide ? "wide" : ""}`} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>{inner}</form>
      ) : (
        <div className={`adm-modal-box ${wide ? "wide" : ""}`}>{inner}</div>
      )}
    </div>
  );
}

/* ---------- Badge ---------- */
const BADGE_COLORS: Record<string, string> = {
  active: "green", joined: "green", confirmed: "green", ACTIVE: "green", OWNER: "blue",
  expiring: "yellow", contacted: "yellow", pending: "yellow", TRIALING: "yellow", PAST_DUE: "yellow", RECEPTIONIST: "yellow",
  expired: "red", lost: "red", cancelled: "red", CANCELED: "red",
  new: "blue", left: "gray", TRAINER: "gray",
};
export const Badge = ({ value }: { value: string }) => <span className={`badge ${BADGE_COLORS[value] || "gray"}`}>{value.toLowerCase().replace("_", " ")}</span>;

/* ---------- Form fields (from a schema) ---------- */
export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "textarea" | "select" | "checkbox" | "list" | "image";
  options?: (string | [string, string])[];
  required?: boolean;
  placeholder?: string;
};

export function Field({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (name: string, v: unknown) => void }) {
  const { name, label, type = "text", options = [], required, placeholder } = field;
  const set = (v: unknown) => onChange(name, v);

  if (type === "checkbox") {
    return <label className="chk"><input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} /> {label}</label>;
  }
  if (type === "list") return <label className="fld">{label}<ListField value={(value as string[]) || []} onChange={set} placeholder={placeholder} /></label>;
  if (type === "image") return <div className="fld">{label}<ImageField value={value as string} onChange={set} /></div>;

  let input: ReactNode;
  if (type === "textarea") input = <textarea rows={4} value={(value as string) ?? ""} required={required} placeholder={placeholder} onChange={(e) => set(e.target.value)} />;
  else if (type === "select") {
    input = (
      <select value={(value as string) ?? ""} required={required} onChange={(e) => set(e.target.value)}>
        {!required && <option value="">—</option>}
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    );
  } else {
    input = (
      <input
        type={type}
        value={(value as string | number) ?? ""}
        required={required}
        placeholder={placeholder}
        onChange={(e) => set(type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)}
      />
    );
  }
  return <label className="fld">{label}{input}</label>;
}

export function ListField({ value, onChange, placeholder = "New item" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const update = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  return (
    <div className="adm-listfield">
      {value.map((v, i) => (
        <div className="item" key={i}>
          <input value={v} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />
          <button type="button" className="adm-btn icon danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove"><FaTrash /></button>
        </div>
      ))}
      <button type="button" className="adm-btn sm" style={{ justifySelf: "start" }} onClick={() => onChange([...value, ""])}><FaPlus /> Add</button>
    </div>
  );
}

export function ImageField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErr("");
    try {
      onChange(await uploadImage(file));
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="adm-img">
      {value ? <img src={value} alt="" /> : <div className="ph"><FaImage /></div>}
      <div className="col">
        <input type="file" accept="image/*" hidden ref={ref} onChange={pick} />
        <button type="button" className="adm-btn sm" style={{ justifySelf: "start" }} onClick={() => ref.current?.click()} disabled={loading}>
          <FaUpload /> {loading ? "Uploading..." : value ? "Change image" : "Upload image"}
        </button>
        <input value={value || ""} placeholder="or paste an image URL" onChange={(e) => onChange(e.target.value)} />
        {err && <span className="adm-err">{err}</span>}
      </div>
    </div>
  );
}
