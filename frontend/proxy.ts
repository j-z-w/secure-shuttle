import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isAdminRoute = createRouteMatcher(['/dashboard']);
const isSignedRoute = createRouteMatcher(['/newEscrow']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isAdminRoute(req) && sessionClaims?.metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (userId && req.nextUrl.pathname === '/signin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isSignedRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};