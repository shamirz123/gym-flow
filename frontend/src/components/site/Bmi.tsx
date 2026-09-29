"use client";
import { useState } from "react";
import { FaCalculator } from "react-icons/fa6";

type Level = { max: number; name: string; color: string; zone: [number, number]; tip: (cal: number) => string };
const LEVELS: Level[] = [
  { max: 18.5, name: "Underweight", color: "#3b82f6", zone: [15, 18.5], tip: (c) => `You need to gain some healthy weight. Aim for ~${c + 400} calories a day — our Strength program is ideal for you.` },
  { max: 25, name: "Healthy", color: "#22c55e", zone: [18.5, 25], tip: () => "Great! You're in the healthy range. Join our CrossFit or Strength program to stay in shape." },
  { max: 30, name: "Overweight", color: "#eab308", zone: [25, 30], tip: (c) => `For fat loss, aim for ~${c - 500} calories a day and join our Cardio & Fat Loss program.` },
  { max: Infinity, name: "Obese", color: "#ef4444", zone: [30, 40], tip: () => "Our trainers will build a safe weight-loss plan and diet chart for you. Book a free consultation today." },
];

type Result = { bmi: string; cal: number; lvl: Level; idx: number; pos: number };

export default function Bmi() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [f, setF] = useState({ weight: "", height: "", ft: "", inch: "", age: "", gender: "male", activity: "1.55" });
  const [result, setResult] = useState<Result | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    let kg = +f.weight;
    let cm = +f.height;
    if (unit === "imperial") {
      kg *= 0.453592;
      cm = (+f.ft * 12 + +f.inch) * 2.54;
    }
    if (!kg || !cm || !+f.age) return;
    const bmi = kg / (cm / 100) ** 2;
    const bmr = 10 * kg + 6.25 * cm - 5 * +f.age + (f.gender === "male" ? 5 : -161); // Mifflin-St Jeor
    const cal = Math.round(bmr * +f.activity);
    const idx = LEVELS.findIndex((l) => bmi < l.max);
    const lvl = LEVELS[idx];
    const [a, b] = lvl.zone;
    const pos = (idx + Math.min(Math.max((bmi - a) / (b - a), 0), 1)) * 25;
    setResult({ bmi: bmi.toFixed(1), cal, lvl, idx, pos });
  };

  return (
    <section id="bmi" className="section">
      <div className="container bmi-grid">
        <div className="bmi-text reveal-left">
          <p className="section-tag">Check Your Health</p>
          <h2 className="section-title">BMI & Calorie <span className="accent">Calculator</span></h2>
          <p>Check your Body Mass Index and daily calorie needs. Our trainers will build the right plan for you based on the result.</p>
          <table className="bmi-chart">
            <tbody>
              <tr><th>BMI</th><th>Status</th></tr>
              {["Below 18.5", "18.5 – 24.9", "25.0 – 29.9", "30.0 & above"].map((r, i) => (
                <tr key={r} className={result?.idx === i ? "hl" : ""}><td>{r}</td><td>{LEVELS[i].name}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="bmi-card reveal-right" onSubmit={calculate}>
          <div className="unit-toggle">
            <button type="button" className={unit === "metric" ? "active" : ""} onClick={() => setUnit("metric")}>Metric (kg / cm)</button>
            <button type="button" className={unit === "imperial" ? "active" : ""} onClick={() => setUnit("imperial")}>Imperial (lb / ft)</button>
          </div>
          <div className="form-row">
            <label>Weight ({unit === "metric" ? "kg" : "lb"})<input type="number" min="1" step="0.1" required value={f.weight} onChange={set("weight")} placeholder="70" /></label>
            {unit === "metric" ? (
              <label>Height (cm)<input type="number" min="1" step="0.1" required value={f.height} onChange={set("height")} placeholder="170" /></label>
            ) : (
              <div className="form-row">
                <label>Feet<input type="number" min="1" max="8" required value={f.ft} onChange={set("ft")} placeholder="5" /></label>
                <label>Inches<input type="number" min="0" max="11" value={f.inch} onChange={set("inch")} placeholder="8" /></label>
              </div>
            )}
          </div>
          <div className="form-row">
            <label>Age<input type="number" min="10" max="100" required value={f.age} onChange={set("age")} placeholder="25" /></label>
            <label>Gender
              <select value={f.gender} onChange={set("gender")}><option value="male">Male</option><option value="female">Female</option></select>
            </label>
          </div>
          <label>Activity Level
            <select value={f.activity} onChange={set("activity")}>
              <option value="1.2">Sedentary (no exercise)</option>
              <option value="1.375">Light (1–3 days/week)</option>
              <option value="1.55">Moderate (3–5 days/week)</option>
              <option value="1.725">Active (6–7 days/week)</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-block">Calculate <FaCalculator /></button>

          {result && (
            <div className="bmi-result show">
              <div className="bmi-meter"><div className="bmi-needle" style={{ left: `calc(${result.pos}% - 3px)` }} /></div>
              <div className="bmi-values">
                <div><span>Your BMI</span><strong>{result.bmi}</strong><em style={{ color: result.lvl.color }}>{result.lvl.name}</em></div>
                <div><span>Daily Calories</span><strong>{result.cal.toLocaleString("en-US")}</strong><em>to maintain weight</em></div>
              </div>
              <p id="bmi-advice">{result.lvl.tip(result.cal)}</p>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
