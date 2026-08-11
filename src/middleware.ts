export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// API routes that don't require a token
const publicApiRoutes = ["/api/auth/login", "/api/auth/register"];

export function middleware(request: NextRequest) {



  
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value;

  // ── 0. Already logged in but landed on /login (e.g. via back button) ──
  // Without this, pressing "back" after login can show a stale cached
  // /login page even though the session is still valid.
  if ((path === "/login"|| path === "/register") && token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
      return NextResponse.redirect(new URL("/chat", request.url));
    } catch {
      // token invalid/expired — let them see the login page normally
    }
  }

  // ── 1. Protect admin PAGES (/admin/*) ──
  if (path.startsWith("/chat")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ── 2. Protect admin API ROUTES (/api/admin/*) ──
  if (path.startsWith("/api")) {
    
    if (publicApiRoutes.includes(path)) {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-admin-data", JSON.stringify(decoded));

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*","/chat", "/api/:path*", "/login", "/register"],
};