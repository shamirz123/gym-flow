"use client";
import { useCallback, useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlassPlus, FaXmark } from "react-icons/fa6";
import type { GalleryImage } from "@/lib/types";

const FILTERS = ["all", "equipment", "training", "classes"] as const;

export default function Gallery({ gallery }: { gallery: GalleryImage[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState(-1);
  const items = gallery.filter((g) => filter === "all" || g.category === filter);

  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((d: number) => setOpen((i) => (i + d + items.length) % items.length), [items.length]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open >= 0);
    if (open < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, close, step]);

  if (!gallery.length) return null;

  return (
    <section id="gallery" className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Gallery</p>
          <h2 className="section-title">Inside Our <span className="accent">Gym</span></h2>
        </div>
        <div className="gallery-filters reveal">
          {FILTERS.map((f) => (
            <button key={f} className={f === filter ? "active" : ""} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <div className={`gallery-grid ${filter !== "all" ? "filtered" : ""}`}>
          {items.map((g, i) => (
            <div key={g.id} className="gallery-item" style={{ animation: `fadeUp .6s ${(i % 4) * 0.08}s ease both` }} onClick={() => setOpen(i)}>
              <img src={g.image} alt={`Gym ${g.category}`} loading="lazy" />
              <span className="zoom"><FaMagnifyingGlassPlus /></span>
            </div>
          ))}
        </div>
      </div>

      <div className={`lightbox ${open >= 0 ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && close()}>
        <button className="lb-close" aria-label="Close" onClick={close}><FaXmark /></button>
        <button className="lb-prev" aria-label="Previous" onClick={() => step(-1)}><FaChevronLeft /></button>
        {open >= 0 && <img src={items[open]?.image} alt="Gallery" />}
        <button className="lb-next" aria-label="Next" onClick={() => step(1)}><FaChevronRight /></button>
      </div>
    </section>
  );
}
