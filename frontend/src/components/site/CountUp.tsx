"use client";
import { useEffect, useRef, useState } from "react";

// Counts from 0 up to the target when it scrolls into view
export default function CountUp({ value, suffix = "", duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setN(Math.floor((1 - Math.pow(1 - p, 3)) * value));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return <strong ref={ref}>{n.toLocaleString("en-US")}{suffix}</strong>;
}
