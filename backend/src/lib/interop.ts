/**
 * Some packages (helmet, express-rate-limit) ship separate CJS and ESM typings.
 * Certain compilers — e.g. Vercel's build — pick the CJS typings, where a default import is the
 * whole module object instead of the function. This unwraps `.default` when present, both for
 * types and at runtime, so the code works with every module setting.
 */
export function interopDefault<T>(mod: T): T extends { default: infer D } ? D : T {
  const m = mod as unknown as { default?: unknown };
  return (m !== null && typeof m === "object" && "default" in m ? m.default : mod) as never;
}
