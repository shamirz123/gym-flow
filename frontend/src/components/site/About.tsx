import { FaArrowRight, FaCircleCheck } from "react-icons/fa6";
import type { Feature, Settings } from "@/lib/types";
import { FEATURE_ICONS } from "./icons";

const DEFAULT_POINTS = [
  "Free fitness assessment on joining",
  "Separate ladies timing with female trainer",
  "Personalised workout & diet plans",
  "Clean, safe & fully air-conditioned",
];

export function About({ settings }: { settings: Settings }) {
  const years = settings.stats?.find((s) => /year/i.test(s.label))?.value || 10;
  const img = settings.images || {};
  const points = settings.aboutPoints?.length ? settings.aboutPoints : DEFAULT_POINTS;
  return (
    <section id="about" className="section">
      <div className="container about-grid">
        <div className="about-images reveal-left">
          <img src={img.about1 || "/images/about1.jpg"} alt={`${settings.name} gym floor`} className="about-img-1" loading="lazy" />
          <img src={img.about2 || "/images/about2.jpg"} alt={`Training at ${settings.name}`} className="about-img-2" loading="lazy" />
          <div className="exp-badge"><strong>{years}+</strong><span>Years of<br />Excellence</span></div>
        </div>
        <div className="about-text reveal-right">
          <p className="section-tag">About Us</p>
          <h2 className="section-title">More Than A Gym — <span className="accent">A Lifestyle</span></h2>
          <p>{settings.aboutText}</p>
          <ul className="check-list">
            {points.map((t) => (
              <li key={t}><i><FaCircleCheck /></i> {t}</li>
            ))}
          </ul>
          <a href="#join" className="btn btn-primary">Book Free Visit <FaArrowRight /></a>
        </div>
      </div>
    </section>
  );
}

export function Features({ features }: { features: Feature[] }) {
  if (!features.length) return null;
  return (
    <section id="features" className="section section-dark">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Why Choose Us</p>
          <h2 className="section-title">Everything You Need To <span className="accent">Succeed</span></h2>
        </div>
        <div className="features-grid">
          {features.map((f, i) => {
            const Icon = FEATURE_ICONS[f.icon] || FEATURE_ICONS.dumbbell;
            return (
              <div key={f.id} className="feature-card reveal-item" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="icon"><Icon /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
