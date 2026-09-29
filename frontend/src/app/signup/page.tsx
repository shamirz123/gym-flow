"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaCheck, FaDumbbell, FaXmark } from "react-icons/fa6";
import { API_URL, ROOT_DOMAIN } from "@/lib/api";
import { api, setGymId, setToken } from "@/lib/dashboardApi";
import type { Me } from "@/lib/types";
import "../dashboard/dashboard.css";

// "Iron Pulse Gym" -> "iron-pulse-gym"
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

export default function SignupPage() {
  const router = useRouter();
  const [f, setF] = useState({ gymName: "", slug: "", city: "Islamabad", name: "", email: "", password: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setF((x) => ({ ...x, [k]: v, ...(k === "gymName" && !slugTouched ? { slug: toSlug(v) } : {}) }));
  };

  // Is the subdomain available? (checked while typing, with a short debounce)
  useEffect(() => {
    if (f.slug.length < 3) return setSlugState(f.slug ? "invalid" : "idle");
    setSlugState("checking");
    const t = setTimeout(async () => {
      const r = await fetch(`${API_URL}/api/public/slug-available/${encodeURIComponent(f.slug)}`).then((x) => x.json()).catch(() => null);
      setSlugState(!r ? "idle" : r.available ? "ok" : r.reason === "invalid" ? "invalid" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [f.slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { token, user } = await api<{ token: string; user: Me }>("/auth/signup", { method: "POST", body: f });
      setToken(token);
      setGymId(user.gyms[0]?.id ?? null);
      router.replace("/dashboard?welcome=1");
    } catch (e2) {
      setErr((e2 as Error).message);
      setLoading(false);
    }
  };

  const host = ROOT_DOMAIN.replace(/:\d+$/, "");
  const slugMsg = {
    idle: null,
    checking: <span style={{ color: "var(--muted)" }}>Checking...</span>,
    ok: <span style={{ color: "#4ade80" }}><FaCheck /> {f.slug}.{host} is available</span>,
    taken: <span className="adm-err"><FaXmark /> This name is taken by another gym</span>,
    invalid: <span className="adm-err">3-32 characters: lowercase letters, numbers, dashes (-)</span>,
  }[slugState];

  return (
    <div className="adm">
      <div className="adm-login">
        <form onSubmit={submit} style={{ width: "min(460px, 100%)" }}>
          <h1><FaDumbbell /> Register your gym</h1>
          <p>14-day free trial — no credit card required</p>
          <label className="fld">Gym name<input required value={f.gymName} onChange={set("gymName")} placeholder="Iron Pulse Fitness" /></label>
          <label className="fld">
            Website address
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input required value={f.slug} onChange={(e) => { setSlugTouched(true); setF({ ...f, slug: toSlug(e.target.value) }); }} placeholder="ironpulse" />
              <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>.{host}</span>
            </div>
            {slugMsg}
          </label>
          <label className="fld">City<input value={f.city} onChange={set("city")} /></label>
          <div className="adm-row">
            <label className="fld">Your name<input required value={f.name} onChange={set("name")} /></label>
            <label className="fld">Email<input type="email" required value={f.email} onChange={set("email")} /></label>
          </div>
          <label className="fld">Password (8+ characters)<input type="password" required minLength={8} value={f.password} onChange={set("password")} /></label>
          {err && <span className="adm-err">{err}</span>}
          <button className="adm-btn primary" disabled={loading || slugState === "taken" || slugState === "invalid"}>
            {loading ? "Creating your gym..." : "Create my gym"}
          </button>
          <p style={{ margin: 0, fontSize: 13 }}>Already have an account? <Link href="/login" style={{ color: "var(--primary)" }}>Login</Link></p>
        </form>
      </div>
    </div>
  );
}
