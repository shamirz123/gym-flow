import { Router, type RequestHandler } from "express";
import rateLimitModule, { ipKeyGenerator } from "express-rate-limit";
import QRCode from "qrcode";
import { prisma } from "../db.js";
import { env, isTest } from "../env.js";
import { HttpError } from "../lib/http.js";
import { interopDefault } from "../lib/interop.js";
import { SAAS_PLANS, subscriptionState } from "../lib/plans.js";
import { publicForms, WEEKDAYS } from "../lib/schemas.js";
import { memberStatus, RESERVED_SLUGS, SLUG_RE } from "../lib/util.js";

/**
 * /api/public/* — gym websites (no login required)
 */
const r = Router();
const rateLimit = interopDefault(rateLimitModule);

// Find the gym by slug. If its subscription is inactive, the website is offline too
const loadGym: RequestHandler = async (req, _res, next) => {
  const gym = await prisma.gym.findUnique({ where: { slug: String(req.params.slug).toLowerCase() } });
  if (!gym) throw new HttpError(404, "Gym not found");
  if (!subscriptionState(gym).canWrite) throw new HttpError(403, "This gym's website is currently offline", { code: "SITE_INACTIVE" });
  req.gym = gym;
  next();
};

r.get("/gyms/:slug/site", loadGym, async (req, res) => {
  const gymId = req.gym!.id;
  const [settings, features, plans, programs, trainers, classes, gallery, testimonials, faqs] = await Promise.all([
    prisma.gymSettings.findUnique({ where: { gymId } }),
    prisma.feature.findMany({ where: { gymId }, orderBy: { order: "asc" } }),
    prisma.membershipPlan.findMany({ where: { gymId }, orderBy: [{ order: "asc" }, { monthly: "asc" }] }),
    prisma.program.findMany({ where: { gymId }, orderBy: { order: "asc" } }),
    prisma.trainer.findMany({ where: { gymId }, orderBy: { order: "asc" } }),
    prisma.classSession.findMany({ where: { gymId }, orderBy: [{ order: "asc" }, { time: "asc" }] }),
    prisma.galleryImage.findMany({ where: { gymId }, orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({ where: { gymId }, orderBy: { order: "asc" } }),
    prisma.faq.findMany({ where: { gymId }, orderBy: { order: "asc" } }),
  ]);
  const schedule = Object.fromEntries(WEEKDAYS.map((d) => [d, classes.filter((c) => c.day === d)]));
  res.json({
    gym: { slug: req.gym!.slug, name: req.gym!.name },
    settings: { ...settings, name: req.gym!.name },
    features, plans, programs, trainers, schedule, gallery, testimonials, faqs,
  });
});

/* ---------- Website forms ----------
 * Pakistani mobile networks (Jazz/Zong) put many people behind one shared IP, so:
 *  - a loose limit per IP (60 / 15 min, per form)
 *  - a strict limit per IP + phone number (5 / 15 min) — stops spam without blocking real customers
 */
const limiter = (limit: number, byPhone: boolean) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    skip: () => isTest && !process.env.TEST_RATE_LIMIT,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? "");
      const who = byPhone ? String(req.body?.phone ?? req.body?.email ?? "").replace(/\D|\s/g, "").slice(-10) : "";
      return `${ip}|${req.params.slug}|${req.path}|${who}`;
    },
    message: { message: "Too many requests, please try again later" },
  });
const formLimit = [limiter(60, false), limiter(5, true)];

r.post("/gyms/:slug/leads", ...formLimit, loadGym, async (req, res) => {
  const data = publicForms.lead.parse(req.body);
  await prisma.lead.create({ data: { ...data, gymId: req.gym!.id } });
  res.status(201).json({ message: "Thank you! Our team will contact you shortly." });
});

r.post("/gyms/:slug/bookings", ...formLimit, loadGym, async (req, res) => {
  const data = publicForms.booking.parse(req.body);
  await prisma.booking.create({ data: { ...data, gymId: req.gym!.id } });
  res.status(201).json({ message: "Booking request received! We will call you to confirm." });
});

r.post("/gyms/:slug/contact", ...formLimit, loadGym, async (req, res) => {
  const data = publicForms.contact.parse(req.body);
  await prisma.message.create({ data: { ...data, gymId: req.gym!.id } });
  res.status(201).json({ message: "Message received! We will reply soon." });
});

r.post("/gyms/:slug/subscribe", ...formLimit, loadGym, async (req, res) => {
  const { email } = publicForms.subscribe.parse(req.body);
  const gymId = req.gym!.id;
  await prisma.subscriber.upsert({ where: { gymId_email: { gymId, email } }, create: { gymId, email }, update: {} });
  res.status(201).json({ message: "Subscribed! Thank you." });
});

/* ---------- Member digital card (QR) ----------
 * The token is 128-bit random, so nobody can see a card without its link. The phone number is never exposed.
 */
r.get("/card/:token", async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { qrToken: String(req.params.token) },
    include: { gym: { select: { name: true, slug: true, settings: { select: { phone: true, city: true } } } } },
  });
  if (!member) throw new HttpError(404, "Card not found (it may have been reset)");
  const cardUrl = `${env.CLIENT_URL.split(",")[0].trim()}/card/${member.qrToken}`;
  res.json({
    name: member.name,
    plan: member.plan,
    joinDate: member.joinDate,
    expiryDate: member.expiryDate,
    status: memberStatus(member),
    gym: { name: member.gym.name, slug: member.gym.slug, phone: member.gym.settings?.phone ?? "", city: member.gym.settings?.city ?? "" },
    cardUrl,
    qr: await QRCode.toDataURL(cardUrl, { width: 480, margin: 1, errorCorrectionLevel: "M" }),
  });
});

// SaaS plans for the landing page
r.get("/saas-plans", (_req, res) => {
  res.json(Object.entries(SAAS_PLANS).map(([id, p]) => ({ id, name: p.name, pricePkr: p.pricePkr, features: p.features })));
});

// Sitemap + landing page showcase: active gyms (name and slug only)
r.get("/gyms", async (_req, res) => {
  const gyms = await prisma.gym.findMany({
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true, updatedAt: true, subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true },
  });
  res.json(gyms.filter((g) => subscriptionState(g).canWrite).map(({ slug, name, updatedAt }) => ({ slug, name, updatedAt })));
});

// Signup form: is this slug available?
r.get("/slug-available/:slug", async (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return void res.json({ available: false, reason: "invalid" });
  const exists = await prisma.gym.findUnique({ where: { slug }, select: { id: true } });
  res.json({ available: !exists });
});

export default r;
