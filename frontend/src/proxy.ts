import { NextResponse, type NextRequest } from "next/server";

/**
 * Subdomain routing (multi-tenant):
 *   ironpulse.localhost:3000/        →  /sites/ironpulse       (the gym's website)
 *   localhost:3000/                  →  SaaS landing page
 *   localhost:3000/dashboard, /login →  dashboard (shared by all gyms)
 */
// Just the host (+ port) — even if written as "https://gymflow.pk/"
const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const ROOT_HOST = ROOT.replace(/:\d+$/, "");

function gymSlug(host: string) {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  if (h === ROOT_HOST || h === `www.${ROOT_HOST}`) return null;
  if (!h.endsWith(`.${ROOT_HOST}`)) return null; // some other domain (custom domains later)
  const sub = h.slice(0, -(ROOT_HOST.length + 1));
  return /^[a-z0-9-]+$/.test(sub) ? sub : null;
}

export function proxy(request: NextRequest) {
  const slug = gymSlug(request.headers.get("host") ?? "");
  const { pathname, search } = request.nextUrl;

  if (slug) {
    // No dashboard/login on subdomains — redirect to the main domain
    if (/^\/(dashboard|login|signup)(\/|$)/.test(pathname)) {
      const url = new URL(`${request.nextUrl.protocol}//${ROOT}${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    // The gym's website: "/" and its SEO files
    return NextResponse.rewrite(new URL(`/sites/${slug}${pathname === "/" ? "" : pathname}${search}`, request.url));
  }

  // /sites/... shouldn't open on the main domain (duplicate content) — redirect to the subdomain
  const m = pathname.match(/^\/sites\/([a-z0-9-]+)(\/.*)?$/);
  if (m) {
    const url = new URL(`${request.nextUrl.protocol}//${m[1]}.${ROOT}${m[2] ?? "/"}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // The proxy skips static files, images, Next internals and API routes
  matcher: ["/((?!_next/|api/|images/|icon|apple-icon|favicon|manifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
