import type { Metadata } from "next";
import { FaDumbbell, FaLocationDot, FaPhone } from "react-icons/fa6";
import { API_URL, gymUrl } from "@/lib/api";
import "../../site.css";
import "./card.css";

type Card = {
  name: string;
  plan: string;
  joinDate: string;
  expiryDate: string;
  status: "active" | "expiring" | "expired" | "left";
  gym: { name: string; slug: string; phone: string; city: string };
  qr: string;
};

// A member's card is private — keep it out of Google and always show the live status
export const metadata: Metadata = { title: "Member Card", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS = {
  active: { label: "Active", color: "#4ade80" },
  expiring: { label: "Fee due soon", color: "#facc15" },
  expired: { label: "Fee overdue", color: "#f87171" },
  left: { label: "Inactive", color: "#a1a1aa" },
};

export default async function MemberCard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const server = (process.env.API_URL_INTERNAL || API_URL).replace(/\/+$/, "");
  const res = await fetch(`${server}/api/public/card/${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
  const card: Card | null = res?.ok ? await res.json() : null;

  if (!card) {
    return (
      <div className="site site-error">
        <div><h1>Card not found</h1><p>This card is no longer valid. Please ask the gym reception for a new card.</p></div>
      </div>
    );
  }

  const st = STATUS[card.status];
  const date = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="site card-page">
      <div className="member-card">
        <div className="mc-head">
          <a href={gymUrl(card.gym.slug)} className="logo"><i><FaDumbbell /></i> {card.gym.name}</a>
          <span className="mc-status" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
        </div>
        <div className="mc-qr"><img src={card.qr} alt="Member QR code" width={240} height={240} /></div>
        <p className="mc-hint">Show this QR code at reception</p>
        <h1 className="mc-name">{card.name}</h1>
        <div className="mc-grid">
          <div><span>Plan</span><b>{card.plan || "—"}</b></div>
          <div><span>Valid till</span><b style={{ color: st.color }}>{date(card.expiryDate)}</b></div>
          <div><span>Member since</span><b>{date(card.joinDate)}</b></div>
        </div>
        <div className="mc-foot">
          {card.gym.city && <span><FaLocationDot /> {card.gym.city}</span>}
          {card.gym.phone && <a href={`tel:${card.gym.phone.replace(/\s/g, "")}`}><FaPhone /> {card.gym.phone}</a>}
        </div>
      </div>
      <p className="mc-tip">💡 Tip: save this page to your phone's home screen (Share → Add to Home Screen)</p>
    </div>
  );
}
