import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSite, gymUrl, SITE_URL, SiteUnavailable } from "@/lib/api";
import type { MembershipPlan, Settings, SiteData } from "@/lib/types";
import SiteProvider from "@/components/site/SiteProvider";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import { About, Features } from "@/components/site/About";
import { Programs, Counters } from "@/components/site/Programs";
import Schedule from "@/components/site/Schedule";
import Trainers from "@/components/site/Trainers";
import Bmi from "@/components/site/Bmi";
import Pricing from "@/components/site/Pricing";
import Gallery from "@/components/site/Gallery";
import Testimonials from "@/components/site/Testimonials";
import Join from "@/components/site/Join";
import Faq from "@/components/site/Faq";
import { Contact, Footer } from "@/components/site/Contact";

type Props = { params: Promise<{ slug: string }> };

// 60-second cache; content edits from the dashboard refresh it instantly (/api/revalidate)
export const revalidate = 60;

/**
 * If the backend is down we THROW (not catch) — Next.js then keeps serving the last
 * good page instead of caching an error page.
 * Only "gym not found / offline" (404/403) renders our own page.
 */
async function load(slug: string): Promise<SiteData | { unavailable: number }> {
  try {
    return await getSite(slug);
  } catch (err) {
    if (err instanceof SiteUnavailable) return { unavailable: err.status };
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug).catch(() => null);
  if (!data || "unavailable" in data) return { title: "Gym website", robots: { index: false } };
  const s = data.settings;
  const title = `${s.name} ${s.tagline} | Best Gym in ${s.city}`;
  const description = `${s.hero?.subtitle || ""} ${s.address ? `📍 ${s.address}` : ""}`.trim();
  return {
    metadataBase: new URL(gymUrl(slug)),
    title,
    description,
    keywords: [`gym in ${s.city}`, `best gym ${s.city}`, `ladies gym ${s.city}`, `fitness club ${s.city}`, "personal trainer", s.name],
    alternates: { canonical: gymUrl(slug) },
    openGraph: { type: "website", locale: "en_PK", siteName: s.name, title, description, url: gymUrl(slug) },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Gym details for Google (address, hours, phone) — for "gym near me" searches
function businessSchema(slug: string, s: Settings, plans: MembershipPlan[]) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hh = (n: number) => `${String(Math.min(n, 23)).padStart(2, "0")}:${n >= 24 ? "59" : "00"}`;
  const abs = (u?: string) => (!u ? undefined : u.startsWith("http") ? u : SITE_URL + u);
  const prices = plans.map((p) => p.monthly);
  const schema = {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: `${s.name} ${s.tagline || ""}`.trim(),
    description: s.hero?.subtitle,
    url: gymUrl(slug),
    image: abs(s.hero?.image || "/images/hero.jpg"),
    telephone: s.phone || undefined,
    email: s.email || undefined,
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.city, addressCountry: "PK" },
    openingHoursSpecification: (s.openHours || [])
      .map(([o, c], i) => (c > o ? { "@type": "OpeningHoursSpecification", dayOfWeek: days[i], opens: hh(o), closes: hh(c) } : null))
      .filter(Boolean),
    priceRange: prices.length ? `${s.currency} ${Math.min(...prices)} – ${s.currency} ${Math.max(...prices)} / month` : undefined,
    sameAs: Object.values(s.socials || {}).filter((u) => u && u.startsWith("http")),
  };
  // Escape "<" so the JSON can't break out of the script tag
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

export default async function GymSite({ params }: Props) {
  const { slug } = await params;
  const data = await load(slug);

  if ("unavailable" in data) {
    if (data.unavailable === 404) notFound(); // a real 404 status (for Google)
    return (
      <div className="site site-error">
        <div>
          <h1>This website is currently offline</h1>
          <p style={{ marginBottom: 28 }}>This gym's subscription is not active. Please contact the gym directly.</p>
          <a href={SITE_URL} className="btn btn-primary">GymFlow</a>
        </div>
      </div>
    );
  }

  const { settings, features, plans, programs, trainers, schedule, gallery, testimonials, faqs } = data;

  return (
    <SiteProvider slug={slug} settings={settings}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: businessSchema(slug, settings, plans) }} />
      <Navbar name={settings.name} />
      <main>
        <Hero settings={settings} />
        <About settings={settings} />
        <Features features={features} />
        <Programs programs={programs} />
        <Counters stats={settings.stats || []} image={settings.images?.counters} />
        <Schedule schedule={schedule} />
        <Trainers trainers={trainers} whatsapp={settings.whatsapp} />
        <Bmi />
        <Pricing plans={plans} />
        <Gallery gallery={gallery} />
        <Testimonials testimonials={testimonials} />
        <Join plans={plans} />
        <Faq faqs={faqs} />
        <Contact />
      </main>
      <Footer programs={programs} />
    </SiteProvider>
  );
}
