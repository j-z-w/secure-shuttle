import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isAdminRoute = createRouteMatcher(['/dashboard']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isAdminRoute(req) && sessionClaims?.metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (userId && req.nextUrl.pathname === '/signin') {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};