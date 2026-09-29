"use client";
import { API_URL } from "./api";

const TOKEN_KEY = "gymflow_token";
const GYM_KEY = "gymflow_gym";

const read = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string | null) => {
  try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch {}
};

export const getToken = () => read(TOKEN_KEY);
export const setToken = (t: string | null) => write(TOKEN_KEY, t);
// Staff can belong to several gyms — which gym is currently open
export const getGymId = () => read(GYM_KEY);
export const setGymId = (id: string | null) => write(GYM_KEY, id);

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, any>) {
    super(message);
  }
}

type Opts = { method?: string; body?: unknown; form?: FormData };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(path: string, { method = "GET", body, form }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  const gymId = getGymId();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (gymId) headers["x-gym-id"] = gymId;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}/api${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) {
    setToken(null);
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  if (!res.ok) throw new ApiError(data.message || "Request failed", res.status, data);
  if (method !== "GET" && CONTENT_PATH.test(path)) refreshWebsite();
  return data as T;
}

// When website content changes, refresh that gym's Next.js cache immediately
const CONTENT_PATH = /^\/gym\/(settings|plans|programs|classes|trainers|gallery|testimonials|features|faqs)\b/;
function refreshWebsite() {
  fetch("/api/revalidate", { method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "x-gym-id": getGymId() ?? "" } }).catch(() => {});
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  const { url } = await api<{ url: string }>("/gym/settings/upload", { method: "POST", form });
  return url;
}

export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";

// Local date (not UTC) so the day doesn't shift in Pakistan time
export const toInputDate = (d?: string | Date | null) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const rs = (n?: number) => "Rs. " + Math.round(n || 0).toLocaleString("en-US");

// 03001234567 -> 923001234567 (for WhatsApp)
export const intlPhone = (p = "") => {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("92")) return d;
  if (d.startsWith("0")) return "92" + d.slice(1);
  return d;
};
export const wa = (phone: string, text: string) => `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`;
