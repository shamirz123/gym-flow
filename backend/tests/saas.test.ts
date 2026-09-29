import { beforeEach, describe, expect, it } from "vitest";
import { api, as, makeGym, makeMember, makeStaff, prisma, resetDb } from "./helpers.js";

const DAY = 864e5;

describe("signup (new gym)", () => {
  beforeEach(resetDb);

  const body = { gymName: "Power House", slug: "powerhouse", name: "Owner", email: "owner@power.pk", password: "password123" };

  it("creates gym + owner + 14-day trial + starter website content", async () => {
    const res = await api().post("/api/auth/signup").send(body);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    const g = res.body.user.gyms[0];
    expect(g).toMatchObject({ slug: "powerhouse", role: "OWNER", plan: "STARTER", status: "TRIALING" });
    expect(g.subscription.daysLeft).toBe(14);
    const site = await api().get("/api/public/gyms/powerhouse/site");
    expect(site.status).toBe(200);
    expect(site.body.plans.length).toBeGreaterThan(0);
  });

  it("slug: duplicate is 409, reserved/invalid is 400", async () => {
    await api().post("/api/auth/signup").send(body);
    expect((await api().post("/api/auth/signup").send({ ...body, email: "x@y.pk" })).status).toBe(409);
    expect((await api().post("/api/auth/signup").send({ ...body, slug: "admin", email: "a@y.pk" })).status).toBe(400);
    expect((await api().post("/api/auth/signup").send({ ...body, slug: "Bad Slug!", email: "b@y.pk" })).status).toBe(400);
  });

  it("login: wrong password is 401", async () => {
    await api().post("/api/auth/signup").send(body);
    expect((await api().post("/api/auth/login").send({ email: body.email, password: "wrong" })).status).toBe(401);
    expect((await api().post("/api/auth/login").send({ email: body.email, password: body.password })).status).toBe(200);
  });
});

describe("subscription & plan limits", () => {
  beforeEach(resetDb);

  it("expired trial: data is readable but not writable (402)", async () => {
    const { gym, token } = await makeGym("expired-trial", { status: "TRIALING", trialEndsAt: new Date(Date.now() - DAY) });
    await makeMember(gym.id);
    expect((await as(token).get("/api/gym/members")).status).toBe(200);
    const res = await as(token).post("/api/gym/members", { name: "X", phone: "03001234567" });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("expired trial takes the website offline; buying a plan brings it back (demo billing)", async () => {
    const { token } = await makeGym("trial-site", { status: "TRIALING", trialEndsAt: new Date(Date.now() - DAY) });
    expect((await api().get("/api/public/gyms/trial-site/site")).status).toBe(403);

    const checkout = await as(token).post("/api/gym/billing/checkout", { plan: "PRO" });
    expect(checkout.status).toBe(200);
    expect(checkout.body.mode).toBe("demo");

    const gym = await prisma.gym.findUniqueOrThrow({ where: { slug: "trial-site" } });
    expect(gym).toMatchObject({ plan: "PRO", subscriptionStatus: "ACTIVE" });
    expect((await api().get("/api/public/gyms/trial-site/site")).status).toBe(200);
    expect((await as(token).post("/api/gym/members", { name: "X", phone: "03001234567" })).status).toBe(201);
  });

  it("cancel: access continues until the period ends", async () => {
    const { token, gym } = await makeGym("cancel-gym", { currentPeriodEnd: new Date(Date.now() + 10 * DAY) });
    expect((await as(token).post("/api/gym/billing/cancel")).status).toBe(200);
    expect((await as(token).post("/api/gym/faqs", { q: "still working?" })).status).toBe(201);
    await prisma.gym.update({ where: { id: gym.id }, data: { currentPeriodEnd: new Date(Date.now() - DAY) } });
    expect((await as(token).post("/api/gym/faqs", { q: "now?" })).status).toBe(402);
  });

  it("Starter plan: member limit (3 in tests)", async () => {
    const { token } = await makeGym("starter-gym", { plan: "STARTER" });
    for (let i = 0; i < 3; i++) expect((await as(token).post("/api/gym/members", { name: `M${i}`, phone: "03001234567" })).status).toBe(201);
    const res = await as(token).post("/api/gym/members", { name: "M4", phone: "03001234567" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PLAN_LIMIT");
  });

  it("Starter plan: staff limit (2 in tests)", async () => {
    const { token, gym } = await makeGym("staff-limit", { plan: "STARTER" });
    await makeStaff(gym.id, "TRAINER"); // owner + 1 = 2
    const res = await as(token).post("/api/gym/staff", { name: "Extra", email: "extra@x.pk", password: "password123", role: "TRAINER" });
    expect(res.status).toBe(403);
  });

  it("platform routes are for super admins only", async () => {
    const { token } = await makeGym("normal-gym");
    expect((await as(token).get("/api/platform/gyms")).status).toBe(403);
  });
});

describe("public forms", () => {
  beforeEach(resetDb);

  it("a lead is saved to the right gym; an invalid phone is 400", async () => {
    const { gym } = await makeGym("forms-gym");
    expect((await api().post("/api/public/gyms/forms-gym/leads").send({ name: "Ali", phone: "123" })).status).toBe(400);
    expect((await api().post("/api/public/gyms/forms-gym/leads").send({ name: "Ali", phone: "0300 1234567", plan: "Basic" })).status).toBe(201);
    expect(await prisma.lead.count({ where: { gymId: gym.id } })).toBe(1);
  });

  it("unknown gym 404", async () => {
    expect((await api().post("/api/public/gyms/nope/leads").send({ name: "Ali", phone: "03001234567" })).status).toBe(404);
  });
});
