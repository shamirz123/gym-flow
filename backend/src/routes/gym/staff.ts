import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { hashPassword, requirePerm } from "../../lib/auth.js";
import { HttpError } from "../../lib/http.js";
import { SAAS_PLANS } from "../../lib/plans.js";
import { staffCreate } from "../../lib/schemas.js";

const r = Router();
r.use(requirePerm("staff:manage"));

const view = (m: { id: string; role: string; createdAt: Date; user: { id: string; name: string; email: string } }) => ({
  id: m.id, role: m.role, createdAt: m.createdAt, userId: m.user.id, name: m.user.name, email: m.user.email,
});

r.get("/", async (req, res) => {
  const staff = await prisma.staffMembership.findMany({
    where: { gymId: req.gym!.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(staff.map(view));
});

// Add staff. If a user with this email already exists (e.g. at another gym), add them to this gym
r.post("/", async (req, res) => {
  const gym = req.gym!;
  const data = staffCreate.parse(req.body);

  const limit = SAAS_PLANS[gym.plan].maxStaff;
  const count = await prisma.staffMembership.count({ where: { gymId: gym.id } });
  if (count >= limit) throw new HttpError(403, `The ${SAAS_PLANS[gym.plan].name} plan allows ${limit} staff accounts — upgrade to Pro`, { code: "PLAN_LIMIT" });

  let user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    if (!data.password) throw new HttpError(400, "A password is required for new staff");
    user = await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) } });
  }
  const m = await prisma.staffMembership.create({
    data: { userId: user.id, gymId: gym.id, role: data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json(view(m));
});

const ownerCount = (gymId: string) => prisma.staffMembership.count({ where: { gymId, role: "OWNER" } });

r.put("/:id", async (req, res) => {
  const { role } = z.object({ role: z.enum(["OWNER", "RECEPTIONIST", "TRAINER"]) }).parse(req.body);
  const gymId = req.gym!.id;
  const m = await prisma.staffMembership.findFirst({ where: { id: String(req.params.id), gymId } });
  if (!m) throw new HttpError(404, "Staff member not found");
  if (m.role === "OWNER" && role !== "OWNER" && (await ownerCount(gymId)) <= 1) throw new HttpError(400, "A gym must have at least one Owner");
  const updated = await prisma.staffMembership.update({ where: { id: m.id }, data: { role }, include: { user: { select: { id: true, name: true, email: true } } } });
  res.json(view(updated));
});

r.delete("/:id", async (req, res) => {
  const gymId = req.gym!.id;
  const m = await prisma.staffMembership.findFirst({ where: { id: String(req.params.id), gymId } });
  if (!m) throw new HttpError(404, "Staff member not found");
  if (m.userId === req.user!.id) throw new HttpError(400, "You can't remove yourself");
  if (m.role === "OWNER" && (await ownerCount(gymId)) <= 1) throw new HttpError(400, "You can't remove the last Owner");
  await prisma.staffMembership.delete({ where: { id: m.id } });
  res.json({ ok: true });
});

export default r;
