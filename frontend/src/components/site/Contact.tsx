"use client";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaClock, FaDumbbell, FaEnvelope, FaFacebookF, FaInstagram, FaLocationDot, FaPaperPlane,
  FaPhone, FaTiktok, FaWhatsapp, FaYoutube,
} from "react-icons/fa6";
import { pkNow, postPublic, PHONE_RE, SITE_URL, waLink } from "@/lib/api";
import type { Program } from "@/lib/types";
import { useSite } from "./SiteProvider";

export function Contact() {
  const { slug, settings: s } = useSite();
  const [f, setF] = useState({ name: "", phone: "", message: "" });
  const [errors, setErrors] = useState({ name: false, phone: false, message: false });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  // Based on Pakistan time, refreshed every minute
  useEffect(() => {
    const check = () => {
      const { dayIndex, hour } = pkNow();
      const [open, close] = s.openHours?.[dayIndex] || [0, 0];
      setIsOpen(hour >= open && hour < close);
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [s.openHours]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
    setErrors({ ...errors, [k]: false });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = { name: f.name.trim().length < 2, phone: !PHONE_RE.test(f.phone.trim()), message: f.message.trim().length < 3 };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return setMsg({ type: "err", text: "Please fill in all fields correctly." });
    setLoading(true);
    try {
      const res = await postPublic(`/gyms/${slug}/contact`, f);
      setMsg({ type: "ok", text: "✅ " + res.message });
      setF({ name: "", phone: "", message: "" });
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="section section-dark">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Get In Touch</p>
          <h2 className="section-title">Visit Or <span className="accent">Contact Us</span></h2>
        </div>
        <div className="contact-grid">
          <div className="contact-info reveal-left">
            {s.address && <div className="info-card"><i><FaLocationDot /></i><div><h4>Address</h4><p>{s.address}</p></div></div>}
            {s.phone && <div className="info-card"><i><FaPhone /></i><div><h4>Phone</h4><p><a href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></p></div></div>}
            {s.email && <div className="info-card"><i><FaEnvelope /></i><div><h4>Email</h4><p><a href={`mailto:${s.email}`}>{s.email}</a></p></div></div>}
            <div className="info-card">
              <i><FaClock /></i>
              <div>
                <h4>Opening Hours</h4>
                <div id="timings">{s.timings?.map((t) => <div key={t.day}><span>{t.day}</span><span>{t.time}</span></div>)}</div>
                {isOpen !== null && <p className={`open-status ${isOpen ? "open" : "closed"}`}>{isOpen ? "Open Now" : "Closed Now"}</p>}
              </div>
            </div>
          </div>
          <div className="contact-right reveal-right">
            <form className="contact-form" onSubmit={submit} noValidate>
              <div className="form-row">
                <label>Name<input className={errors.name ? "invalid" : ""} value={f.name} onChange={set("name")} placeholder="Your name" /></label>
                <label>Phone<input type="tel" className={errors.phone ? "invalid" : ""} value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" /></label>
              </div>
              <label>Message<textarea rows={4} className={errors.message ? "invalid" : ""} value={f.message} onChange={set("message")} placeholder="Your question..." /></label>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Sending..." : <>Send Message <FaPaperPlane /></>}</button>
              <p className={`form-msg ${msg?.type || ""}`}>{msg?.text}</p>
            </form>
            {(s.mapQuery || s.address) && (
              <div className="map-wrap">
                <iframe title="Gym location" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.address)}&z=15&output=embed`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const SOCIAL_ICONS: Record<string, IconType> = { facebook: FaFacebookF, instagram: FaInstagram, youtube: FaYoutube, tiktok: FaTiktok };

export function Footer({ programs }: { programs: Program[] }) {
  const { slug, settings: s } = useSite();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postPublic(`/gyms/${slug}/subscribe`, { email });
      setMsg({ type: "ok", text: "✅ " + res.message });
      setEmail("");
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    }
  };

  return (
    <>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <a href="#home" className="logo"><i><FaDumbbell /></i> {s.name}</a>
            <p className="footer-about">Transforming lives through fitness. Join the strongest community in {s.city}.</p>
            <div className="socials">
              {Object.entries(s.socials || {}).filter(([, url]) => url && url !== "#").map(([k, url]) => {
                const Icon = SOCIAL_ICONS[k];
                return Icon ? <a key={k} href={url} target="_blank" rel="noopener" aria-label={k}><Icon /></a> : null;
              })}
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              {["about", "programs", "schedule", "pricing", "faq"].map((l) => (
                <li key={l}><a href={`#${l}`}>{l === "faq" ? "FAQ" : l[0].toUpperCase() + l.slice(1)}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Programs</h4>
            <ul>{programs.slice(0, 5).map((p) => <li key={p.id}><a href="#programs">{p.title}</a></li>)}</ul>
          </div>
          <div>
            <h4>Newsletter</h4>
            <p>Fitness tips and offers straight to your inbox.</p>
            <form className="newsletter" onSubmit={subscribe}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email" />
              <button type="submit" aria-label="Subscribe"><FaPaperPlane /></button>
            </form>
            <p className={`form-msg ${msg?.type || ""}`}>{msg?.text}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {s.name} {s.tagline}. All rights reserved. · Powered by <a href={SITE_URL} style={{ color: "var(--primary)" }}>GymFlow</a></p>
        </div>
      </footer>

      {s.whatsapp && (
        <a className="whatsapp-float" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"
          href={waLink(s.whatsapp, `Hello! I'd like to know more about membership at ${s.name}.`)}>
          <FaWhatsapp /><span>Chat with us</span>
        </a>
      )}
    </>
  );
}
