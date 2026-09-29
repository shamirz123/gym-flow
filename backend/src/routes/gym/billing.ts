import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { requirePerm } from "../../lib/auth.js";
import { billingMode, billingPortalUrl, cancelSubscription, createCheckout } from "../../lib/billing.js";
import { env } from "../../env.js";
import { SAAS_PLANS, subscriptionState } from "../../lib/plans.js";

const r = Router();
const returnUrl = () => `${env.CLIENT_URL.split(",")[0].trim()}/dashboard/billing`;

// Billing info: all staff can read it (for the banner); only Owners can change it
r.get("/", async (req, res) => {
  const gym = req.gym!;
  const [members, staff] = await Promise.all([
    prisma.member.count({ where: { gymId: gym.id, active: true } }),
    prisma.staffMembership.count({ where: { gymId: gym.id } }),
  ]);
  const limit = (n: number) => (Number.isFinite(n) ? n : null);
  res.json({
    mode: billingMode,
    plan: gym.plan,
    status: gym.subscriptionStatus,
    trialEndsAt: gym.trialEndsAt,
    currentPeriodEnd: gym.currentPeriodEnd,
    state: subscriptionState(gym),
    usage: { members, staff, maxMembers: limit(SAAS_PLANS[gym.plan].maxMembers), maxStaff: limit(SAAS_PLANS[gym.plan].maxStaff) },
    plans: Object.entries(SAAS_PLANS).map(([id, p]) => ({ id, name: p.name, pricePkr: p.pricePkr, features: p.features })),
  });
});

r.post("/checkout", requirePerm("billing:manage"), async (req, res) => {
  const { plan } = z.object({ plan: z.enum(["STARTER", "PRO"]) }).parse(req.body);
  res.json(await createCheckout(req.gym!, plan, returnUrl()));
});

r.post("/cancel", requirePerm("billing:manage"), async (req, res) => {
  const gym = await cancelSubscription(req.gym!);
  res.json({ status: gym.subscriptionStatus, currentPeriodEnd: gym.currentPeriodEnd });
});

r.post("/portal", requirePerm("billing:manage"), async (req, res) => {
  res.json({ url: await billingPortalUrl(req.gym!, returnUrl()) });
});

export default r;
