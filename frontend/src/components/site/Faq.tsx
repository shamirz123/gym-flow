"use client";
import { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import type { Faq as FaqItem } from "@/lib/types";

export default function Faq({ faqs }: { faqs: FaqItem[] }) {
  const [open, setOpen] = useState(-1);
  if (!faqs.length) return null;
  return (
    <section id="faq" className="section">
      <div className="container faq-wrap">
        <div className="section-head reveal">
          <p className="section-tag">FAQ</p>
          <h2 className="section-title">Frequently Asked <span className="accent">Questions</span></h2>
        </div>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div key={f.id} className={`faq-item reveal ${open === i ? "open" : ""}`}>
              <button className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}<i><FaPlus /></i>
              </button>
              <div className="faq-a" style={{ maxHeight: open === i ? 400 : 0 }}><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
