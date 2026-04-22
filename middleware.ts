import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;
  const role = req.auth?.user?.role;

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Account routes
  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

// Keep matcher narrow so static assets and API routes aren't intercepted.
// Protected API routes do their own auth() checks inside the handler.
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
