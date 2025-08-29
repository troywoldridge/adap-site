// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Public pages & APIs
const isPublic = createRouteMatcher([
  "/",
  "/products(.*)",
  "/product(.*)",
  "/cart(.*)",
  "/checkout(.*)",
  "/api/(.*)",          // public JSON APIs (Stripe webhook is still bypassed explicitly)
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/assets(.*)",
  "/images(.*)",
  "/_next/static(.*)",
  "/_next/image(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // Never intercept Stripe webhooks
  if (pathname.startsWith("/api/webhooks/stripe")) {
    return NextResponse.next();
  }

  // Pretty product URLs: /product/123-some-slug → internally render /product/123
  const m = pathname.match(/^\/product\/(\d+)-/);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/product/${m[1]}`;
    return NextResponse.rewrite(url);
  }

  // Public routes go straight through; everything else requires auth
  if (isPublic(req)) {
    return NextResponse.next();
  }

  await auth.protect(); // ✅ correct for your Clerk version
  return NextResponse.next();
});

// Run on everything except Next internals & static assets
export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
