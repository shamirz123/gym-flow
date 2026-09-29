import { Router } from "express";
import { prisma } from "../../db.js";
import { requirePerm } from "../../lib/auth.js";
import { notFound } from "../../lib/http.js";
import { paymentCreate } from "../../lib/schemas.js";
import { DAY, localDay } from "../../lib/util.js";
import type { Prisma } from "../../generated/prisma/client.js";

const r = Router();
const METHODS = ["cash", "bank", "jazzcash", "easypaisa", "card"] as const;

r.get("/", requirePerm("payments:view"), async (req, res) => {
  const where: Prisma.PaymentWhereInput = { gymId: req.gym!.id };
  const { from, to, method } = req.query;
  const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (isDay(from) || isDay(to)) {
    where.paidAt = {
      ...(isDay(from) ? { gte: localDay(from) } : {}),
      ...(isDay(to) ? { lt: new Date(localDay(to).getTime() + DAY) } : {}),
    };
  }
  if (typeof method === "string" && (METHODS as readonly string[]).includes(method)) where.method = method as (typeof METHODS)[number];
  const payments = await prisma.payment.findMany({ where, orderBy: { paidAt: "desc" }, take: 2000 });
  res.json({ payments, total: payments.reduce((s, p) => s + p.amount, 0) });
});

// Payments other than monthly fees (admission, personal training) — fees go through /members/:id/renew
r.post("/", requirePerm("payments:write"), async (req, res) => {
  const data = paymentCreate.parse(req.body);
  const member = await prisma.member.findFirst({ where: { id: data.memberId, gymId: req.gym!.id } });
  if (!member) throw notFound("Member");
  const payment = await prisma.payment.create({
    data: { ...data, gymId: req.gym!.id, memberName: member.name, receivedById: req.user!.id },
  });
  res.status(201).json(payment);
});

r.delete("/:id", requirePerm("payments:delete"), async (req, res) => {
  await prisma.payment.delete({ where: { id: String(req.params.id), gymId: req.gym!.id } });
  res.json({ ok: true });
});

export default r;
