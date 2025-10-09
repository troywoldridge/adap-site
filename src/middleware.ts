// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Public pages & APIs (everything here bypasses auth)
const isPublic = createRouteMatcher([
  "/",
  "/products(.*)",
  "/product(.*)",
  "/cart(.*)",
  "/checkout(.*)",
  "/api/(.*)",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/assets(.*)",
  "/images(.*)",
  "/_next/static(.*)",
  "/_next/image(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const url = req.nextUrl;

  // ✅ Redirect singular → plural
  if (url.pathname.startsWith("/category/")) {
    const to = url.clone();
    to.pathname = url.pathname.replace(/^\/category\//, "/categories/");
    return NextResponse.redirect(to, 301);
  }

  // ✅ Never intercept Stripe webhooks
  if (url.pathname.startsWith("/api/webhooks/stripe")) {
    return NextResponse.next();
  }

  // ✅ Pretty product URLs:
  const m = url.pathname.match(/^\/product\/(\d+)-/);
if (m) {
  // ✅ pass a RELATIVE path; this guarantees same-origin and avoids any localhost leaks
  const relative = `/product/${m[1]}${url.search || ""}`;
  return NextResponse.rewrite(relative);
}

  // Public routes go straight through; everything else requires auth
  if (isPublic(req)) {
    return NextResponse.next();
  }

  await auth.protect();
  return NextResponse.next();
});

// Run on everything except Next internals & static assets
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
