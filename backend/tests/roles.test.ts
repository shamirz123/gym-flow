import { beforeEach, describe, expect, it } from "vitest";
import { as, makeGym, makeMember, makeStaff, resetDb } from "./helpers.js";

describe("roles & permissions", () => {
  let gymId: string;
  let owner: string, reception: string, trainer: string;

  beforeEach(async () => {
    await resetDb();
    const g = await makeGym("roles-gym");
    gymId = g.gym.id;
    owner = g.token;
    reception = (await makeStaff(gymId, "RECEPTIONIST")).token;
    trainer = (await makeStaff(gymId, "TRAINER")).token;
  });

  it("trainer can view members but cannot collect fees", async () => {
    const m = await makeMember(gymId);
    expect((await as(trainer).get("/api/gym/members")).status).toBe(200);
    expect((await as(trainer).post(`/api/gym/members/${m.id}/renew`, { months: 1 })).status).toBe(403);
    expect((await as(trainer).get("/api/gym/payments")).status).toBe(403);
    expect((await as(trainer).post("/api/gym/members", { name: "X", phone: "03001234567" })).status).toBe(403);
  });

  it("trainer can check members in", async () => {
    const m = await makeMember(gymId);
    expect((await as(trainer).post("/api/gym/attendance/checkin", { memberId: m.id })).status).toBe(201);
  });

  it("trainer does not get a member's payment history", async () => {
    const m = await makeMember(gymId);
    const res = await as(trainer).get(`/api/gym/members/${m.id}`);
    expect(res.status).toBe(200);
    expect(res.body.payments).toEqual([]);
  });

  it("revenue on the dashboard is shown to owners only", async () => {
    const o = await as(owner).get("/api/gym/stats");
    const r = await as(reception).get("/api/gym/stats");
    const t = await as(trainer).get("/api/gym/stats");
    expect(o.body).toHaveProperty("revenueThisMonth");
    expect(r.body).not.toHaveProperty("revenueThisMonth");
    expect(t.body).not.toHaveProperty("revenueThisMonth");
    expect(t.body).not.toHaveProperty("newLeads"); // no inbox either
  });

  it("receptionist can manage members and fees, but not settings, staff or deletes", async () => {
    const created = await as(reception).post("/api/gym/members", { name: "New", phone: "03001234567", months: 1, amount: 5000 });
    expect(created.status).toBe(201);
    expect((await as(reception).post(`/api/gym/members/${created.body.id}/renew`, { months: 1 })).status).toBe(200);
    expect((await as(reception).put("/api/gym/settings", { tagline: "x" })).status).toBe(403);
    expect((await as(reception).get("/api/gym/staff")).status).toBe(403);
    expect((await as(reception).delete(`/api/gym/members/${created.body.id}`)).status).toBe(403);
    expect((await as(reception).post("/api/gym/billing/checkout", { plan: "PRO" })).status).toBe(403);
  });

  it("owner can do everything", async () => {
    expect((await as(owner).put("/api/gym/settings", { tagline: "New tagline" })).status).toBe(200);
    expect((await as(owner).get("/api/gym/staff")).status).toBe(200);
    expect((await as(owner).post("/api/gym/faqs", { q: "New question?" })).status).toBe(201);
  });

  it("the last owner cannot be removed or downgraded", async () => {
    const staff = await as(owner).get("/api/gym/staff");
    const ownerRow = staff.body.find((s: { role: string }) => s.role === "OWNER");
    expect((await as(owner).put(`/api/gym/staff/${ownerRow.id}`, { role: "TRAINER" })).status).toBe(400);
    expect((await as(owner).delete(`/api/gym/staff/${ownerRow.id}`)).status).toBe(400);
  });

  it("returns 401 without a login", async () => {
    const { default: request } = await import("supertest");
    const { app } = await import("./helpers.js");
    expect((await request(app).get("/api/gym/members")).status).toBe(401);
    expect((await as("invalid.token.here").get("/api/gym/members")).status).toBe(401);
  });
});
