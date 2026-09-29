import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { requirePerm } from "../../lib/auth.js";
import { HttpError, notFound } from "../../lib/http.js";
import { DAY, localDay, memberStatus, startOfToday } from "../../lib/util.js";

const r = Router();

const DUPLICATE_WINDOW_MS = 3 * 60 * 60 * 1000; // A second scan within 3 hours counts as the same visit

// The QR contains the card link (".../card/<token>"); the scanner sends the full text
export function tokenFromScan(text: string) {
  const t = text.trim();
  const m = t.match(/\/card\/([A-Za-z0-9_-]{16,64})\/?(?:[?#].*)?$/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{16,64}$/.test(t)) return t;
  return null;
}

const checkinSchema = z.union([
  z.object({ scan: z.string().max(500) }),
  z.object({ memberId: z.string().max(40) }),
]);

r.post("/checkin", requirePerm("attendance:checkin"), async (req, res) => {
  const gymId = req.gym!.id;
  const body = checkinSchema.parse(req.body);

  let where: { gymId: string; qrToken?: string; id?: string };
  if ("scan" in body) {
    const token = tokenFromScan(body.scan);
    if (!token) throw new HttpError(400, "This QR code is not a gym card");
    where = { gymId, qrToken: token };
  } else {
    where = { gymId, id: body.memberId };
  }

  // gymId filter: a card from another gym won't work here
  const member = await prisma.member.findFirst({ where });
  if (!member) throw new HttpError(404, "This card doesn't belong to this gym, or it has been reset");

  const status = memberStatus(member);
  const info = { id: member.id, name: member.name, plan: member.plan, expiryDate: member.expiryDate, monthlyFee: member.monthlyFee, status };
  if (status === "left") throw new HttpError(409, `${member.name}'s membership is inactive`, { member: info, code: "MEMBER_LEFT" });
  if (status === "expired") throw new HttpError(409, `${member.name}'s fee is overdue — please collect the fee first`, { member: info, code: "FEE_PENDING" });

  const recent = await prisma.attendance.findFirst({
    where: { gymId, memberId: member.id, checkedInAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    orderBy: { checkedInAt: "desc" },
  });
  const record =
    recent ??
    (await prisma.attendance.create({ data: { gymId, memberId: member.id, method: "scan" in body ? "QR" : "MANUAL", byUserId: req.user!.id } }));

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const visitsThisMonth = await prisma.attendance.count({ where: { gymId, memberId: member.id, checkedInAt: { gte: monthStart } } });

  res.status(recent ? 200 : 201).json({ ok: true, alreadyCheckedIn: !!recent, checkedInAt: record.checkedInAt, visitsThisMonth, member: info });
});

// Attendance for a day (default: today, PKT)
r.get("/", requirePerm("attendance:view"), async (req, res) => {
  const gymId = req.gym!.id;
  const day = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? localDay(req.query.date) : startOfToday();
  const next = new Date(day.getTime() + DAY);
  const records = await prisma.attendance.findMany({
    where: { gymId, checkedInAt: { gte: day, lt: next } },
    orderBy: { checkedInAt: "desc" },
    include: { member: { select: { id: true, name: true, plan: true, phone: true } } },
  });

  // Counts for the last 7 days (for the chart)
  const weekStart = new Date(startOfToday().getTime() - 6 * DAY);
  const week = await prisma.attendance.findMany({ where: { gymId, checkedInAt: { gte: weekStart } }, select: { checkedInAt: true } });
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * DAY);
    const e = new Date(d.getTime() + DAY);
    return { date: d, label: d.toLocaleDateString("en-US", { weekday: "short" }), count: week.filter((w) => w.checkedInAt >= d && w.checkedInAt < e).length };
  });

  // Rush hours for this day
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: records.filter((x) => x.checkedInAt.getHours() === h).length }));

  res.json({ date: day, total: records.length, records, last7, hours });
});

r.delete("/:id", requirePerm("members:write"), async (req, res) => {
  await prisma.attendance.delete({ where: { id: String(req.params.id), gymId: req.gym!.id } });
  res.json({ ok: true });
});

export default r;
