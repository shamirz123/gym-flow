import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireSuperAdmin } from "../lib/auth.js";
import { SAAS_PLANS, subscriptionState } from "../lib/plans.js";

/**
 * /api/platform/* — for the GymFlow owner (super admin): all gyms, MRR, status
 */
const r = Router();
r.use(requireAuth, requireSuperAdmin);

r.get("/gyms", async (_req, res) => {
  const gyms = await prisma.gym.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, staff: true } }, settings: { select: { city: true } } },
  });
  res.json(
    gyms.map((g) => ({
      id: g.id, slug: g.slug, name: g.name, city: g.settings?.city ?? "", plan: g.plan, status: g.subscriptionStatus,
      trialEndsAt: g.trialEndsAt, currentPeriodEnd: g.currentPeriodEnd, createdAt: g.createdAt,
      members: g._count.members, staff: g._count.staff, canWrite: subscriptionState(g).canWrite,
    }))
  );
});

r.get("/stats", async (_req, res) => {
  const [gyms, members, byStatus, activeByPlan] = await Promise.all([
    prisma.gym.count(),
    prisma.member.count({ where: { active: true } }),
    prisma.gym.groupBy({ by: ["subscriptionStatus"], _count: true }),
    prisma.gym.groupBy({ by: ["plan"], where: { subscriptionStatus: "ACTIVE" }, _count: true }),
  ]);
  // MRR = sum of the monthly price of every active gym
  const mrr = activeByPlan.reduce((s, p) => s + SAAS_PLANS[p.plan].pricePkr * p._count, 0);
  res.json({ gyms, members, mrr, byStatus: Object.fromEntries(byStatus.map((s) => [s.subscriptionStatus, s._count])) });
});

// For support: change a gym's plan/status (e.g. extend a trial)
r.patch("/gyms/:id", async (req, res) => {
  const data = z
    .object({
      plan: z.enum(["STARTER", "PRO"]).optional(),
      subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
      trialEndsAt: z.coerce.date().nullable().optional(),
    })
    .parse(req.body);
  res.json(await prisma.gym.update({ where: { id: String(req.params.id) }, data }));
});

export default r;
