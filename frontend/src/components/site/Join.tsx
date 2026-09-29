"use client";
import { useEffect, useState } from "react";
import { FaPaperPlane } from "react-icons/fa6";
import { postPublic, PHONE_RE } from "@/lib/api";
import type { MembershipPlan } from "@/lib/types";
import { useSite } from "./SiteProvider";

const TIMES = ["Morning (6–11 AM)", "Afternoon (11–3 PM)", "Evening (3–8 PM)", "Night (8–11 PM)"];
const GOALS = ["Weight Loss", "Muscle Gain", "General Fitness", "Boxing / Self Defence", "Flexibility / Yoga"];

export default function Join({ plans }: { plans: MembershipPlan[] }) {
  const { slug, settings, prefill } = useSite();
  const empty = { name: "", phone: "", plan: plans[0]?.name || "", time: TIMES[0], goal: GOALS[0] };
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState({ name: false, phone: false });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const left = useCountdown();

  // Coming from Pricing / Programs pre-selects the plan and goal
  useEffect(() => {
    if (prefill.plan || prefill.goal) setF((x) => ({ ...x, ...prefill }));
  }, [prefill]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (k === "name" || k === "phone") setErrors({ ...errors, [k]: false });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = { name: f.name.trim().length < 2, phone: !PHONE_RE.test(f.phone.trim()) };
    setErrors(errs);
    if (errs.name || errs.phone) return setMsg({ type: "err", text: "Please enter your name and a valid mobile number (03XX XXXXXXX)." });
    setLoading(true);
    try {
      const res = await postPublic(`/gyms/${slug}/leads`, f);
      setMsg({ type: "ok", text: "✅ " + res.message });
      setF(empty);
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="join" className="join" style={settings.images?.cta ? { backgroundImage: `url("${settings.images.cta}")` } : undefined}>
      <div className="join-overlay" />
      <div className="container join-grid">
        <div className="join-text reveal-left">
          <p className="section-tag">Limited Offer</p>
          <h2 className="section-title">Your First Day Is <span className="accent">FREE</span></h2>
          <p>Fill in the form and our team will contact you within 24 hours. Or message us directly on WhatsApp!</p>
          <div className="offer-timer">
            {([["d", "Days"], ["h", "Hours"], ["m", "Mins"], ["s", "Secs"]] as const).map(([k, l]) => (
              <div key={k}><strong>{left ? left[k] : "--"}</strong><span>{l}</span></div>
            ))}
          </div>
          {settings.offerText && <p className="timer-note"><strong>{settings.offerText}</strong></p>}
        </div>

        <form className="join-form reveal-right" onSubmit={submit} noValidate>
          <h3>Book Your Free Trial</h3>
          <label>Full Name<input className={errors.name ? "invalid" : ""} value={f.name} onChange={set("name")} placeholder="Ali Ahmed" /></label>
          <label>Phone Number<input type="tel" className={errors.phone ? "invalid" : ""} value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" /></label>
          <div className="form-row">
            <label>Plan
              <select value={f.plan} onChange={set("plan")}>{plans.map((p) => <option key={p.id}>{p.name}</option>)}</select>
            </label>
            <label>Preferred Time
              <select value={f.time} onChange={set("time")}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
          </div>
          <label>Your Goal
            <select value={f.goal} onChange={set("goal")}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Sending..." : <>Book Free Trial <FaPaperPlane /></>}
          </button>
          <p className={`form-msg ${msg?.type || ""}`}>{msg?.text}</p>
        </form>
      </div>
    </section>
  );
}

// Countdown to the end of the month (Pakistan time, UTC+5)
function useCountdown() {
  const [left, setLeft] = useState<{ d: string; h: string; m: string; s: string } | null>(null);
  useEffect(() => {
    const pk = new Date(Date.now() + 5 * 36e5); // PKT expressed in UTC fields
    const end = new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth() + 1, 1) - 5 * 36e5);
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = Math.max(end.getTime() - Date.now(), 0);
      setLeft({
        d: pad(Math.floor(diff / 864e5)),
        h: pad(Math.floor((diff / 36e5) % 24)),
        m: pad(Math.floor((diff / 6e4) % 60)),
        s: pad(Math.floor((diff / 1e3) % 60)),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}
