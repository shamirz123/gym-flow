import Stripe from "stripe";
import { prisma } from "../db.js";
import { env } from "../env.js";
import type { Gym, SaasPlan, SubscriptionStatus } from "../generated/prisma/client.js";
import { SAAS_PLANS } from "./plans.js";
import { addMonths } from "./util.js";
import { HttpError } from "./http.js";

/**
 * Billing runs in two modes:
 *  - STRIPE_SECRET_KEY set → real Stripe Checkout (test mode is free)
 *  - no key → "demo billing": the plan activates immediately (for portfolio demos)
 */
export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
export const billingMode = stripe ? "stripe" : "demo";

export async function createCheckout(gym: Gym, plan: SaasPlan, returnUrl: string): Promise<{ url: string; mode: string }> {
  if (!stripe) {
    await prisma.gym.update({
      where: { id: gym.id },
      data: { plan, subscriptionStatus: "ACTIVE", currentPeriodEnd: addMonths(new Date(), 1), trialEndsAt: null },
    });
    return { url: `${returnUrl}?checkout=success&demo=1`, mode: "demo" };
  }

  // Create the Stripe customer once, then reuse it
  let customerId = gym.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: gym.name, metadata: { gymId: gym.id, slug: gym.slug } });
    customerId = customer.id;
    await prisma.gym.update({ where: { id: gym.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "pkr",
          unit_amount: SAAS_PLANS[plan].pricePkr * 100, // PKR in paisa
          recurring: { interval: "month" },
          product_data: { name: `GymFlow ${SAAS_PLANS[plan].name}` },
        },
      },
    ],
    metadata: { gymId: gym.id, plan },
    subscription_data: { metadata: { gymId: gym.id, plan } },
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
  });
  if (!session.url) throw new HttpError(502, "Could not create Stripe checkout");
  return { url: session.url, mode: "stripe" };
}

export async function cancelSubscription(gym: Gym) {
  if (stripe && gym.stripeSubscriptionId) {
    // Stays active until the period ends, then the webhook marks it CANCELED
    await stripe.subscriptions.update(gym.stripeSubscriptionId, { cancel_at_period_end: true });
  }
  return prisma.gym.update({
    where: { id: gym.id },
    data: { subscriptionStatus: "CANCELED", currentPeriodEnd: gym.currentPeriodEnd ?? new Date() },
  });
}

export async function billingPortalUrl(gym: Gym, returnUrl: string) {
  if (!stripe || !gym.stripeCustomerId) return null;
  const s = await stripe.billingPortal.sessions.create({ customer: gym.stripeCustomerId, return_url: returnUrl });
  return s.url;
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  incomplete: "PAST_DUE",
  canceled: "CANCELED",
  incomplete_expired: "CANCELED",
  paused: "CANCELED",
};

async function syncSubscription(sub: Stripe.Subscription) {
  const gymId = sub.metadata?.gymId;
  if (!gymId) return;
  const plan = (sub.metadata?.plan as SaasPlan) in SAAS_PLANS ? (sub.metadata.plan as SaasPlan) : undefined;
  const periodEnd = sub.items?.data?.[0]?.current_period_end;
  await prisma.gym.update({
    where: { id: gymId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.cancel_at_period_end && sub.status === "active" ? "CANCELED" : STATUS_MAP[sub.status] ?? "PAST_DUE",
      ...(plan ? { plan } : {}),
      ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
      trialEndsAt: null,
    },
  });
}

// Stripe webhook: verify the signature, then update the gym's subscription
export async function handleWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) throw new HttpError(400, "Stripe is not configured");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new HttpError(400, "Invalid webhook signature");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && typeof s.subscription === "string") {
        await syncSubscription(await stripe.subscriptions.retrieve(s.subscription));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "invoice.payment_failed": {
      const customer = event.data.object.customer;
      if (typeof customer === "string") {
        await prisma.gym.updateMany({ where: { stripeCustomerId: customer }, data: { subscriptionStatus: "PAST_DUE" } });
      }
      break;
    }
  }
  return event.type;
}
