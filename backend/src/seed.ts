/**
 * Demo data: 2 gyms (to show multi-tenancy), staff for every role, members, fees and attendance.
 *   npm run db:seed        (⚠️ wipes all data in the database and recreates it)
 *
 * Demo logins (password .env ADMIN_PASSWORD / "demo12345"):
 *   admin@gym.com           → Platform super admin + Iron Pulse OWNER
 *   reception@ironpulse.pk  → Iron Pulse RECEPTIONIST
 *   trainer@ironpulse.pk    → Iron Pulse TRAINER
 *   owner@titan.pk          → Titan Fitness OWNER (14-day trial)
 */
import { env, isProd } from "./env.js";
import { prisma } from "./db.js";
import { hashPassword } from "./lib/auth.js";
import { starterContent } from "./lib/starter-content.js";
import { addMonths, DAY, newQrToken } from "./lib/util.js";
import type { PaymentMethod, Weekday } from "./generated/prisma/client.js";

// Seeding wipes everything — only allow it without --force on a local database
const dbHost = new URL(env.DATABASE_URL).hostname;
const isLocalDb = ["localhost", "127.0.0.1", "::1", "db"].includes(dbHost);
if ((isProd || !isLocalDb) && !process.argv.includes("--force")) {
  console.error(`❌ Seeding wipes ALL data in the database at "${dbHost}". Refusing to run on a non-local database.`);
  console.error("   If you really want to reset it, run: npx tsx src/seed.ts --force");
  process.exit(1);
}

const DEMO_PASSWORD = "demo12345";
const withOrder = <T extends object>(items: T[]) => items.map((x, i) => ({ ...x, order: i }));

async function wipe() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

async function user(name: string, email: string, password: string, isSuperAdmin = false) {
  return prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), isSuperAdmin } });
}

/* ---------------- Iron Pulse (Pro, active) — full content ---------------- */
async function seedIronPulse(ownerId: string) {
  const gym = await prisma.gym.create({
    data: { slug: "ironpulse", name: "IRON PULSE", plan: "PRO", subscriptionStatus: "ACTIVE", currentPeriodEnd: addMonths(new Date(), 1) },
  });
  await prisma.gymSettings.create({
    data: {
      gymId: gym.id,
      tagline: "Fitness Club",
      city: "Islamabad",
      phone: "+92 300 1234567",
      whatsapp: "923001234567",
      email: "info@ironpulse.pk",
      address: "Plot 12, Jinnah Super Market, F-7 Markaz, Islamabad",
      mapQuery: "F-7 Markaz, Islamabad",
      aboutText:
        "We don't just run workouts — we help you change your whole lifestyle. Whether your goal is losing weight, building muscle or simply staying fit, our certified trainers and modern equipment will guide you every step of the way.",
      aboutPoints: ["Free fitness assessment on joining", "Separate ladies timing with female trainer", "Personalised workout & diet plans", "Clean, safe & fully air-conditioned"],
      offerText: "Join this month and get 50% OFF the admission fee",
      admissionFee: 2000,
      hero: {
        title: ["BUILD YOUR", "STRONGEST", "SELF"],
        rotating: ["Strength", "Endurance", "Confidence", "Discipline"],
        subtitle: "Modern equipment, certified trainers and a motivating community. Start your fitness journey today — your first day is FREE.",
        image: "/images/hero.jpg",
      },
      stats: [
        { value: 1200, suffix: "+", label: "Active Members" },
        { value: 25, suffix: "+", label: "Expert Trainers" },
        { value: 40, suffix: "+", label: "Weekly Classes" },
        { value: 10, suffix: "", label: "Years Experience" },
      ],
      timings: [
        { day: "Monday – Saturday", time: "6:00 AM – 11:00 PM" },
        { day: "Ladies Timing", time: "11:00 AM – 3:00 PM" },
        { day: "Sunday", time: "8:00 AM – 2:00 PM" },
      ],
      socials: { facebook: "", instagram: "", youtube: "", tiktok: "" },
      images: { about1: "/images/about1.jpg", about2: "/images/about2.jpg", counters: "/images/g6.jpg", cta: "/images/cta.jpg" },
    },
  });
  const gymId = gym.id;
  const G = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, gymId }));

  await prisma.feature.createMany({
    data: G(withOrder([
      { icon: "dumbbell", title: "Modern Equipment", text: "A complete setup of imported machines and free weights." },
      { icon: "trainer", title: "Certified Trainers", text: "Qualified coaches who support you every step of the way." },
      { icon: "diet", title: "Diet Plans", text: "A personalised diet chart built around your goal." },
      { icon: "ac", title: "Fully Air Conditioned", text: "Train in comfort, even in the summer heat." },
      { icon: "shower", title: "Lockers & Showers", text: "Clean changing rooms and secure lockers." },
      { icon: "parking", title: "Free Parking", text: "Free parking for cars and bikes." },
    ])),
  });
  await prisma.membershipPlan.createMany({
    data: G(withOrder([
      { name: "Basic", monthly: 4000, popular: false, features: ["Gym floor access", "Locker room", "Fitness assessment", "Free Wi-Fi"], missing: ["Group classes", "Personal trainer", "Diet plan"] },
      { name: "Standard", monthly: 7000, popular: true, features: ["Gym floor access", "Locker room", "Fitness assessment", "All group classes", "Monthly diet plan"], missing: ["Personal trainer"] },
      { name: "Premium", monthly: 15000, popular: false, features: ["Everything in Standard", "Personal trainer (3x/week)", "Weekly diet plan", "Body composition scan", "Priority booking"], missing: [] },
    ])),
  });
  await prisma.program.createMany({
    data: G(withOrder([
      { image: "/images/p-strength.jpg", title: "Strength Training", text: "Build muscle and strength with progressive overload.", level: "All Levels" },
      { image: "/images/p-cardio.jpg", title: "Cardio & Fat Loss", text: "Burn fat fast with treadmill, cycling and HIIT.", level: "Beginner" },
      { image: "/images/p-crossfit.jpg", title: "CrossFit", text: "High-intensity functional workouts for the whole body.", level: "Advanced" },
      { image: "/images/p-boxing.jpg", title: "Boxing & MMA", text: "Learn self-defence and build your stamina.", level: "Intermediate" },
      { image: "/images/p-yoga.jpg", title: "Yoga & Flexibility", text: "Reduce stress and improve flexibility and balance.", level: "All Levels" },
      { image: "/images/p-personal.jpg", title: "Personal Training", text: "One-on-one coaching tailored to your goal.", level: "Custom" },
    ])),
  });
  await prisma.trainer.createMany({
    data: G(withOrder([
      { image: "/images/t1.jpg", name: "Bilal Raza", role: "Head Coach · Strength", exp: "12 years" },
      { image: "/images/t2.jpg", name: "Sara Malik", role: "Yoga & Ladies Fitness", exp: "8 years" },
      { image: "/images/t3.jpg", name: "Usman Ali", role: "Boxing & MMA", exp: "10 years" },
      { image: "/images/t4.jpg", name: "Ahmed Khan", role: "Cardio & HIIT", exp: "6 years" },
    ])),
  });

  const schedule: Record<Weekday, [string, string, string, string][]> = {
    Monday: [["06:00 AM", "Cardio Blast", "Ahmed Khan", "Hall A"], ["08:00 AM", "Yoga Flow", "Sara Malik", "Studio"], ["05:00 PM", "Strength Basics", "Bilal Raza", "Hall B"], ["07:00 PM", "Boxing", "Usman Ali", "Ring"]],
    Tuesday: [["06:00 AM", "CrossFit WOD", "Bilal Raza", "Hall A"], ["11:00 AM", "Ladies Fitness", "Sara Malik", "Studio"], ["06:00 PM", "HIIT", "Ahmed Khan", "Hall A"], ["08:00 PM", "MMA", "Usman Ali", "Ring"]],
    Wednesday: [["06:00 AM", "Cardio Blast", "Ahmed Khan", "Hall A"], ["08:00 AM", "Yoga Flow", "Sara Malik", "Studio"], ["05:00 PM", "Powerlifting", "Bilal Raza", "Hall B"], ["07:00 PM", "Boxing", "Usman Ali", "Ring"]],
    Thursday: [["06:00 AM", "CrossFit WOD", "Bilal Raza", "Hall A"], ["11:00 AM", "Ladies Fitness", "Sara Malik", "Studio"], ["06:00 PM", "Spinning", "Ahmed Khan", "Cycle Room"], ["08:00 PM", "MMA", "Usman Ali", "Ring"]],
    Friday: [["07:00 AM", "Full Body", "Bilal Raza", "Hall B"], ["11:00 AM", "Ladies Yoga", "Sara Malik", "Studio"], ["06:00 PM", "HIIT", "Ahmed Khan", "Hall A"]],
    Saturday: [["07:00 AM", "Bootcamp", "Ahmed Khan", "Outdoor"], ["10:00 AM", "Stretch & Mobility", "Sara Malik", "Studio"], ["06:00 PM", "Sparring", "Usman Ali", "Ring"]],
    Sunday: [["09:00 AM", "Open Gym", "All Trainers", "Main Floor"], ["11:00 AM", "Family Fitness", "Sara Malik", "Studio"]],
  };
  await prisma.classSession.createMany({
    data: G(Object.entries(schedule).flatMap(([day, rows]) => rows.map(([time, name, trainer, room], i) => ({ day: day as Weekday, time, name, trainer, room, order: i })))),
  });
  await prisma.galleryImage.createMany({
    data: G(([["g1", "equipment"], ["g2", "training"], ["g3", "training"], ["g4", "equipment"], ["g5", "classes"], ["g6", "equipment"], ["g7", "training"], ["g8", "classes"]] as const)
      .map(([g, category], i) => ({ image: `/images/${g}.jpg`, category, order: i }))),
  });
  await prisma.testimonial.createMany({
    data: G(withOrder([
      { image: "/images/r1.jpg", name: "Hamza Tariq", result: "Lost 18 kg in 5 months", text: "I tried many gyms, but the trainers here truly changed my life. The diet plan and daily motivation made all the difference." },
      { image: "/images/r2.jpg", name: "Ayesha Noor", result: "Ladies batch member", text: "The ladies-only hours make it easy for me to work out comfortably. The environment is safe and very clean. Highly recommended!" },
      { image: "/images/r3.jpg", name: "Faisal Mehmood", result: "Gained 9 kg muscle", text: "The equipment is world class and Bilal's strength program is the best. My body completely transformed in one year." },
    ])),
  });
  await prisma.faq.createMany({
    data: G(withOrder([
      { q: "Do you offer a free trial?", a: "Yes! Your first day is completely free. Fill in the form to book your free trial." },
      { q: "Are there separate hours for women?", a: "Yes, every day from 11:00 AM to 3:00 PM is ladies-only, with a female trainer." },
      { q: "How much is the admission fee?", a: "A one-time admission fee of Rs. 2,000. It is waived on yearly plans." },
      { q: "Can I hire a personal trainer separately?", a: "Absolutely. Personal training can be added to any plan." },
      { q: "How can I pay?", a: "We accept cash, bank transfer, JazzCash and EasyPaisa." },
      { q: "Can I freeze my membership?", a: "Yearly members can freeze their membership for up to 30 days." },
    ])),
  });

  // Staff: one account per role
  const reception = await user("Hina (Reception)", "reception@ironpulse.pk", DEMO_PASSWORD);
  const trainer = await user("Bilal Raza", "trainer@ironpulse.pk", DEMO_PASSWORD);
  await prisma.staffMembership.createMany({
    data: [
      { gymId, userId: ownerId, role: "OWNER" },
      { gymId, userId: reception.id, role: "RECEPTIONIST" },
      { gymId, userId: trainer.id, role: "TRAINER" },
    ],
  });

  await seedMembers(gymId, reception.id, [
    "Ali Hassan", "Zainab Fatima", "Omar Farooq", "Hina Javed", "Saad Iqbal", "Maryam Aslam",
    "Hamza Tariq", "Danish Ahmed", "Rabia Khan", "Usama Sheikh", "Iqra Batool", "Kashif Mehmood",
  ], [40, 25, 3, -5, 60, 5, 18, -12, 90, 2, 30, 11]);

  await prisma.lead.createMany({
    data: G([
      { name: "Bilal Ahmed", phone: "03211234567", plan: "Standard", time: "Evening (3–8 PM)", goal: "Weight Loss" },
      { name: "Sana Yousaf", phone: "03331234567", plan: "Basic", time: "Afternoon (11–3 PM)", goal: "General Fitness", status: "contacted" as const },
      { name: "Taha Rizwan", phone: "03451234567", plan: "Premium", time: "Night (8–11 PM)", goal: "Muscle Gain" },
    ]),
  });
  await prisma.booking.createMany({
    data: G([
      { name: "Areeba Ali", phone: "03001112233", className: "Yoga Flow", day: "Monday", time: "08:00 AM" },
      { name: "Fahad Mirza", phone: "03004445566", className: "Boxing", day: "Wednesday", time: "07:00 PM", status: "confirmed" as const },
    ]),
  });
  await prisma.message.create({ data: { gymId, name: "Nadia Pervaiz", phone: "03012223344", message: "Do you have a couples membership package?" } });
  return gym;
}

/* ---------------- Members + 6 months of fees + attendance ---------------- */
async function seedMembers(gymId: string, staffId: string, names: string[], expiryOffsets: number[]) {
  const plans = await prisma.membershipPlan.findMany({ where: { gymId }, orderBy: { order: "asc" } });
  const methods: PaymentMethod[] = ["cash", "jazzcash", "easypaisa", "bank"];
  const now = Date.now();

  for (let i = 0; i < names.length; i++) {
    const plan = plans[i % plans.length];
    const joinDate = new Date(now - (60 + i * 15) * DAY);
    const member = await prisma.member.create({
      data: {
        gymId, name: names[i], phone: `0300${String(1000000 + i * 7919).slice(0, 7)}`,
        gender: i % 3 === 1 ? "female" : "male", plan: plan.name, monthlyFee: plan.monthly,
        joinDate, expiryDate: new Date(now + expiryOffsets[i] * DAY), qrToken: newQrToken(),
      },
    });
    const payments = [];
    for (let m = 0; m < 6; m++) {
      const paidAt = new Date(now - m * 30 * DAY - i * DAY);
      if (paidAt < joinDate) break;
      payments.push({ gymId, memberId: member.id, memberName: member.name, amount: plan.monthly, months: 1, method: methods[(i + m) % 4], paidAt, receivedById: staffId });
    }
    await prisma.payment.createMany({ data: payments });

    // Attendance for the last 14 days (expired members skip it)
    if (expiryOffsets[i] > 0) {
      const visits = [];
      for (let d = 13; d >= 0; d--) {
        if ((i + d) % 3 === 0) continue;
        const t = new Date(now - d * DAY);
        t.setHours(6 + ((i * 3 + d) % 15), (i * 7) % 60, 0, 0);
        if (t.getTime() > now) continue;
        visits.push({ gymId, memberId: member.id, checkedInAt: t, method: "QR" as const, byUserId: staffId });
      }
      await prisma.attendance.createMany({ data: visits });
    }
  }
}

async function main() {
  console.log("🧹 Clearing old data...");
  await wipe();

  const admin = await user("Admin", env.ADMIN_EMAIL, env.ADMIN_PASSWORD, true);
  await seedIronPulse(admin.id);

  // Titan Fitness: a new gym on a 14-day Starter trial (like a fresh signup)
  const titanOwner = await user("Kamran Titan", "owner@titan.pk", DEMO_PASSWORD);
  const titan = await prisma.gym.create({
    data: { slug: "titan", name: "TITAN FITNESS", plan: "STARTER", subscriptionStatus: "TRIALING", trialEndsAt: new Date(Date.now() + 9 * DAY) },
  });
  await prisma.$transaction((tx) => starterContent(tx, titan.id, { name: "TITAN FITNESS", city: "Islamabad", email: "owner@titan.pk" }));
  await prisma.gymSettings.update({
    where: { gymId: titan.id },
    data: { address: "Shop 4, G-9 Markaz, Islamabad", mapQuery: "G-9 Markaz, Islamabad", phone: "+92 333 7654321", whatsapp: "923337654321", tagline: "Strength & Conditioning" },
  });
  await prisma.staffMembership.create({ data: { gymId: titan.id, userId: titanOwner.id, role: "OWNER" } });
  await seedMembers(titan.id, titanOwner.id, ["Waqas Ahmed", "Sobia Noor", "Junaid Khan", "Farah Ali", "Ahsan Raza"], [20, 4, -3, 45, 12]);

  console.log(`✅ Seed complete
   Platform admin + Iron Pulse owner: ${env.ADMIN_EMAIL} / (ADMIN_PASSWORD)
   Iron Pulse receptionist:           reception@ironpulse.pk / ${DEMO_PASSWORD}
   Iron Pulse trainer:                trainer@ironpulse.pk / ${DEMO_PASSWORD}
   Titan Fitness owner (trial):       owner@titan.pk / ${DEMO_PASSWORD}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
