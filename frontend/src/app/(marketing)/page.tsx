import Link from "next/link";
import {
  FaArrowRight, FaChartLine, FaCheck, FaCircleCheck, FaDumbbell, FaGlobe, FaIdCard, FaQrcode, FaUserShield, FaWhatsapp,
} from "react-icons/fa6";
import { getActiveGyms, getSaasPlans, gymUrl, ROOT_DOMAIN } from "@/lib/api";

export const revalidate = 3600;

const FALLBACK_PLANS = [
  { id: "STARTER", name: "Starter", pricePkr: 4999, features: ["Gym website + subdomain", "Up to 150 members", "3 staff accounts", "QR attendance", "Fee tracking & reminders"] },
  { id: "PRO", name: "Pro", pricePkr: 9999, features: ["Everything in Starter", "Unlimited members", "Unlimited staff", "Revenue reports & CSV export", "Priority support"] },
];

const FEATURES = [
  { icon: FaGlobe, title: "Your gym's own website", text: `An animated website on its own subdomain (yourgym.${ROOT_DOMAIN.replace(/:\d+$/, "")}) — trial form, class booking, BMI calculator, Google SEO.` },
  { icon: FaIdCard, title: "Members & fees", text: "Collect a fee and the expiry extends automatically. See who is about to expire, all on the dashboard." },
  { icon: FaQrcode, title: "QR attendance", text: "Every member gets a digital card. Scan it with a phone camera — members with overdue fees can't check in." },
  { icon: FaUserShield, title: "Staff roles", text: "Owner, Receptionist, Trainer — everyone sees only what their job needs. Revenue is visible to owners only." },
  { icon: FaWhatsapp, title: "WhatsApp reminders", text: "Fee reminders, class confirmations and digital member cards on WhatsApp in one click." },
  { icon: FaChartLine, title: "Reports", text: "Monthly revenue, payment methods, rush hours and attendance — with CSV export." },
];

export default async function Landing() {
  const [apiPlans, gyms] = await Promise.all([getSaasPlans(), getActiveGyms()]);
  // Show pricing even when the backend is unreachable
  const plans = apiPlans.length ? apiPlans : FALLBACK_PLANS;

  return (
    <>
      <header className="mk-nav">
        <div className="container">
          <Link href="/" className="logo"><i><FaDumbbell /></i> GYMFLOW</Link>
          <nav>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#demo">Live Demo</a>
            <Link href="/login">Login</Link>
            <Link href="/signup" className="btn btn-primary">Start free trial</Link>
          </nav>
        </div>
      </header>

      <section className="mk-hero">
        <div className="container">
          <div>
            <p className="hero-badge"><FaCircleCheck /> Built for gyms in Pakistan</p>
            <h1>Run Your Gym <span className="accent">Online</span></h1>
            <p className="lead">Website, members, fees, QR attendance and staff — all in one dashboard. Say goodbye to paper registers and WhatsApp bookkeeping.</p>
            <div className="btns">
              <Link href="/signup" className="btn btn-primary">14-day free trial <FaArrowRight /></Link>
              <a href="#demo" className="btn btn-outline">See the live demo</a>
            </div>
            <div className="mk-proof">
              <span><FaCheck /> No credit card required</span>
              <span><FaCheck /> Set up in 2 minutes</span>
              <span><FaCheck /> Local support</span>
            </div>
          </div>
          <div className="mk-preview" aria-hidden="true">
            <div className="bar"><span /><span /><span /></div>
            <div className="stats">
              <div className="stat"><small>Active members</small><b>248</b></div>
              <div className="stat"><small>Check-ins today</small><b>63</b></div>
              <div className="stat"><small>This month</small><b>Rs 1.4M</b></div>
            </div>
            <div className="chart">{[40, 55, 48, 70, 62, 90].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
            <div className="row"><span className="dot">AH</span> Ali Hassan · QR check-in <em style={{ background: "rgba(34,197,94,.15)", color: "#4ade80" }}>Active</em></div>
            <div className="row"><span className="dot">ZF</span> Zainab Fatima · fee due in 3 days <em style={{ background: "rgba(234,179,8,.15)", color: "#facc15" }}>Expiring</em></div>
          </div>
        </div>
      </section>

      <section id="features" className="section section-dark">
        <div className="container">
          <div className="section-head">
            <p className="section-tag">Features</p>
            <h2 className="section-title">Everything you need to <span className="accent">run a gym</span></h2>
          </div>
          <div className="mk-grid3">
            {FEATURES.map((f) => (
              <div className="mk-feature" key={f.title}>
                <div className="ic"><f.icon /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="section-tag">How it works</p>
            <h2 className="section-title">Get started in <span className="accent">3 steps</span></h2>
          </div>
          <div className="mk-steps">
            <div className="mk-step"><h3>Register your gym</h3><p>Pick a name and subdomain — your website is live instantly, with template content.</p></div>
            <div className="mk-step"><h3>Add your members</h3><p>Import existing members and their fees, then send each one a digital QR card on WhatsApp.</p></div>
            <div className="mk-step"><h3>Give your staff access</h3><p>Reception handles fees and check-ins, trainers handle attendance — you just watch the reports.</p></div>
          </div>
        </div>
      </section>

      <section id="pricing" className="section section-dark">
        <div className="container">
          <div className="section-head">
            <p className="section-tag">Pricing</p>
            <h2 className="section-title">Simple <span className="accent">monthly</span> pricing</h2>
            <p className="section-desc">The first 14 days are free. Cancel anytime.</p>
          </div>
          <div className="mk-plans">
            {plans.map((p) => (
              <div key={p.id} className={`price-card ${p.id === "PRO" ? "popular" : ""}`}>
                {p.id === "PRO" && <span className="popular-badge">MOST POPULAR</span>}
                <h3>{p.name}</h3>
                <div className="price"><strong>Rs {p.pricePkr.toLocaleString("en-US")}</strong><small>/ month</small></div>
                <ul>{p.features.map((f) => <li key={f}><i><FaCheck /></i>{f}</li>)}</ul>
                <Link href="/signup" className={`btn btn-block ${p.id === "PRO" ? "btn-primary" : "btn-outline"}`}>Start free trial</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="section">
        <div className="container">
          <div className="section-head">
            <p className="section-tag">Live Demo</p>
            <h2 className="section-title">Real gyms, <span className="accent">real dashboard</span></h2>
            <p className="section-desc">Open any gym's website below, or log in to the dashboard with a demo account.</p>
          </div>
          <div className="mk-demo">
            {gyms.map((g) => (
              <a key={g.slug} className="gym" href={gymUrl(g.slug)} target="_blank" rel="noopener">
                <span className="logo-dot">{g.name[0]}</span>
                <span><b>{g.name}</b><small>{g.slug}.{ROOT_DOMAIN}</small></span>
                <FaArrowRight style={{ marginLeft: "auto", color: "var(--primary)" }} />
              </a>
            ))}
          </div>
          <div className="mk-logins">
            <table>
              <thead><tr><th>Role</th><th>Email</th><th>Password</th></tr></thead>
              <tbody>
                <tr><td>Owner (Iron Pulse)</td><td><code>admin@gym.com</code></td><td><code>admin12345</code></td></tr>
                <tr><td>Receptionist</td><td><code>reception@ironpulse.pk</code></td><td><code>demo12345</code></td></tr>
                <tr><td>Trainer</td><td><code>trainer@ironpulse.pk</code></td><td><code>demo12345</code></td></tr>
                <tr><td>Owner (Titan, trial)</td><td><code>owner@titan.pk</code></td><td><code>demo12345</code></td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: 14 }}><Link href="/login" className="btn btn-primary">Dashboard login <FaArrowRight /></Link></p>
          </div>
        </div>
      </section>

      <section className="mk-cta">
        <div className="container">
          <h2 className="section-title">Take your gym <span className="accent">digital</span> today</h2>
          <p className="section-desc" style={{ marginBottom: 28 }}>14 days free — no credit card required.</p>
          <Link href="/signup" className="btn btn-primary">Start free trial <FaArrowRight /></Link>
        </div>
      </section>

      <footer className="mk-footer">
        <div className="container">
          <span>© {new Date().getFullYear()} GymFlow · Made in Pakistan 🇵🇰</span>
          <span><Link href="/login">Staff login</Link> · <Link href="/signup">Register gym</Link></span>
        </div>
      </footer>
    </>
  );
}
