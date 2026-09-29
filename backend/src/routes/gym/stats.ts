import { Router } from "express";
import { prisma } from "../../db.js";
import { requirePerm } from "../../lib/auth.js";
import { can } from "../../lib/permissions.js";
import { DAY, startOfToday, withStatus } from "../../lib/util.js";

const r = Router();

r.get("/", requirePerm("dashboard:view"), async (req, res) => {
  const gymId = req.gym!.id;
  const now = new Date();
  const in7 = new Date(Date.now() + 7 * DAY);
  const today = startOfToday();
  const showMoney = can(req.role!, "revenue:view");
  const showInbox = can(req.role!, "inbox:view");

  const [activeMembers, expiring, expired, totalMembers, todayCheckins, expiringList] = await Promise.all([
    prisma.member.count({ where: { gymId, active: true, expiryDate: { gte: now } } }),
    prisma.member.count({ where: { gymId, active: true, expiryDate: { gte: now, lte: in7 } } }),
    prisma.member.count({ where: { gymId, active: true, expiryDate: { lt: now } } }),
    prisma.member.count({ where: { gymId, active: true } }),
    prisma.attendance.count({ where: { gymId, checkedInAt: { gte: today } } }),
    prisma.member.findMany({ where: { gymId, active: true, expiryDate: { lte: in7 } }, orderBy: { expiryDate: "asc" }, take: 8 }),
  ]);

  const out: Record<string, unknown> = {
    activeMembers, expiring, expired, totalMembers, todayCheckins,
    expiringList: expiringList.map(withStatus),
  };

  if (showInbox) {
    const [newLeads, pendingBookings, unreadMessages, recentLeads] = await Promise.all([
      prisma.lead.count({ where: { gymId, status: "new" } }),
      prisma.booking.count({ where: { gymId, status: "pending" } }),
      prisma.message.count({ where: { gymId, read: false } }),
      prisma.lead.findMany({ where: { gymId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
    Object.assign(out, { newLeads, pendingBookings, unreadMessages, recentLeads });
  }

  // Revenue is shown to Owners only
  if (showMoney) {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const payments = await prisma.payment.findMany({ where: { gymId, paidAt: { gte: sixMonthsAgo } }, select: { amount: true, paidAt: true } });
    const revenue = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
      return {
        label: start.toLocaleString("en-US", { month: "short" }),
        total: payments.filter((p) => p.paidAt >= start && p.paidAt < end).reduce((s, p) => s + p.amount, 0),
      };
    });
    Object.assign(out, { revenue, revenueThisMonth: revenue[5].total, revenueLastMonth: revenue[4].total });
  }

  res.json(out);
});

export default r;
