import { beforeEach, describe, expect, it } from "vitest";
import { as, makeGym, makeMember, prisma, resetDb } from "./helpers.js";
import { tokenFromScan } from "../src/routes/gym/attendance.js";

const DAY = 864e5;

describe("members & fees", () => {
  let gymId: string, token: string;
  beforeEach(async () => {
    await resetDb();
    ({ gym: { id: gymId }, token } = await makeGym("fees-gym"));
  });

  it("new member: expiry = join + months, and fee + admission payments are recorded", async () => {
    const res = await as(token).post("/api/gym/members", { name: "Ali", phone: "03001234567", monthlyFee: 5000, months: 3, amount: 15000, admission: 2000 });
    expect(res.status).toBe(201);
    const days = Math.round((new Date(res.body.expiryDate).getTime() - Date.now()) / DAY);
    expect(days).toBeGreaterThanOrEqual(88);
    expect(days).toBeLessThanOrEqual(93);
    expect(res.body.qrToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const payments = await prisma.payment.findMany({ where: { memberId: res.body.id } });
    expect(payments.map((p) => [p.type, p.amount]).sort()).toEqual([["admission", 2000], ["fee", 15000]]);
  });

  it("renew: an active member is extended from the current expiry", async () => {
    const m = await makeMember(gymId, { expiryInDays: 10 });
    const res = await as(token).post(`/api/gym/members/${m.id}/renew`, { months: 1 });
    const gained = (new Date(res.body.member.expiryDate).getTime() - m.expiryDate.getTime()) / DAY;
    expect(gained).toBeGreaterThanOrEqual(28);
    expect(res.body.payment.amount).toBe(5000); // monthlyFee * months
  });

  it("renew: an expired member is extended from TODAY", async () => {
    const m = await makeMember(gymId, { expiryInDays: -20 });
    const res = await as(token).post(`/api/gym/members/${m.id}/renew`, { months: 1 });
    const daysFromNow = (new Date(res.body.member.expiryDate).getTime() - Date.now()) / DAY;
    expect(daysFromNow).toBeGreaterThan(27);
    expect(daysFromNow).toBeLessThan(32);
    expect(res.body.member.status).toBe("active");
  });

  it("stores Urdu text and emoji (database must be UTF-8)", async () => {
    const res = await as(token).post("/api/gym/members", { name: "علی احمد 💪", phone: "03001234567", notes: "نیا ممبر" });
    expect(res.status).toBe(201);
    const saved = await prisma.member.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(saved.name).toBe("علی احمد 💪");
    expect(saved.notes).toBe("نیا ممبر");
  });

  it("invalid data returns a clear error (Zod)", async () => {
    const res = await as(token).post("/api/gym/members", { name: "", phone: "1" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name|phone/);
  });

  it("a javascript: link is rejected for trainer socials (XSS)", async () => {
    const res = await as(token).post("/api/gym/trainers", { name: "T", facebook: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });
});

describe("QR attendance", () => {
  let gymId: string, token: string;
  beforeEach(async () => {
    await resetDb();
    ({ gym: { id: gymId }, token } = await makeGym("qr-gym"));
  });

  it("checks in by scanning the QR (card URL)", async () => {
    const m = await makeMember(gymId);
    const res = await as(token).post("/api/gym/attendance/checkin", { scan: `https://gymflow.pk/card/${m.qrToken}` });
    expect(res.status).toBe(201);
    expect(res.body.member.name).toBe(m.name);
    expect(res.body.alreadyCheckedIn).toBe(false);
  });

  it("a second scan within 3 hours is the same visit (no duplicate)", async () => {
    const m = await makeMember(gymId);
    await as(token).post("/api/gym/attendance/checkin", { scan: m.qrToken });
    const again = await as(token).post("/api/gym/attendance/checkin", { scan: m.qrToken });
    expect(again.status).toBe(200);
    expect(again.body.alreadyCheckedIn).toBe(true);
    expect(await prisma.attendance.count({ where: { memberId: m.id } })).toBe(1);
  });

  it("a member with an overdue fee (expired) cannot check in", async () => {
    const m = await makeMember(gymId, { expiryInDays: -2 });
    const res = await as(token).post("/api/gym/attendance/checkin", { scan: m.qrToken });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("FEE_PENDING");
    expect(res.body.member.name).toBe(m.name);
  });

  it("a member who left the gym cannot check in", async () => {
    const m = await makeMember(gymId, { active: false });
    const res = await as(token).post("/api/gym/attendance/checkin", { scan: m.qrToken });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("MEMBER_LEFT");
  });

  it("the old card stops working after a QR reset", async () => {
    const m = await makeMember(gymId);
    await as(token).post(`/api/gym/members/${m.id}/reset-qr`);
    const res = await as(token).post("/api/gym/attendance/checkin", { scan: m.qrToken });
    expect(res.status).toBe(404);
  });

  it("public card page shows the status but never the phone number", async () => {
    const m = await makeMember(gymId);
    const res = await as("x").get(`/api/public/card/${m.qrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(m.name);
    expect(res.body.qr).toMatch(/^data:image\/png;base64,/);
    expect(JSON.stringify(res.body)).not.toContain(m.phone);
  });

  it("tokenFromScan: URL, raw token and garbage", () => {
    expect(tokenFromScan("https://x.pk/card/abcdefghijklmnopqrstuv")).toBe("abcdefghijklmnopqrstuv");
    expect(tokenFromScan("abcdefghijklmnopqrstuv")).toBe("abcdefghijklmnopqrstuv");
    expect(tokenFromScan("https://evil.com/hello")).toBeNull();
    expect(tokenFromScan("short")).toBeNull();
  });
});
