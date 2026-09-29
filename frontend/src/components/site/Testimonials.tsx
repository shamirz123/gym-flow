"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaQuoteLeft } from "react-icons/fa6";
import type { Testimonial } from "@/lib/types";

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const n = testimonials.length;
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const startX = useRef(0);

  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);
  const restart = useCallback(() => {
    clearInterval(timer.current);
    if (n > 1) timer.current = setInterval(() => setI((x) => (x + 1) % n), 5000);
  }, [n]);

  useEffect(() => {
    restart();
    return () => clearInterval(timer.current);
  }, [restart]);

  const nav = (k: number) => { go(k); restart(); };
  if (!n) return null;

  return (
    <section id="testimonials" className="section section-dark">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Success Stories</p>
          <h2 className="section-title">What Our <span className="accent">Members</span> Say</h2>
        </div>
        <div className="slider reveal">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${i * 100}%)` }}
            onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - startX.current;
              if (Math.abs(dx) > 50) nav(dx < 0 ? i + 1 : i - 1);
            }}
          >
            {testimonials.map((t) => (
              <div className="testimonial" key={t.id}>
                <div className="quote"><FaQuoteLeft /></div>
                <p>&ldquo;{t.text}&rdquo;</p>
                <div className="stars">★★★★★</div>
                <div className="author">
                  {t.image && <img src={t.image} alt={t.name} loading="lazy" />}
                  <div><h4>{t.name}</h4><span>{t.result}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="slider-controls">
            <button aria-label="Previous" onClick={() => nav(i - 1)}><FaArrowLeft /></button>
            <div className="slider-dots">
              {testimonials.map((t, j) => (
                <button key={t.id} className={j === i ? "active" : ""} aria-label={`Slide ${j + 1}`} onClick={() => nav(j)} />
              ))}
            </div>
            <button aria-label="Next" onClick={() => nav(i + 1)}><FaArrowRight /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
