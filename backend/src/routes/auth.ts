import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db.js";
import { env, isTest } from "../env.js";
import { checkPassword, hashPassword, requireAuth, signToken } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { permissionsFor } from "../lib/permissions.js";
import { subscriptionState } from "../lib/plans.js";
import { password, signupSchema } from "../lib/schemas.js";
import { RESERVED_SLUGS, SLUG_RE } from "../lib/util.js";
import { starterContent } from "../lib/starter-content.js";

const r = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => isTest && !process.env.TEST_RATE_LIMIT,
  message: { message: "Too many attempts, please try again in 15 minutes" },
});

// The user plus their gyms (with role, plan and permissions)
async function profile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, isSuperAdmin: true,
      memberships: { include: { gym: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return {
    id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin,
    gyms: user.memberships.map((m) => ({
      id: m.gym.id, slug: m.gym.slug, name: m.gym.name, role: m.role,
      plan: m.gym.plan, status: m.gym.subscriptionStatus, trialEndsAt: m.gym.trialEndsAt,
      subscription: subscriptionState(m.gym),
      permissions: permissionsFor(m.role),
    })),
  };
}

// Register a new gym: gym + owner account + 14-day free trial + starter website content
r.post("/signup", authLimiter, async (req, res) => {
  const data = signupSchema.parse(req.body);
  if (!SLUG_RE.test(data.slug)) throw new HttpError(400, "Subdomain must be 3-32 characters: lowercase letters, numbers and dashes (-) only");
  if (RESERVED_SLUGS.has(data.slug)) throw new HttpError(400, "This subdomain is not available");
  if (await prisma.gym.findUnique({ where: { slug: data.slug } })) throw new HttpError(409, "This subdomain is already taken by another gym");
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw new HttpError(409, "An account with this email already exists — please log in");

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: {
        slug: data.slug,
        name: data.gymName,
        plan: "STARTER",
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date(Date.now() + env.TRIAL_DAYS * 864e5),
      },
    });
    await starterContent(tx, gym.id, { name: data.gymName, city: data.city, email: data.email });
    return tx.user.create({
      data: { name: data.name, email: data.email, passwordHash, memberships: { create: { gymId: gym.id, role: "OWNER" } } },
    });
  });
  res.status(201).json({ token: signToken(user.id), user: await profile(user.id) });
});

r.post("/login", authLimiter, async (req, res) => {
  const { email, password: pw } = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await checkPassword(pw, user.passwordHash))) throw new HttpError(401, "Incorrect email or password");
  res.json({ token: signToken(user.id), user: await profile(user.id) });
});

r.get("/me", requireAuth, async (req, res) => {
  res.json(await profile(req.user!.id));
});

r.put("/password", requireAuth, async (req, res) => {
  const { current, next } = z.object({ current: z.string(), next: password }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await checkPassword(current, user.passwordHash))) throw new HttpError(400, "Current password is incorrect");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  res.json({ message: "Password changed" });
});

export default r;
