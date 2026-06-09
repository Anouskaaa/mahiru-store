import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('admin_session');
  const pathname = request.nextUrl.pathname;

  // Allow login page and static files
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check session
  if (!session || session.value !== 'authenticated') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};