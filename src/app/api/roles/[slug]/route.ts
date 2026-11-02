import { loadOpenRole } from "@/features/jobs/server";

// One open role for the board's detail pane, so opening a role does not rebuild the board.
// Roles change only when a sync runs, so the CDN may serve a copy for a few minutes.
const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export async function GET(_request: Request, ctx: RouteContext<"/api/roles/[slug]">) {
  const { slug } = await ctx.params;
  const role = slug.length <= 180 ? await loadOpenRole(slug) : null;
  if (!role) {
    return Response.json({ error: "Role not found" }, { status: 404, headers: { "Cache-Control": CACHE } });
  }
  return Response.json(role, { headers: { "Cache-Control": CACHE } });
}
