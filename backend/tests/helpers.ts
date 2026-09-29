import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword, signToken } from "../src/lib/auth.js";
import { addMonths, newQrToken } from "../src/lib/util.js";
import type { Role, SaasPlan, SubscriptionStatus } from "../src/generated/prisma/client.js";

export const app = createApp();
export const api = () => request(app);
export { prisma };

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

let n = 0;
type GymOpts = { plan?: SaasPlan; status?: SubscriptionStatus; trialEndsAt?: Date | null; currentPeriodEnd?: Date | null };

// Create a gym + owner and return the owner's token
export async function makeGym(slug: string, opts: GymOpts = {}) {
  const gym = await prisma.gym.create({
    data: {
      slug,
      name: slug.toUpperCase(),
      plan: opts.plan ?? "PRO",
      subscriptionStatus: opts.status ?? "ACTIVE",
      trialEndsAt: opts.trialEndsAt ?? null,
      currentPeriodEnd: opts.currentPeriodEnd ?? addMonths(new Date(), 1),
      settings: { create: { city: "Islamabad" } },
    },
  });
  const owner = await makeStaff(gym.id, "OWNER");
  return { gym, owner, token: owner.token };
}

export async function makeStaff(gymId: string, role: Role) {
  const user = await prisma.user.create({
    data: { name: `${role} ${++n}`, email: `${role.toLowerCase()}${n}@test.pk`, passwordHash: await hashPassword("password123") },
  });
  await prisma.staffMembership.create({ data: { gymId, userId: user.id, role } });
  return { user, token: signToken(user.id) };
}

export async function makeMember(gymId: string, opts: { expiryInDays?: number; active?: boolean; name?: string } = {}) {
  return prisma.member.create({
    data: {
      gymId,
      name: opts.name ?? `Member ${++n}`,
      phone: "03001234567",
      monthlyFee: 5000,
      plan: "Basic",
      active: opts.active ?? true,
      expiryDate: new Date(Date.now() + (opts.expiryInDays ?? 30) * 864e5),
      qrToken: newQrToken(),
    },
  });
}

// Request helper with auth + gym headers
export const as = (token: string, gymId?: string) => {
  const h = (r: request.Test) => {
    r.set("Authorization", `Bearer ${token}`);
    if (gymId) r.set("x-gym-id", gymId);
    return r;
  };
  return {
    get: (url: string) => h(api().get(url)),
    post: (url: string, body?: object) => h(api().post(url)).send(body ?? {}),
    put: (url: string, body?: object) => h(api().put(url)).send(body ?? {}),
    delete: (url: string) => h(api().delete(url)),
  };
};
