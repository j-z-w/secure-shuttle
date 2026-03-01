import { clerkMiddleware, createRouteMatcher} from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/dashboard"]);

const isSignedRoute = createRouteMatcher(["/newEscrow"])

export default clerkMiddleware(async (auth, req) => {

  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  // } else if (!userID) {
  //   return NextResponse.redirect(new URL("/signup", req.url))
  if (isSignedRoute(req)) {
    const { userId } = await auth();
    console.log(userId);
    if (!userId) {
      return NextResponse.redirect(new URL("/signin", req.url));
    }
  }
});

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//     // Always run for API routes
//     '/(api|trpc)(.*)',
//   ],
// };





// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// export default clerkMiddleware(async (auth, req) => {
//   if (isAdminRoute(req)) {
//     const { sessionClaims } = await auth();
//     if (sessionClaims?.metadata?.role !== "admin") {
//       return NextResponse.redirect(new URL("/", req.url));
//     }
//   }
// });

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};