import type { Prisma } from "../generated/prisma/client.js";

type Tx = Prisma.TransactionClient;
const withOrder = <T extends object>(items: T[]) => items.map((x, i) => ({ ...x, order: i }));

/**
 * Starter template so a newly registered gym doesn't get an empty website.
 * The owner can change everything later from the dashboard.
 */
export async function starterContent(tx: Tx, gymId: string, info: { name: string; city: string; email: string }) {
  await tx.gymSettings.create({
    data: {
      gymId,
      city: info.city,
      email: info.email,
      address: info.city,
      mapQuery: info.city,
      aboutText: `At ${info.name} we don't just run workouts — we help you change your lifestyle. Reach your fitness goals with certified trainers and modern equipment.`,
      aboutPoints: ["Free fitness assessment on joining", "Separate ladies timing", "Personalised workout & diet plans", "Clean & air-conditioned"],
      offerText: "Join this month and get 50% OFF the admission fee",
      admissionFee: 2000,
      hero: {
        title: ["BUILD YOUR", "STRONGEST", "SELF"],
        rotating: ["Strength", "Endurance", "Confidence", "Discipline"],
        subtitle: "Modern equipment, certified trainers and a motivating community. Start your fitness journey today — your first day is FREE.",
        image: "/images/hero.jpg",
      },
      stats: [
        { value: 100, suffix: "+", label: "Active Members" },
        { value: 5, suffix: "+", label: "Expert Trainers" },
        { value: 20, suffix: "+", label: "Weekly Classes" },
        { value: 1, suffix: "", label: "Years Experience" },
      ],
      timings: [
        { day: "Monday – Saturday", time: "6:00 AM – 11:00 PM" },
        { day: "Sunday", time: "8:00 AM – 2:00 PM" },
      ],
      images: { about1: "/images/about1.jpg", about2: "/images/about2.jpg", counters: "/images/g6.jpg", cta: "/images/cta.jpg" },
    },
  });

  await tx.feature.createMany({
    data: withOrder([
      { icon: "dumbbell", title: "Modern Equipment", text: "A complete setup of imported machines and free weights." },
      { icon: "trainer", title: "Certified Trainers", text: "Qualified coaches who support you every step of the way." },
      { icon: "diet", title: "Diet Plans", text: "A personalised diet chart built around your goal." },
      { icon: "ac", title: "Fully Air Conditioned", text: "Train in comfort, even in the summer heat." },
      { icon: "shower", title: "Lockers & Showers", text: "Clean changing rooms and secure lockers." },
      { icon: "parking", title: "Free Parking", text: "Free parking for cars and bikes." },
    ]).map((f) => ({ ...f, gymId })),
  });

  await tx.membershipPlan.createMany({
    data: withOrder([
      { name: "Basic", monthly: 4000, popular: false, features: ["Gym floor access", "Locker room", "Fitness assessment"], missing: ["Group classes", "Personal trainer"] },
      { name: "Standard", monthly: 7000, popular: true, features: ["Gym floor access", "All group classes", "Monthly diet plan"], missing: ["Personal trainer"] },
      { name: "Premium", monthly: 15000, popular: false, features: ["Everything in Standard", "Personal trainer (3x/week)", "Weekly diet plan"], missing: [] },
    ]).map((p) => ({ ...p, gymId })),
  });

  await tx.program.createMany({
    data: withOrder([
      { image: "/images/p-strength.jpg", title: "Strength Training", text: "Build muscle and strength with progressive overload.", level: "All Levels" },
      { image: "/images/p-cardio.jpg", title: "Cardio & Fat Loss", text: "Burn fat fast with treadmill, cycling and HIIT.", level: "Beginner" },
      { image: "/images/p-personal.jpg", title: "Personal Training", text: "One-on-one coaching tailored to your goal.", level: "Custom" },
    ]).map((p) => ({ ...p, gymId })),
  });

  await tx.faq.createMany({
    data: withOrder([
      { q: "Do you offer a free trial?", a: "Yes! Your first day is completely free. Fill in the form to book your free trial." },
      { q: "How can I pay?", a: "We accept cash, bank transfer, JazzCash and EasyPaisa." },
    ]).map((f) => ({ ...f, gymId })),
  });
}
