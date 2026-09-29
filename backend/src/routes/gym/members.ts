import { Router } from "express";
import { prisma } from "../../db.js";
import { requirePerm } from "../../lib/auth.js";
import { HttpError, notFound } from "../../lib/http.js";
import { SAAS_PLANS } from "../../lib/plans.js";
import { memberCreate, memberUpdate, renewSchema } from "../../lib/schemas.js";
import { addMonths, DAY, newQrToken, withStatus } from "../../lib/util.js";
import type { Gym, Prisma } from "../../generated/prisma/client.js";

const r = Router();

// SaaS plan member limit (Starter: 150 active)
export async function assertMemberCapacity(gym: Gym) {
  const limit = SAAS_PLANS[gym.plan].maxMembers;
  const count = await prisma.member.count({ where: { gymId: gym.id, active: true } });
  if (count >= limit) {
    throw new HttpError(403, `The ${SAAS_PLANS[gym.plan].name} plan allows ${limit} active members — upgrade to Pro`, { code: "PLAN_LIMIT" });
  }
}

const statusWhere = (status: string): Prisma.MemberWhereInput | null => {
  const now = new Date();
  const in7 = new Date(Date.now() + 7 * DAY);
  switch (status) {
    case "active": return { active: true, expiryDate: { gt: in7 } };
    case "expiring": return { active: true, expiryDate: { gte: now, lte: in7 } };
    case "expired": return { active: true, expiryDate: { lt: now } };
    case "left": return { active: false };
    default: return null;
  }
};

r.get("/", requirePerm("members:view"), async (req, res) => {
  const where: Prisma.MemberWhereInput = { gymId: req.gym!.id, ...(statusWhere(String(req.query.status || "")) ?? {}) };
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }];
  const members = await prisma.member.findMany({ where, orderBy: { expiryDate: "asc" }, take: 2000 });
  res.json(members.map(withStatus));
});

r.get("/:id", requirePerm("members:view"), async (req, res) => {
  const member = await prisma.member.findFirst({ where: { id: String(req.params.id), gymId: req.gym!.id } });
  if (!member) throw notFound("Member");
  const [payments, attendance] = await Promise.all([
    // Trainers don't see payment history
    req.role === "TRAINER" ? [] : prisma.payment.findMany({ where: { memberId: member.id, gymId: req.gym!.id }, orderBy: { paidAt: "desc" } }),
    prisma.attendance.findMany({ where: { memberId: member.id, gymId: req.gym!.id }, orderBy: { checkedInAt: "desc" }, take: 60 }),
  ]);
  res.json({ member: withStatus(member), payments, attendance });
});

// New member: months + amount set the expiry automatically and record the payment
r.post("/", requirePerm("members:write"), async (req, res) => {
  const gym = req.gym!;
  const { months, amount, admission, method, ...data } = memberCreate.parse(req.body);

  await assertMemberCapacity(gym);

  const joinDate = data.joinDate ?? new Date();
  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: { ...data, joinDate, gymId: gym.id, expiryDate: addMonths(joinDate, months), qrToken: newQrToken() },
    });
    const base = { gymId: gym.id, memberId: m.id, memberName: m.name, method, receivedById: req.user!.id };
    if (amount > 0) await tx.payment.create({ data: { ...base, amount, months, type: "fee", note: "Joining fee" } });
    if (admission > 0) await tx.payment.create({ data: { ...base, amount: admission, months: 0, type: "admission" } });
    return m;
  });
  res.status(201).json(withStatus(member));
});

r.put("/:id", requirePerm("members:write"), async (req, res) => {
  const data = memberUpdate.parse(req.body);
  const member = await prisma.member.update({ where: { id: String(req.params.id), gymId: req.gym!.id }, data });
  res.json(withStatus(member));
});

r.delete("/:id", requirePerm("members:delete"), async (req, res) => {
  await prisma.member.delete({ where: { id: String(req.params.id), gymId: req.gym!.id } }); // payments + attendance cascade
  res.json({ ok: true });
});

// Collect a fee and extend the membership
r.post("/:id/renew", requirePerm("payments:write"), async (req, res) => {
  const { months, amount, method, note } = renewSchema.parse(req.body);
  const gymId = req.gym!.id;
  const result = await prisma.$transaction(async (tx) => {
    const m = await tx.member.findFirst({ where: { id: String(req.params.id), gymId } });
    if (!m) throw notFound("Member");
    // Extend from the current expiry if still active, otherwise from today
    const base = m.expiryDate > new Date() ? m.expiryDate : new Date();
    const member = await tx.member.update({ where: { id: m.id }, data: { expiryDate: addMonths(base, months), active: true } });
    const payment = await tx.payment.create({
      data: { gymId, memberId: m.id, memberName: m.name, amount: amount ?? m.monthlyFee * months, months, method, note, type: "fee", receivedById: req.user!.id },
    });
    return { member: withStatus(member), payment };
  });
  res.json(result);
});

// New QR token (if a card is lost, the old QR stops working)
r.post("/:id/reset-qr", requirePerm("members:write"), async (req, res) => {
  const member = await prisma.member.update({ where: { id: String(req.params.id), gymId: req.gym!.id }, data: { qrToken: newQrToken() } });
  res.json(withStatus(member));
});

export default r;
