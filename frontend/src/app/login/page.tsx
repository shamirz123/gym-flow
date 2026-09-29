"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaDumbbell } from "react-icons/fa6";
import { api, getGymId, setGymId, setToken } from "@/lib/dashboardApi";
import type { Me } from "@/lib/types";
import "../dashboard/dashboard.css";

export default function LoginPage() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { token, user } = await api<{ token: string; user: Me }>("/auth/login", { method: "POST", body: f });
      setToken(token);
      // Reopen the last gym if the user is still staff there; otherwise the first gym
      const last = getGymId();
      setGymId(user.gyms.find((g) => g.id === last)?.id ?? user.gyms[0]?.id ?? null);
      router.replace(user.gyms.length === 0 && user.isSuperAdmin ? "/dashboard/platform" : "/dashboard");
    } catch (e2) {
      setErr((e2 as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="adm">
      <div className="adm-login">
        <form onSubmit={submit}>
          <h1><FaDumbbell /> GymFlow Login</h1>
          <p>Log in to your gym staff dashboard</p>
          <label className="fld">Email<input type="email" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label className="fld">Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
          {err && <span className="adm-err">{err}</span>}
          <button className="adm-btn primary" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
          <p style={{ margin: 0, fontSize: 13 }}>New gym? <Link href="/signup" style={{ color: "var(--primary)" }}>Start a 14-day free trial</Link></p>
        </form>
      </div>
    </div>
  );
}
