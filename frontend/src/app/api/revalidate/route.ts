import { revalidatePath } from "next/cache";
import { API_URL } from "@/lib/api";

const SERVER_API_URL = (process.env.API_URL_INTERNAL || API_URL).replace(/\/+$/, "");

// When the dashboard saves content, refresh that gym's website cache immediately
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const gymId = request.headers.get("x-gym-id") ?? "";
  if (!auth) return Response.json({ message: "Unauthorized" }, { status: 401 });

  // Is the token a real staff member's, and for which gym? Confirm with the backend
  const me = await fetch(`${SERVER_API_URL}/api/auth/me`, { headers: { Authorization: auth }, cache: "no-store" }).catch(() => null);
  if (!me?.ok) return Response.json({ message: "Unauthorized" }, { status: 401 });
  const profile: { gyms: { id: string; slug: string; permissions: string[] }[] } = await me.json();
  const gym = profile.gyms.find((g) => g.id === gymId) ?? (profile.gyms.length === 1 ? profile.gyms[0] : undefined);
  if (!gym || !gym.permissions.includes("content:write")) return Response.json({ message: "Forbidden" }, { status: 403 });

  revalidatePath(`/sites/${gym.slug}`, "layout");
  return Response.json({ revalidated: gym.slug });
}
