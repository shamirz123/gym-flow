"use client";
import { useEffect, useState } from "react";
import { FaArrowUp, FaDumbbell } from "react-icons/fa6";

const LINKS = ["home", "about", "programs", "schedule", "trainers", "pricing", "gallery", "contact"];

export default function Navbar({ name }: { name: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? (y / max) * 100 : 0);
      let current = "home";
      document.querySelectorAll<HTMLElement>("section[id]").forEach((s) => { if (y >= s.offsetTop - 140) current = s.id; });
      setActive(current);
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const t = setTimeout(() => setLoaded(true), 700);
    return () => { removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
  }, [open]);

  return (
    <>
      <div id="preloader" className={loaded ? "done" : ""}>
        <div className="loader-bar"><span /></div>
        <div className="loader-logo"><i><FaDumbbell /></i> {name}</div>
      </div>
      <div id="scroll-progress" style={{ width: progress + "%" }} />
      <header id="navbar" className={scrolled ? "scrolled" : ""}>
        <div className="container nav-inner">
          <a href="#home" className="logo"><i><FaDumbbell /></i> {name}</a>
          <nav id="nav-links" className={open ? "open" : ""}>
            {LINKS.map((l) => (
              <a key={l} href={`#${l}`} className={active === l ? "active" : ""} onClick={() => setOpen(false)}>
                {l[0].toUpperCase() + l.slice(1)}
              </a>
            ))}
            <a href="#join" className="btn btn-primary nav-cta" onClick={() => setOpen(false)}>Join Now</a>
          </nav>
          <button id="menu-toggle" className={open ? "open" : ""} aria-label="Menu" onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>
      </header>
      <button id="back-to-top" className={progress > 8 ? "show" : ""} aria-label="Back to top" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}>
        <FaArrowUp />
      </button>
    </>
  );
}
