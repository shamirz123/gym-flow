"use client";
import { useState } from "react";
import { FaCheck, FaXmark } from "react-icons/fa6";
import { money } from "@/lib/api";
import type { MembershipPlan } from "@/lib/types";
import { useSite } from "./SiteProvider";

export default function Pricing({ plans }: { plans: MembershipPlan[] }) {
  const { settings, setPrefill } = useSite();
  const [yearly, setYearly] = useState(false);
  if (!plans.length) return null;
  const discount = settings.yearlyDiscount || 0;
  const fmt = (n: number) => money(settings.currency, n);

  return (
    <section id="pricing" className="section section-dark">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Membership Plans</p>
          <h2 className="section-title">Simple, Honest <span className="accent">Pricing</span></h2>
          <div className="billing-toggle">
            <span className={!yearly ? "active" : ""}>Monthly</span>
            <button id="billing-switch" className={yearly ? "on" : ""} aria-label="Toggle yearly pricing" onClick={() => setYearly(!yearly)}><span /></button>
            <span className={yearly ? "active" : ""}>Yearly {discount > 0 && <em className="save-badge">Save {discount}%</em>}</span>
          </div>
        </div>
        <div className="pricing-grid">
          {plans.map((p, i) => {
            const perMonth = yearly ? p.monthly * (1 - discount / 100) : p.monthly;
            return (
              <div key={p.id} className={`price-card reveal-item ${p.popular ? "popular" : ""}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                {p.popular && <span className="popular-badge">MOST POPULAR</span>}
                <h3>{p.name}</h3>
                <span className="price-old">{yearly && discount > 0 ? `${fmt(p.monthly)}/mo` : ""}</span>
                <div className="price"><strong>{fmt(perMonth)}</strong><small>/ month</small></div>
                <ul>
                  {p.features.map((f) => <li key={f}><i><FaCheck /></i>{f}</li>)}
                  {p.missing.map((f) => <li key={f} className="no"><i><FaXmark /></i>{f}</li>)}
                </ul>
                {yearly && <p style={{ color: "var(--muted)", fontSize: 13, margin: "-18px 0 18px" }}>Billed {fmt(perMonth * 12)} yearly</p>}
                <a href="#join" className={`btn btn-block ${p.popular ? "btn-primary" : "btn-outline"}`} onClick={() => setPrefill((x) => ({ ...x, plan: p.name }))}>
                  Choose {p.name}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
