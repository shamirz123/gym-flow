import { Router } from "express";
import { prisma } from "../../db.js";
import { requireActiveSubscription, requireAuth, requireGym, requirePerm } from "../../lib/auth.js";
import { notFound } from "../../lib/http.js";
import { contentSchemas, inboxSchemas } from "../../lib/schemas.js";
import { newQrToken } from "../../lib/util.js";
import { crudRouter } from "./crud.js";
import members, { assertMemberCapacity } from "./members.js";
import payments from "./payments.js";
import attendance from "./attendance.js";
import stats from "./stats.js";
import settings from "./settings.js";
import staff from "./staff.js";
import billing from "./billing.js";

/**
 * /api/gym/* — all gym dashboard APIs.
 * Every request: login → is the user staff of this gym? → (for writes) is the subscription active? → role permission
 */
const r = Router();
r.use(requireAuth, requireGym);

// Billing sits before the gate — so a gym can buy a plan even after the trial ended
r.use("/billing", billing);
r.use(requireActiveSubscription);

r.use("/stats", stats);
r.use("/members", members);
r.use("/payments", payments);
r.use("/attendance", attendance);
r.use("/settings", settings);
r.use("/staff", staff);

/* ---------- Website content ---------- */
const content = { view: "content:view", write: "content:write" } as const;
r.use("/features", crudRouter(prisma.feature, contentSchemas.features, content));
r.use("/plans", crudRouter(prisma.membershipPlan, contentSchemas.plans, { ...content, orderBy: [{ order: "asc" }, { monthly: "asc" }] }));
r.use("/programs", crudRouter(prisma.program, contentSchemas.programs, { ...content, search: ["title"] }));
r.use("/trainers", crudRouter(prisma.trainer, contentSchemas.trainers, { ...content, search: ["name", "role"] }));
r.use("/classes", crudRouter(prisma.classSession, contentSchemas.classes, { ...content, filters: ["day"], search: ["name", "trainer"] }));
r.use("/gallery", crudRouter(prisma.galleryImage, contentSchemas.gallery, { ...content, filters: ["category"] }));
r.use("/testimonials", crudRouter(prisma.testimonial, contentSchemas.testimonials, { ...content, search: ["name"] }));
r.use("/faqs", crudRouter(prisma.faq, contentSchemas.faqs, { ...content, search: ["q"] }));

/* ---------- Website inbox ---------- */
const inbox = { view: "inbox:view", write: "inbox:write", orderBy: { createdAt: "desc" } } as const;

// Lead → member (the expiry is set once the fee is collected)
r.post("/leads/:id/convert", requirePerm("members:write"), async (req, res) => {
  const gymId = req.gym!.id;
  await assertMemberCapacity(req.gym!);
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: String(req.params.id), gymId } });
    if (!lead) throw notFound("Lead");
    const plan = await tx.membershipPlan.findFirst({ where: { gymId, name: lead.plan } });
    const member = await tx.member.create({
      data: { gymId, name: lead.name, phone: lead.phone, plan: lead.plan, monthlyFee: plan?.monthly ?? 0, expiryDate: new Date(), qrToken: newQrToken() },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { status: "joined" } });
    return { member };
  });
  res.json(result);
});

r.use("/leads", crudRouter(prisma.lead, inboxSchemas.leads, { ...inbox, filters: ["status"], search: ["name", "phone"] }));
r.use("/bookings", crudRouter(prisma.booking, inboxSchemas.bookings, { ...inbox, filters: ["status"], search: ["name", "phone", "className"] }));
r.use("/messages", crudRouter(prisma.message, inboxSchemas.messages, { ...inbox, search: ["name", "phone", "message"] }));
r.use("/subscribers", crudRouter(prisma.subscriber, inboxSchemas.subscribers, { ...inbox, search: ["email"] }));

export default r;
