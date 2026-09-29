import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { HttpError } from "./http.js";
import { can, type Permission } from "./permissions.js";
import { subscriptionState } from "./plans.js";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const signToken = (userId: string) => jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });

// Requires a valid login token
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Login required");
  let userId: string;
  try {
    userId = (jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload).sub as string;
  } catch {
    throw new HttpError(401, "Your session has expired, please log in again");
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, isSuperAdmin: true } });
  if (!user) throw new HttpError(401, "Invalid session");
  req.user = user;
  next();
};

/**
 * Tenant check: a user can only access data of a gym where they are staff.
 * The gym comes from the "x-gym-id" header; if the user belongs to a single gym, that one is used.
 */
export const requireGym: RequestHandler = async (req, _res, next) => {
  const gymId = req.header("x-gym-id");
  const memberships = await prisma.staffMembership.findMany({
    where: { userId: req.user!.id, ...(gymId ? { gymId } : {}) },
    include: { gym: true },
    take: 2,
  });
  if (gymId && memberships.length === 0) throw new HttpError(403, "You are not a staff member of this gym");
  if (memberships.length === 0) throw new HttpError(403, "You are not a staff member of any gym");
  if (!gymId && memberships.length > 1) throw new HttpError(400, "Send the x-gym-id header (you belong to several gyms)");
  req.gym = memberships[0].gym;
  req.role = memberships[0].role;
  next();
};

export const requirePerm = (perm: Permission): RequestHandler => (req, _res, next) => {
  if (!req.role || !can(req.role, perm)) throw new HttpError(403, "You don't have permission to do this");
  next();
};

// When the trial ended or the subscription is inactive, writes are blocked (reads are allowed)
export const requireActiveSubscription: RequestHandler = (req, _res, next) => {
  if (req.method === "GET") return next();
  const state = subscriptionState(req.gym!);
  if (!state.canWrite) throw new HttpError(402, state.reason!, { code: "SUBSCRIPTION_INACTIVE" });
  next();
};

export const requireSuperAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user?.isSuperAdmin) throw new HttpError(403, "Platform admins only");
  next();
};
