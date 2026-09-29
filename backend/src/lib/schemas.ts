import { z } from "zod";

/* ---------- Building blocks ---------- */
export const str = (max = 200) => z.string().trim().max(max);
export const reqStr = (max = 200) => z.string().trim().min(1, "is required").max(max);
const order = z.coerce.number().int().min(0).max(9999).default(0);

// Only http(s) URLs or site paths ("/images/x.jpg"). Links like "javascript:" are rejected (XSS)
export const imageUrl = str(500).refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "is not a valid image URL");
export const linkUrl = str(500).refine((v) => v === "" || v === "#" || /^https?:\/\//i.test(v), "link must start with https://");
const list = (max = 30) => z.array(str(200)).max(max).default([]);

export const PHONE_RE = /^(\+92|0092|0)?\s?3\d{2}[\s-]?\d{7}$/;
export const pkPhone = z.string().trim().regex(PHONE_RE, "enter a valid mobile number (03XX XXXXXXX)");
export const phone = z.string().trim().min(7, "enter a phone number").max(20);

/* ---------- Website content ---------- */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const contentSchemas = {
  features: z.object({ icon: str(30).default("dumbbell"), title: reqStr(100), text: str(500).default(""), order }),
  plans: z.object({
    name: reqStr(60),
    monthly: z.coerce.number().int().min(0).max(10_000_000),
    features: list(),
    missing: list(),
    popular: z.boolean().default(false),
    order,
  }),
  programs: z.object({ title: reqStr(100), text: str(1000).default(""), level: str(50).default(""), image: imageUrl.default(""), order }),
  trainers: z.object({
    name: reqStr(80),
    role: str(100).default(""),
    exp: str(50).default(""),
    image: imageUrl.default(""),
    phone: str(20).default(""),
    instagram: linkUrl.default(""),
    facebook: linkUrl.default(""),
    order,
  }),
  classes: z.object({ day: z.enum(WEEKDAYS), time: reqStr(20), name: reqStr(80), trainer: str(80).default(""), room: str(50).default(""), order }),
  gallery: z.object({ image: imageUrl.refine((v) => v !== "", "image is required"), category: z.enum(["equipment", "training", "classes"]).default("training"), order }),
  testimonials: z.object({ name: reqStr(80), result: str(100).default(""), text: str(1000).default(""), image: imageUrl.default(""), order }),
  faqs: z.object({ q: reqStr(300), a: str(2000).default(""), order }),
};

/* ---------- Website inbox (edited by staff) ---------- */
export const inboxSchemas = {
  leads: z.object({
    name: reqStr(80),
    phone: phone,
    plan: str(60).default(""),
    time: str(60).default(""),
    goal: str(60).default(""),
    status: z.enum(["new", "contacted", "joined", "lost"]).default("new"),
    notes: str(2000).default(""),
  }),
  bookings: z.object({
    name: reqStr(80),
    phone: phone,
    className: str(80).default(""),
    day: str(20).default(""),
    time: str(20).default(""),
    status: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),
  }),
  messages: z.object({ name: reqStr(80), phone: str(20).default(""), message: reqStr(2000), read: z.boolean().default(false) }),
  subscribers: z.object({ email: z.string().trim().toLowerCase().email("enter a valid email").max(120) }),
};

/* ---------- Public website forms ---------- */
export const publicForms = {
  lead: z.object({ name: reqStr(80), phone: pkPhone, plan: str(50).default(""), time: str(50).default(""), goal: str(50).default("") }),
  booking: z.object({ name: reqStr(80), phone: pkPhone, className: str(80).default(""), day: str(20).default(""), time: str(20).default("") }),
  contact: z.object({ name: reqStr(80), phone: pkPhone, message: z.string().trim().min(3, "please write a message").max(2000) }),
  subscribe: z.object({ email: z.string().trim().toLowerCase().email("enter a valid email").max(120) }),
};

/* ---------- Members & payments ---------- */
const methods = z.enum(["cash", "bank", "jazzcash", "easypaisa", "card"]);
const date = z.coerce.date();

export const memberBase = z.object({
  name: reqStr(80),
  phone: phone,
  gender: z.enum(["male", "female"]).default("male"),
  plan: str(60).default(""),
  monthlyFee: z.coerce.number().int().min(0).max(10_000_000).default(0),
  trainer: str(80).default(""),
  joinDate: date.optional(),
  notes: str(2000).default(""),
});

export const memberCreate = memberBase.extend({
  months: z.coerce.number().int().min(1).max(24).default(1),
  amount: z.coerce.number().int().min(0).default(0),
  admission: z.coerce.number().int().min(0).default(0),
  method: methods.default("cash"),
});

export const memberUpdate = memberBase.partial().extend({
  expiryDate: date.optional(),
  active: z.boolean().optional(),
});

export const renewSchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(1),
  amount: z.coerce.number().int().min(0).optional(),
  method: methods.default("cash"),
  note: str(300).default(""),
});

export const paymentCreate = z.object({
  memberId: reqStr(40),
  amount: z.coerce.number().int().min(1, "enter an amount").max(10_000_000),
  months: z.coerce.number().int().min(0).max(24).default(0),
  method: methods.default("cash"),
  type: z.enum(["fee", "admission", "personal_training", "other"]).default("other"),
  note: str(300).default(""),
  paidAt: date.optional(),
});

/* ---------- Settings ---------- */
export const settingsSchema = z
  .object({
    name: reqStr(60), // Gym name (stored on the Gym table)
    tagline: str(60),
    city: str(60),
    phone: str(30),
    whatsapp: z.string().trim().regex(/^\d{10,15}$/, "digits only, with country code (923001234567)").or(z.literal("")),
    email: z.string().trim().email().or(z.literal("")),
    address: str(200),
    mapQuery: str(200),
    currency: str(10),
    aboutText: str(3000),
    aboutPoints: list(12),
    offerText: str(200),
    yearlyDiscount: z.coerce.number().int().min(0).max(90),
    admissionFee: z.coerce.number().int().min(0).max(1_000_000),
    hero: z.object({ title: list(5), rotating: list(10), subtitle: str(500).default(""), image: imageUrl.default("") }),
    stats: z.array(z.object({ value: z.coerce.number().int().min(0), suffix: str(5).default(""), label: str(40) })).max(8),
    timings: z.array(z.object({ day: str(60), time: str(60) })).max(10),
    openHours: z.array(z.tuple([z.coerce.number().int().min(0).max(24), z.coerce.number().int().min(0).max(24)])).length(7),
    socials: z.object({ facebook: linkUrl.default(""), instagram: linkUrl.default(""), youtube: linkUrl.default(""), tiktok: linkUrl.default("") }),
    images: z.object({ about1: imageUrl.default(""), about2: imageUrl.default(""), counters: imageUrl.default(""), cta: imageUrl.default("") }),
  })
  .partial();

/* ---------- Auth & staff ---------- */
export const password = z.string().min(8, "password must be at least 8 characters").max(100);

export const signupSchema = z.object({
  gymName: reqStr(60),
  slug: z.string().trim().toLowerCase(),
  city: str(60).default("Islamabad"),
  name: reqStr(80),
  email: z.string().trim().toLowerCase().email("enter a valid email"),
  password,
});

export const staffCreate = z.object({
  name: reqStr(80),
  email: z.string().trim().toLowerCase().email("enter a valid email"),
  password: password.optional(), // required for a new user
  role: z.enum(["OWNER", "RECEPTIONIST", "TRAINER"]),
});
