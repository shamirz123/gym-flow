"use client";
import { useEffect, useState } from "react";
import { FaFloppyDisk, FaPlus, FaTrash } from "react-icons/fa6";
import { gymUrl } from "@/lib/api";
import { api } from "@/lib/dashboardApi";
import type { Settings, Stat, Timing } from "@/lib/types";
import { ImageField, ListField, NoAccess, useDashboard } from "@/components/dashboard/ui";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Only these fields are sent to the backend (not id, gymId or updatedAt)
const KEYS: (keyof Settings)[] = [
  "name", "tagline", "city", "phone", "whatsapp", "email", "address", "mapQuery", "currency", "aboutText", "aboutPoints",
  "offerText", "yearlyDiscount", "admissionFee", "hero", "stats", "timings", "openHours", "socials", "images",
];

export default function SettingsPage() {
  const { toast, can, gym, refreshMe } = useDashboard();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (can("content:write")) api<Settings>("/gym/settings").then(setS).catch((e) => toast(e.message, "err"));
  }, [toast, can]);

  if (!can("content:write")) return <NoAccess />;
  if (!s) return <div className="adm-loading">Loading...</div>;

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS({ ...s, [k]: e.target.type === "number" ? +e.target.value : e.target.value });
  const setIn = <K extends "hero" | "socials" | "images">(obj: K, k: string, v: unknown) => setS({ ...s, [obj]: { ...(s[obj] || {}), [k]: v } });
  const setArr = <T extends Stat | Timing>(key: "stats" | "timings", i: number, field: keyof T, v: unknown) =>
    setS({ ...s, [key]: (s[key] as T[]).map((x, j) => (j === i ? { ...x, [field]: v } : x)) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(KEYS.map((k) => [k, s[k]]));
      setS(await api<Settings>("/gym/settings", { method: "PUT", body }));
      await refreshMe(); // so the gym name updates in the sidebar too
      toast("Settings saved ✅ Website updated");
    } catch (err) {
      toast((err as Error).message, "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={save} style={{ display: "grid", gap: 20 }}>
        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>Gym Information <a href={gymUrl(gym.slug)} target="_blank" rel="noopener" className="adm-btn sm">{gymUrl(gym.slug).replace(/^https?:\/\//, "")}</a></h3>
          <div className="adm-row three">
            <label className="fld">Gym Name<input required value={s.name || ""} onChange={set("name")} /></label>
            <label className="fld">Tagline<input value={s.tagline || ""} onChange={set("tagline")} /></label>
            <label className="fld">City<input value={s.city || ""} onChange={set("city")} /></label>
          </div>
          <div className="adm-row three">
            <label className="fld">Phone<input value={s.phone || ""} onChange={set("phone")} /></label>
            <label className="fld">WhatsApp (923001234567)<input value={s.whatsapp || ""} onChange={set("whatsapp")} /></label>
            <label className="fld">Email<input type="email" value={s.email || ""} onChange={set("email")} /></label>
          </div>
          <div className="adm-row">
            <label className="fld">Address<input value={s.address || ""} onChange={set("address")} /></label>
            <label className="fld">Google Map location<input value={s.mapQuery || ""} onChange={set("mapQuery")} placeholder="F-7 Markaz, Islamabad" /></label>
          </div>
        </div>

        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>Hero Section (top of the website)</h3>
          <div className="fld">Background Image<ImageField value={s.hero?.image} onChange={(v) => setIn("hero", "image", v)} /></div>
          <div className="adm-row">
            <label className="fld">Heading lines<ListField value={s.hero?.title || []} onChange={(v) => setIn("hero", "title", v)} /></label>
            <label className="fld">Typing words<ListField value={s.hero?.rotating || []} onChange={(v) => setIn("hero", "rotating", v)} /></label>
          </div>
          <label className="fld">Subtitle<textarea value={s.hero?.subtitle || ""} onChange={(e) => setIn("hero", "subtitle", e.target.value)} /></label>
          <label className="fld">About Us text<textarea value={s.aboutText || ""} onChange={set("aboutText")} /></label>
          <label className="fld">About Us points (✓ list)<ListField value={s.aboutPoints || []} onChange={(v) => setS({ ...s, aboutPoints: v })} /></label>
        </div>

        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>Website Images</h3>
          <div className="adm-row">
            <div className="fld">About — bari photo<ImageField value={s.images?.about1} onChange={(v) => setIn("images", "about1", v)} /></div>
            <div className="fld">About — choti photo<ImageField value={s.images?.about2} onChange={(v) => setIn("images", "about2", v)} /></div>
          </div>
          <div className="adm-row">
            <div className="fld">Counters section background<ImageField value={s.images?.counters} onChange={(v) => setIn("images", "counters", v)} /></div>
            <div className="fld">Free Trial section background<ImageField value={s.images?.cta} onChange={(v) => setIn("images", "cta", v)} /></div>
          </div>
        </div>

        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>
            Stats / Counters
            <button type="button" className="adm-btn sm" onClick={() => setS({ ...s, stats: [...(s.stats || []), { value: 0, suffix: "+", label: "" }] })}><FaPlus /> Add</button>
          </h3>
          {(s.stats || []).map((st, i) => (
            <div key={i} className="adm-toolbar">
              <input type="number" style={{ width: 110 }} value={st.value} onChange={(e) => setArr<Stat>("stats", i, "value", +e.target.value)} />
              <input style={{ width: 70 }} value={st.suffix || ""} placeholder="+" onChange={(e) => setArr<Stat>("stats", i, "suffix", e.target.value)} />
              <input style={{ flex: 1 }} value={st.label} placeholder="Label" onChange={(e) => setArr<Stat>("stats", i, "label", e.target.value)} />
              <button type="button" className="adm-btn icon danger" onClick={() => setS({ ...s, stats: s.stats.filter((_, j) => j !== i) })}><FaTrash /></button>
            </div>
          ))}
        </div>

        <div className="adm-grid-2">
          <div className="adm-card" style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <h3>
              Timings (shown on the website)
              <button type="button" className="adm-btn sm" onClick={() => setS({ ...s, timings: [...(s.timings || []), { day: "", time: "" }] })}><FaPlus /> Add</button>
            </h3>
            {(s.timings || []).map((t, i) => (
              <div key={i} className="adm-toolbar">
                <input style={{ flex: 1 }} value={t.day} placeholder="Monday – Saturday" onChange={(e) => setArr<Timing>("timings", i, "day", e.target.value)} />
                <input style={{ flex: 1 }} value={t.time} placeholder="6:00 AM – 11:00 PM" onChange={(e) => setArr<Timing>("timings", i, "time", e.target.value)} />
                <button type="button" className="adm-btn icon danger" onClick={() => setS({ ...s, timings: s.timings.filter((_, j) => j !== i) })}><FaTrash /></button>
              </div>
            ))}
          </div>
          <div className="adm-card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <h3>Opening hours (24h — used for &quot;Open Now&quot;)</h3>
            {DAY_NAMES.map((d, i) => {
              const [o, c] = s.openHours?.[i] || [0, 0];
              const upd = (idx: 0 | 1, v: number) =>
                setS({ ...s, openHours: (s.openHours || Array(7).fill([0, 0])).map((x, j) => (j === i ? (idx === 0 ? [v, x[1]] : [x[0], v]) : x)) as [number, number][] });
              return (
                <div key={d} className="adm-toolbar">
                  <span style={{ width: 90 }}>{d}</span>
                  <input type="number" min="0" max="24" style={{ width: 80 }} value={o} onChange={(e) => upd(0, +e.target.value)} />
                  <span style={{ color: "var(--muted)" }}>to</span>
                  <input type="number" min="0" max="24" style={{ width: 80 }} value={c} onChange={(e) => upd(1, +e.target.value)} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>Pricing & Offer</h3>
          <div className="adm-row three">
            <label className="fld">Yearly discount (%)<input type="number" min="0" max="90" value={s.yearlyDiscount ?? 0} onChange={set("yearlyDiscount")} /></label>
            <label className="fld">Admission fee (Rs.)<input type="number" min="0" value={s.admissionFee ?? 0} onChange={set("admissionFee")} /></label>
            <label className="fld">Currency<input value={s.currency || ""} onChange={set("currency")} /></label>
          </div>
          <label className="fld">Offer text (Join section)<input value={s.offerText || ""} onChange={set("offerText")} /></label>
        </div>

        <div className="adm-card" style={{ display: "grid", gap: 14 }}>
          <h3>Social Media Links</h3>
          <div className="adm-row">
            {(["facebook", "instagram", "youtube", "tiktok"] as const).map((k) => (
              <label key={k} className="fld" style={{ textTransform: "capitalize" }}>{k}<input value={s.socials?.[k] || ""} onChange={(e) => setIn("socials", k, e.target.value)} placeholder="https://..." /></label>
            ))}
          </div>
        </div>

        <div className="adm-save-bar">
          <button className="adm-btn primary" disabled={saving}><FaFloppyDisk /> {saving ? "Saving..." : "Save Settings"}</button>
        </div>
      </form>

      <ChangePassword />
    </>
  );
}

function ChangePassword() {
  const { toast } = useDashboard();
  const [f, setF] = useState({ current: "", next: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api<{ message: string }>("/auth/password", { method: "PUT", body: f });
      toast(r.message + " ✅");
      setF({ current: "", next: "" });
    } catch (err) {
      toast((err as Error).message, "err");
    }
  };
  return (
    <form className="adm-card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
      <h3>Change Your Password</h3>
      <div className="adm-row">
        <label className="fld">Current password<input type="password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></label>
        <label className="fld">New password (8+ characters)<input type="password" required minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></label>
      </div>
      <button className="adm-btn" style={{ justifySelf: "start" }}>Update Password</button>
    </form>
  );
}
