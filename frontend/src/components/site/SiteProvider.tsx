"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { FaWhatsapp, FaXmark } from "react-icons/fa6";
import { postPublic, PHONE_RE } from "@/lib/api";
import type { Settings } from "@/lib/types";

type BookingClass = { name: string; day: string; time: string };
type Prefill = { plan?: string; goal?: string };
type Ctx = {
  slug: string;
  settings: Settings;
  toast: (msg: string, type?: "ok" | "err") => void;
  openBooking: (cls: BookingClass) => void;
  prefill: Prefill;
  setPrefill: Dispatch<SetStateAction<Prefill>>;
};

const SiteContext = createContext<Ctx | null>(null);
export const useSite = () => {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside SiteProvider");
  return ctx;
};

export default function SiteProvider({ slug, settings, children }: { slug: string; settings: Settings; children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [booking, setBooking] = useState<BookingClass | null>(null);
  const [prefill, setPrefill] = useState<Prefill>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToastMsg({ msg, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 3500);
  }, []);

  useReveal();

  useEffect(() => {
    document.body.classList.toggle("no-scroll", !!booking);
  }, [booking]);

  return (
    <SiteContext.Provider value={{ slug, settings, toast, openBooking: setBooking, prefill, setPrefill }}>
      <div className="site">
        {children}
        <BookingModal slug={slug} cls={booking} onClose={() => setBooking(null)} toast={toast} />
        <div className={`toast ${toastMsg ? "show" : ""}`} style={toastMsg?.type === "err" ? { borderColor: "#ef4444" } : undefined}>
          {toastMsg?.msg}
        </div>
      </div>
    </SiteContext.Provider>
  );
}

// Animates elements on scroll (also picks up newly added elements)
function useReveal() {
  useEffect(() => {
    const sel = ".reveal, .reveal-left, .reveal-right, .reveal-item";
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(sel).forEach((el) => el.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    // Each effect run keeps its own record — so when StrictMode runs the effect twice,
    // the new observer still observes every element (no flags stored on the DOM)
    const seen = new WeakSet<Element>();
    const scan = () => document.querySelectorAll(sel).forEach((el) => {
      if (!el.classList.contains("in-view") && !seen.has(el)) { seen.add(el); io.observe(el); }
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

function BookingModal({ slug, cls, onClose, toast }: { slug: string; cls: BookingClass | null; onClose: () => void; toast: Ctx["toast"] }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState({ name: false, phone: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    const errs = { name: form.name.trim().length < 2, phone: !PHONE_RE.test(form.phone.trim()) };
    setErrors(errs);
    if (errs.name || errs.phone) return;
    setLoading(true);
    try {
      const res = await postPublic(`/gyms/${slug}/bookings`, { ...form, className: cls.name, day: cls.day, time: cls.time });
      toast("✅ " + res.message);
      setForm({ name: "", phone: "" });
      onClose();
    } catch (err) {
      toast("⚠️ " + (err as Error).message, "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal ${cls ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><FaXmark /></button>
        <h3>Book Class</h3>
        <p className="modal-class">{cls && `${cls.name} · ${cls.day} · ${cls.time}`}</p>
        <form onSubmit={submit} noValidate>
          <label>Name
            <input className={errors.name ? "invalid" : ""} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          </label>
          <label>Phone
            <input type="tel" className={errors.phone ? "invalid" : ""} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03XX XXXXXXX" />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            <FaWhatsapp /> {loading ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
