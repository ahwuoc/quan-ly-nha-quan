import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && pathname.startsWith("/admin") && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }
  if (user && (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/"))) {
    const segments = pathname.split("/");
    const isApi = pathname.startsWith("/api/");
    const tenantSlug = isApi ? segments[3] : segments[2];

    if (tenantSlug && tenantSlug !== "restricted") {
      console.log(`[Authorization Check] User: ${user.email} (${user.id}), Slug: ${tenantSlug}, Type: ${isApi ? 'API' : 'Page'}`);

      const { data: tenantAccess, error: rpcError } = await supabase
        .rpc("check_user_tenant_access_by_slug", {
          p_user_id: user.id,
          p_tenant_slug: tenantSlug
        });

      if (rpcError) {
        console.error("[Proxy] Authorization check error:", rpcError);
        return supabaseResponse;
      }

      if (!tenantAccess) {
        console.warn(`[Security] Forbidden access attempt by ${user.email} to ${tenantSlug} (${isApi ? 'API' : 'Page'})`);

        if (isApi) {
          return NextResponse.json(
            { error: "Forbidden: You do not have access to this tenant" },
            { status: 403 }
          );
        } else {
          const url = request.nextUrl.clone();
          url.pathname = "/tenants";
          const response = NextResponse.redirect(url);
          response.cookies.set("last_admin_path", "", { expires: new Date(0), path: "/" });
          response.cookies.set("last_tenant_slug", "", { expires: new Date(0), path: "/" });
          return response;
        }
      }
    }
  }
  if (user && pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/tenants"; 
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
