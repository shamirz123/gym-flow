import crypto from "node:crypto";

export const DAY = 864e5;

// Member card QR token — 128-bit random, impossible to guess
export const newQrToken = () => crypto.randomBytes(16).toString("base64url");

export const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// Convert "YYYY-MM-DD" to the start of that day in server local time (PKT)
export const localDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export type MemberStatus = "active" | "expiring" | "expired" | "left";
export function memberStatus(m: { active: boolean; expiryDate: Date }): MemberStatus {
  if (!m.active) return "left";
  const days = Math.ceil((m.expiryDate.getTime() - Date.now()) / DAY);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "active";
}

export const withStatus = <T extends { active: boolean; expiryDate: Date }>(m: T) => ({ ...m, status: memberStatus(m) });

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Subdomain rules: lowercase letters, numbers and dashes
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
export const RESERVED_SLUGS = new Set(["www", "app", "api", "admin", "dashboard", "mail", "static", "assets", "help", "support", "billing", "status", "blog"]);
