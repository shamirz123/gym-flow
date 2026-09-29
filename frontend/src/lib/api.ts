import type { SiteData } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
// Inside Docker, the server may reach the backend on a different URL
const SERVER_API_URL = process.env.API_URL_INTERNAL || API_URL;
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(ROOT_DOMAIN);
export const PROTOCOL = IS_LOCAL ? "http" : "https";
export const SITE_URL = `${PROTOCOL}://${ROOT_DOMAIN}`;
export const TIME_ZONE = "Asia/Karachi"; // Islamabad

// Each gym's website URL: ironpulse.localhost:3000 / ironpulse.gymflow.pk
export const gymUrl = (slug: string) => `${PROTOCOL}://${slug}.${ROOT_DOMAIN}`;

export class SiteUnavailable extends Error {
  constructor(public status: number) {
    super(`site unavailable (${status})`);
  }
}

// All content for a gym website (called from a server component)
export async function getSite(slug: string): Promise<SiteData> {
  const res = await fetch(`${SERVER_API_URL}/api/public/gyms/${encodeURIComponent(slug)}/site`, { next: { revalidate: 60, tags: [`gym:${slug}`] } });
  if (res.status === 404 || res.status === 403) throw new SiteUnavailable(res.status);
  if (!res.ok) throw new Error(`Could not load site data (${res.status})`);
  return res.json();
}

export async function getSaasPlans(): Promise<{ id: string; name: string; pricePkr: number; features: string[] }[]> {
  const res = await fetch(`${SERVER_API_URL}/api/public/saas-plans`, { next: { revalidate: 3600 } }).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

export async function getActiveGyms(): Promise<{ slug: string; name: string; updatedAt: string }[]> {
  const res = await fetch(`${SERVER_API_URL}/api/public/gyms`, { next: { revalidate: 3600 } }).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

// Public forms (lead, booking, contact, newsletter) — called from the browser
export async function postPublic<T = { message: string }>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/public${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong, please try again");
  return data;
}

export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
export const money = (currency: string, n: number) => `${currency} ${Math.round(n || 0).toLocaleString("en-US")}`;
export const PHONE_RE = /^(\+92|0092|0)?\s?3\d{2}[\s-]?\d{7}$/;

// Today's weekday and hour in Pakistan time (whatever the visitor's time zone)
export function pkNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "long", hour: "numeric", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return { weekday: parts.weekday as string, dayIndex: days.indexOf(parts.weekday), hour: Number(parts.hour) };
}
