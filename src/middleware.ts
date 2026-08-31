import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight edge middleware. This is a UX optimisation, NOT the security
 * boundary — every protected route also calls requireUser/requireAdmin server-side.
 * It just bounces obviously-unauthenticated visitors to /login before rendering.
 */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
