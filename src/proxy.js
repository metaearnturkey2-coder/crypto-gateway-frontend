import { NextResponse } from "next/server";

const DEFAULT_ADMIN_CONSOLE_PATH = "/admin/settlement-console";
const INTERNAL_ADMIN_ROUTE = "/admin/payouts";

function normalizeAdminPath(value) {
  const rawPath = String(value || DEFAULT_ADMIN_CONSOLE_PATH).trim();
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const normalized = path.replace(/\/+$/, "");

  if (!normalized.startsWith("/admin/") || normalized === INTERNAL_ADMIN_ROUTE) {
    return DEFAULT_ADMIN_CONSOLE_PATH;
  }

  return normalized;
}

function normalizeRequestPath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function proxy(request) {
  const pathname = normalizeRequestPath(request.nextUrl.pathname);
  const adminConsolePath = normalizeAdminPath(process.env.ADMIN_CONSOLE_PATH);

  if (pathname === INTERNAL_ADMIN_ROUTE || pathname.startsWith(`${INTERNAL_ADMIN_ROUTE}/`)) {
    return new Response("Not found", { status: 404 });
  }

  if (pathname === adminConsolePath || pathname.startsWith(`${adminConsolePath}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = INTERNAL_ADMIN_ROUTE;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/admin/")) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
