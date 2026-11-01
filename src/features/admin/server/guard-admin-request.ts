import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_REALM, adminAuthorized, adminPassword } from "../lib/admin-auth";

/**
 * Proxy check for /admin routes: 404 while ADMIN_PASSWORD is unset, a Basic
 * auth challenge until the password matches, then the request goes through.
 */
export function guardAdminRequest(request: NextRequest): NextResponse {
  const password = adminPassword();
  if (!password) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (adminAuthorized(request.headers.get("authorization"), password)) {
    return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "www-authenticate": `Basic realm="${ADMIN_REALM}", charset="UTF-8"`,
      "x-robots-tag": "noindex",
    },
  });
}
