"use client";
import { useEffect, useState } from "react";
import { FaArrowRight, FaBolt, FaPlay, FaStar } from "react-icons/fa6";
import type { Settings } from "@/lib/types";
import CountUp from "./CountUp";

export default function Hero({ settings }: { settings: Settings }) {
  const { hero = {}, stats = [], city } = settings;
  const word = useTyping((hero.rotating?.length ? hero.rotating : ["Strength"]).join("|"));

  return (
    <>
      <section id="home" className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url("${hero.image || "/images/hero.jpg"}")` }} />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <p className="hero-badge reveal"><FaBolt /> #1 Fitness Club in {city}</p>
          <h1 className="hero-title">
            {(hero.title || []).map((w, i) => (
              <span className="line" key={i}><span style={{ animationDelay: `${0.3 + i * 0.15}s` }}>{w}</span></span>
            ))}
          </h1>
          <p className="hero-rotate reveal">Train for <span id="rotating-word">{word}</span><span className="caret">|</span></p>
          <p className="hero-sub reveal">{hero.subtitle}</p>
          <div className="hero-btns reveal">
            <a href="#join" className="btn btn-primary">Start Free Trial <FaArrowRight /></a>
            <a href="#programs" className="btn btn-outline"><FaPlay /> Explore Programs</a>
          </div>
          <div className="hero-stats reveal">
            {stats.slice(0, 3).map((s) => (
              <div key={s.label}><CountUp value={s.value} suffix={s.suffix} /><span>{s.label}</span></div>
            ))}
          </div>
        </div>
        <a href="#about" className="scroll-down" aria-label="Scroll down"><span /></a>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].flatMap((k) =>
            ["STRENGTH", "CARDIO", "CROSSFIT", "BOXING", "YOGA", "NUTRITION"].map((t) => (
              <span key={k + t} style={{ display: "contents" }}><span>{t}</span><i><FaStar /></i></span>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function useTyping(joined: string) {
  const [text, setText] = useState("");
  useEffect(() => {
    const words = joined.split("|");
    let w = 0, c = 0, deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const type = () => {
      const word = words[w];
      setText(word.slice(0, c));
      if (!deleting && c < word.length) c++;
      else if (deleting && c > 0) c--;
      else if (!deleting) { deleting = true; t = setTimeout(type, 1600); return; }
      else { deleting = false; w = (w + 1) % words.length; }
      t = setTimeout(type, deleting ? 50 : 110);
    };
    type();
    return () => clearTimeout(t);
  }, [joined]);
  return text;
}
