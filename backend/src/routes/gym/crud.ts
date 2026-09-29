import { Router } from "express";
import type { ZodObject, ZodRawShape, ZodType } from "zod";
import { requirePerm } from "../../lib/auth.js";
import type { Permission } from "../../lib/permissions.js";

// The common part of Prisma model delegates (feature, membershipPlan, ...)
type Delegate = {
  findMany(args: object): Promise<unknown[]>;
  create(args: object): Promise<unknown>;
  update(args: object): Promise<unknown>;
  delete(args: object): Promise<unknown>;
};

type Options = {
  view: Permission;
  write: Permission;
  orderBy?: object | object[];
  filters?: string[]; // filters like ?status=new (validated against the schema)
  search?: string[]; // ?q= searches these fields
};

/**
 * List/create/update/delete for one model.
 * EVERY query is scoped by gymId — one gym can never read or change another gym's records.
 */
export function crudRouter<S extends ZodRawShape>(model: Delegate, schema: ZodObject<S>, opts: Options) {
  const r = Router();
  const orderBy = opts.orderBy ?? [{ order: "asc" }];

  r.get("/", requirePerm(opts.view), async (req, res) => {
    const where: Record<string, unknown> = { gymId: req.gym!.id };
    for (const f of opts.filters ?? []) {
      const v = req.query[f];
      if (typeof v !== "string" || !v) continue;
      const field = schema.shape[f] as unknown as ZodType | undefined;
      if (field && field.safeParse(v).success) where[f] = v; // ignore invalid enum values
    }
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q && opts.search?.length) {
      where.OR = opts.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));
    }
    const take = Math.min(Number(req.query.limit) || 500, 1000);
    res.json(await model.findMany({ where, orderBy, take }));
  });

  r.post("/", requirePerm(opts.write), async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await model.create({ data: { ...data, gymId: req.gym!.id } }));
  });

  r.put("/:id", requirePerm(opts.write), async (req, res) => {
    const data = schema.partial().parse(req.body);
    // gymId in the where clause: another gym's id gives "not found" (P2025 → 404)
    res.json(await model.update({ where: { id: String(req.params.id), gymId: req.gym!.id }, data }));
  });

  r.delete("/:id", requirePerm(opts.write), async (req, res) => {
    await model.delete({ where: { id: String(req.params.id), gymId: req.gym!.id } });
    res.json({ ok: true });
  });

  return r;
}
