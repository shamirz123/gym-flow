// Frontend shapes of the backend (Prisma) models

export type Stat = { value: number; suffix?: string; label: string };
export type Timing = { day: string; time: string };
export type Socials = { facebook?: string; instagram?: string; youtube?: string; tiktok?: string };
export type SiteImages = { about1?: string; about2?: string; counters?: string; cta?: string };
export type Hero = { title?: string[]; rotating?: string[]; subtitle?: string; image?: string };

export type Settings = {
  name: string;
  slug?: string;
  tagline: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapQuery: string;
  currency: string;
  aboutText: string;
  aboutPoints: string[];
  offerText: string;
  yearlyDiscount: number;
  admissionFee: number;
  hero: Hero;
  stats: Stat[];
  timings: Timing[];
  openHours: [number, number][];
  socials: Socials;
  images: SiteImages;
};

export type Feature = { id: string; icon: string; title: string; text: string; order: number };
export type MembershipPlan = { id: string; name: string; monthly: number; features: string[]; missing: string[]; popular: boolean; order: number };
export type Program = { id: string; title: string; text: string; level: string; image: string; order: number };
export type Trainer = { id: string; name: string; role: string; exp: string; image: string; phone: string; instagram: string; facebook: string; order: number };
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type ClassSession = { id: string; day: Weekday; time: string; name: string; trainer: string; room: string; order: number };
export type GalleryImage = { id: string; image: string; category: "equipment" | "training" | "classes"; order: number };
export type Testimonial = { id: string; name: string; result: string; text: string; image: string; order: number };
export type Faq = { id: string; q: string; a: string; order: number };

export type SiteData = {
  gym: { slug: string; name: string };
  settings: Settings;
  features: Feature[];
  plans: MembershipPlan[];
  programs: Program[];
  trainers: Trainer[];
  schedule: Record<Weekday, ClassSession[]>;
  gallery: GalleryImage[];
  testimonials: Testimonial[];
  faqs: Faq[];
};

/* ---------- Dashboard ---------- */
export type Role = "OWNER" | "RECEPTIONIST" | "TRAINER";
export type SaasPlan = "STARTER" | "PRO";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
export type Permission =
  | "dashboard:view" | "revenue:view" | "members:view" | "members:write" | "members:delete"
  | "payments:view" | "payments:write" | "payments:delete" | "attendance:view" | "attendance:checkin"
  | "inbox:view" | "inbox:write" | "content:view" | "content:write" | "staff:manage" | "billing:manage";

export type GymAccess = {
  id: string;
  slug: string;
  name: string;
  role: Role;
  plan: SaasPlan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  subscription: { canWrite: boolean; reason?: string; daysLeft?: number };
  permissions: Permission[];
};

export type Me = { id: string; name: string; email: string; isSuperAdmin: boolean; gyms: GymAccess[] };

export type MemberStatus = "active" | "expiring" | "expired" | "left";
export type Member = {
  id: string;
  name: string;
  phone: string;
  gender: "male" | "female";
  plan: string;
  monthlyFee: number;
  trainer: string;
  joinDate: string;
  expiryDate: string;
  notes: string;
  active: boolean;
  qrToken: string;
  status: MemberStatus;
};

export type PaymentMethod = "cash" | "bank" | "jazzcash" | "easypaisa" | "card";
export type Payment = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  months: number;
  method: PaymentMethod;
  type: "fee" | "admission" | "personal_training" | "other";
  note: string;
  paidAt: string;
};

export type Attendance = { id: string; memberId: string; checkedInAt: string; method: "QR" | "MANUAL"; member?: { id: string; name: string; plan: string; phone: string } };
