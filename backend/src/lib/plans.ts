import type { Gym, SaasPlan } from "../generated/prisma/client.js";
import { env } from "../env.js";

// GymFlow SaaS plans (what gym owners subscribe to)
export const SAAS_PLANS = {
  STARTER: {
    name: "Starter",
    pricePkr: 4999,
    get maxMembers() { return env.STARTER_MAX_MEMBERS; },
    get maxStaff() { return env.STARTER_MAX_STAFF; },
    features: ["Gym website + subdomain", `Up to ${env.STARTER_MAX_MEMBERS} members`, `${env.STARTER_MAX_STAFF} staff accounts`, "QR attendance", "Fee tracking & reminders"],
  },
  PRO: {
    name: "Pro",
    pricePkr: 9999,
    maxMembers: Infinity,
    maxStaff: Infinity,
    features: ["Everything in Starter", "Unlimited members", "Unlimited staff", "Revenue reports & CSV export", "Priority support"],
  },
} satisfies Record<SaasPlan, { name: string; pricePkr: number; maxMembers: number; maxStaff: number; features: string[] }>;

export type SubscriptionState = { canWrite: boolean; reason?: string; daysLeft?: number };

// Is the gym's subscription usable? (expired trial / cancelled = read-only)
export function subscriptionState(gym: Pick<Gym, "subscriptionStatus" | "trialEndsAt" | "currentPeriodEnd">): SubscriptionState {
  const now = Date.now();
  switch (gym.subscriptionStatus) {
    case "ACTIVE":
      return { canWrite: true };
    case "PAST_DUE":
      return { canWrite: true, reason: "Your last payment failed — please update billing" };
    case "TRIALING": {
      const end = gym.trialEndsAt?.getTime() ?? 0;
      if (end > now) return { canWrite: true, daysLeft: Math.ceil((end - now) / 864e5) };
      return { canWrite: false, reason: "Your free trial has ended — please choose a plan" };
    }
    case "CANCELED": {
      // After cancelling, access continues until the end of the paid period
      const end = gym.currentPeriodEnd?.getTime() ?? 0;
      if (end > now) return { canWrite: true, reason: "Subscription cancelled — access ends when the current period ends" };
      return { canWrite: false, reason: "Subscription inactive — please reactivate a plan" };
    }
  }
}
