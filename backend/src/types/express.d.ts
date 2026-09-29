import type { Gym, Role, User } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "name" | "email" | "isSuperAdmin">;
      gym?: Gym; // the gym this request is for (from the x-gym-id header)
      role?: Role; // the user's role in that gym
    }
  }
}

export {};
