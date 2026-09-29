"use client";
import { FaArrowRight, FaCalendarCheck, FaTrophy, FaUsers, FaUserTie } from "react-icons/fa6";
import type { Program, Stat } from "@/lib/types";
import { useSite } from "./SiteProvider";
import CountUp from "./CountUp";

const GOALS: Record<string, string> = { Cardio: "Weight Loss", Strength: "Muscle Gain", Boxing: "Boxing / Self Defence", Yoga: "Flexibility / Yoga" };

export function Programs({ programs }: { programs: Program[] }) {
  const { setPrefill } = useSite();
  if (!programs.length) return null;
  const pick = (title: string) => {
    const key = Object.keys(GOALS).find((k) => title.includes(k));
    setPrefill((p) => ({ ...p, goal: key ? GOALS[key] : "General Fitness" }));
  };

  return (
    <section id="programs" className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Our Programs</p>
          <h2 className="section-title">Choose Your <span className="accent">Program</span></h2>
          <p className="section-desc">A program for every fitness level and goal — from beginners to pro athletes.</p>
        </div>
        <div className="programs-grid">
          {programs.map((p, i) => (
            <div key={p.id} className="program-card reveal-item" style={{ transitionDelay: `${i * 0.08}s` }}>
              <img src={p.image || "/images/p-strength.jpg"} alt={p.title} loading="lazy" />
              <div className="program-info">
                <span className="program-level">{p.level}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <a href="#join" className="link" onClick={() => pick(p.title)}>Join Program <FaArrowRight /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const COUNTER_ICONS = [FaUsers, FaUserTie, FaCalendarCheck, FaTrophy];

export function Counters({ stats, image }: { stats: Stat[]; image?: string }) {
  if (!stats.length) return null;
  return (
    <section
      className="counters"
      style={image ? { backgroundImage: `linear-gradient(rgba(10,10,12,0.85), rgba(10,10,12,0.85)), url("${image}")` } : undefined}
    >
      <div className="container counters-grid">
        {stats.map((s, i) => {
          const Icon = COUNTER_ICONS[i % 4];
          return (
            <div key={s.label} className="counter reveal-item" style={{ transitionDelay: `${i * 0.1}s` }}>
              <i><Icon /></i>
              <CountUp value={s.value} suffix={s.suffix} />
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
