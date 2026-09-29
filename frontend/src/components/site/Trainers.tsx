import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { waLink } from "@/lib/api";
import type { Trainer } from "@/lib/types";

export default function Trainers({ trainers, whatsapp }: { trainers: Trainer[]; whatsapp: string }) {
  if (!trainers.length) return null;
  return (
    <section id="trainers" className="section section-dark">
      <div className="container">
        <div className="section-head reveal">
          <p className="section-tag">Our Team</p>
          <h2 className="section-title">Meet Your <span className="accent">Trainers</span></h2>
        </div>
        <div className="trainers-grid">
          {trainers.map((t, i) => (
            <div key={t.id} className="trainer-card reveal-item" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="trainer-img">
                <img src={t.image || "/images/t1.jpg"} alt={t.name} loading="lazy" />
                <div className="trainer-social">
                  {t.facebook && <a href={t.facebook} target="_blank" rel="noopener" aria-label="Facebook"><FaFacebookF /></a>}
                  {t.instagram && <a href={t.instagram} target="_blank" rel="noopener" aria-label="Instagram"><FaInstagram /></a>}
                  {whatsapp && (
                    <a href={waLink(whatsapp, `Hello! I'd like to ask about personal training with ${t.name}.`)} target="_blank" rel="noopener" aria-label="WhatsApp"><FaWhatsapp /></a>
                  )}
                </div>
              </div>
              <div className="trainer-info"><h3>{t.name}</h3><p>{t.role}</p>{t.exp && <span>{t.exp} experience</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
