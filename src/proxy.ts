import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { guardAdminRequest } from "@/features/admin/server";
import { unavailableJobResponse } from "@/features/jobs/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (/^\/admin(?:\/|$)/.test(pathname)) {
    return guardAdminRequest(request);
  }

  const slug = pathname.match(/^\/jobs\/([^/]+)$/)?.[1];
  if (slug) {
    return (await unavailableJobResponse(slug)) ?? NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/jobs/:slug", "/admin/:path*"],
};
