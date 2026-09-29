import { beforeEach, describe, expect, it } from "vitest";
import { as, makeGym, makeMember, prisma, resetDb } from "./helpers.js";

/**
 * The most important SaaS test: one gym can NEVER read or change another gym's data.
 */
describe("tenant isolation", () => {
  let A: Awaited<ReturnType<typeof makeGym>>;
  let B: Awaited<ReturnType<typeof makeGym>>;

  beforeEach(async () => {
    await resetDb();
    A = await makeGym("gym-a");
    B = await makeGym("gym-b");
  });

  it("member list only shows the gym's own members", async () => {
    await makeMember(A.gym.id, { name: "Member of A" });
    await makeMember(B.gym.id, { name: "Member of B" });
    const res = await as(A.token).get("/api/gym/members");
    expect(res.status).toBe(200);
    expect(res.body.map((m: { name: string }) => m.name)).toEqual(["Member of A"]);
  });

  it("another gym's member cannot be read / updated / deleted by id (404)", async () => {
    const bMember = await makeMember(B.gym.id);
    expect((await as(A.token).get(`/api/gym/members/${bMember.id}`)).status).toBe(404);
    expect((await as(A.token).put(`/api/gym/members/${bMember.id}`, { name: "hacked" })).status).toBe(404);
    expect((await as(A.token).delete(`/api/gym/members/${bMember.id}`)).status).toBe(404);
    expect((await as(A.token).post(`/api/gym/members/${bMember.id}/renew`, { months: 1 })).status).toBe(404);
    const still = await prisma.member.findUniqueOrThrow({ where: { id: bMember.id } });
    expect(still.name).not.toBe("hacked");
  });

  it("sending another gym's id in x-gym-id returns 403", async () => {
    const res = await as(A.token, B.gym.id).get("/api/gym/members");
    expect(res.status).toBe(403);
  });

  it("updating content (plans) of another gym does not work", async () => {
    const plan = await prisma.membershipPlan.create({ data: { gymId: B.gym.id, name: "B Plan", monthly: 1000 } });
    const res = await as(A.token).put(`/api/gym/plans/${plan.id}`, { monthly: 1 });
    expect(res.status).toBe(404);
    expect((await prisma.membershipPlan.findUniqueOrThrow({ where: { id: plan.id } })).monthly).toBe(1000);
  });

  it("another gym's QR card cannot check in here", async () => {
    const bMember = await makeMember(B.gym.id);
    const res = await as(A.token).post("/api/gym/attendance/checkin", { scan: `http://localhost:3000/card/${bMember.qrToken}` });
    expect(res.status).toBe(404);
    expect(await prisma.attendance.count()).toBe(0);
  });

  it("a payment cannot be created for another gym's member", async () => {
    const bMember = await makeMember(B.gym.id);
    const res = await as(A.token).post("/api/gym/payments", { memberId: bMember.id, amount: 500 });
    expect(res.status).toBe(404);
  });

  it("dashboard stats only count the gym's own data", async () => {
    await makeMember(A.gym.id);
    await makeMember(B.gym.id);
    await makeMember(B.gym.id);
    const res = await as(A.token).get("/api/gym/stats");
    expect(res.body.totalMembers).toBe(1);
  });

  it("public website: every subdomain gets its own data", async () => {
    await prisma.faq.create({ data: { gymId: A.gym.id, q: "A's question" } });
    const a = await as("x").get("/api/public/gyms/gym-a/site");
    const b = await as("x").get("/api/public/gyms/gym-b/site");
    expect(a.body.faqs).toHaveLength(1);
    expect(b.body.faqs).toHaveLength(0);
  });
});
