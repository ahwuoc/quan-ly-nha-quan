import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";


export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" || pathname === "/tenants") {
    const lastTenant = request.cookies.get("last_tenant_slug")?.value;
    const isBack = searchParams.get("back") === "true";

    if (lastTenant && !isBack) {
      console.log(`[Speedy Redirect] Auto-routing to last restaurant: ${lastTenant}`);
      return NextResponse.redirect(new URL(`/admin/${lastTenant}/menu`, request.url));
    }
  }
  let response = await updateSession(request);

  const tablePageRegex = /^\/([^/]+)\/table\/([^/]+)$/;
  const match = pathname.match(tablePageRegex);

  if (match) {
    const tenantSlug = match[1];
    const tableId = match[2];
    if (pathname.endsWith("/occupied")) return response;

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
            },
          },
        }
      );
      const lockResponse = await handleTableSessionLock(request, response, supabase, tenantSlug, tableId);
      if (lockResponse) return lockResponse;

    } catch (e) {
      console.error("[Proxy] Critical Execution Error:", e);
    }
  }

  return response;
}


async function handleTableSessionLock(
  request: NextRequest,
  response: NextResponse,
  supabase: ReturnType<typeof createServerClient>,
  tenantSlug: string,
  tableId: string
) {
  return null;
}


function syncCookies(sourceResponse: NextResponse, targetResponse: NextResponse) {
  sourceResponse.cookies.getAll().forEach((cookie) => {
    targetResponse.cookies.set(cookie.name, cookie.value, {
      path: "/",
      ...cookie,
    });
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/api/admin/:path*",
  ],
};
