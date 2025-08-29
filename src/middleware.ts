import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Public pages & APIs (no auth required)
const isPublic = createRouteMatcher([
  "/",
  "/products(.*)",
  "/product(.*)",
  "/cart(.*)",
  "/checkout(.*)",
  "/api/(.*)",                // your public JSON APIs
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/assets(.*)",
  "/images(.*)",
  "/_next/static(.*)",
  "/_next/image(.*)",
]);

export default clerkMiddleware((auth, req: NextRequest) => {
  // Pretty product URLs: /product/123-business-cards -> internally render /product/123
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/product\/(\d+)-/);
  if (m) {
    const id = m[1];
    const url = req.nextUrl.clone();
    url.pathname = `/product/${id}`;
    return NextResponse.rewrite(url);
  }

  // No special handling otherwise
  return NextResponse.next();
}, {
  // Treat these as public; the rest can be protected if you add private areas later
  publicRoutes: (req) => isPublic(req),
  // Never intercept Stripe webhooks
  ignoredRoutes: ["/api/webhooks/stripe"],
});

// Run on everything except Next internals & static files
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map)$).*)"],
};
