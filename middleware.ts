import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getPrimaryEmailForUser } from "@/lib/auth/clerk-email-from-auth";
import { isDisposableEmail } from "@/lib/auth/disposable-email";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/disposable-email-blocked(.*)",
    "/api/webhooks/clerk",
  ],
  async afterAuth(auth, req) {
    if (!auth.userId) {
      if (req.nextUrl.pathname.startsWith("/dashboard")) {
        const origin =
          req.experimental_clerkUrl?.origin ?? req.nextUrl.origin;
        return NextResponse.redirect(new URL("/", origin));
      }
      return;
    }

    if (req.nextUrl.pathname.startsWith("/disposable-email-blocked")) {
      return;
    }

    const email = await getPrimaryEmailForUser(auth);
    if (!email) return;

    if (!isDisposableEmail(email)) return;

    if (auth.isApiRoute) {
      return NextResponse.json(
        {
          error:
            "Disposable or temporary email addresses are not allowed. Please use a stable email.",
        },
        { status: 403 }
      );
    }

    const origin =
      req.experimental_clerkUrl?.origin ?? req.nextUrl.origin;
    return NextResponse.redirect(new URL("/disposable-email-blocked", origin));
  },
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
