"use client";
import { useEffect, useState } from "react";
import { FaLocationDot, FaRegClock, FaUser } from "react-icons/fa6";
import { pkNow } from "@/lib/api";
import type { ClassSession, Weekday } from "@/lib/types";
import { useSite } from "./SiteProvider";

const DAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Schedule({ schedule }: { schedule: Record<Weekday, ClassSession[]> }) {
  const { openBooking } = useSite();
  const [day, setDay] = useState<Weekday>("Monday");
  const [today, setToday] = useState<Weekday | null>(null);

  // Today (Pakistan time) — set only in the browser so hydration matches
  useEffect(() => {
    const t = pkNow().weekday as Weekday;
    setToday(t);
    setDay(t);
  }, []);

  if (!Object.values(schedule).some((d) => d.length)) return null;
  const rows = schedule[day] || [];

  return (
    <section id="schedule" className="section">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Class Timetable</p>
          <h2 className="section-title">Weekly <span className="accent">Schedule</span></h2>
        </div>
        <div className="tabs reveal">
          {DAYS.map((d) => (
            <button key={d} className={d === day ? "active" : ""} onClick={() => setDay(d)}>
              {d.slice(0, 3)}{d === today && <span className="today">TODAY</span>}
            </button>
          ))}
        </div>
        <div className="schedule-table" key={day}>
          <div className="schedule-row head"><span>Time</span><span>Class</span><span>Trainer</span><span>Room</span><span /></div>
          {rows.length === 0 && <div className="schedule-row"><span className="muted">No classes on this day.</span></div>}
          {rows.map((c, i) => (
            <div key={c.id} className="schedule-row" style={{ animationDelay: `${i * 0.07}s` }}>
              <span className="time"><FaRegClock /> {c.time}</span>
              <span className="cls">{c.name}</span>
              <span className="muted"><FaUser /> {c.trainer}</span>
              <span className="muted"><FaLocationDot /> {c.room}</span>
              <button className="btn btn-primary" onClick={() => openBooking({ name: c.name, day, time: c.time })}>Book</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
