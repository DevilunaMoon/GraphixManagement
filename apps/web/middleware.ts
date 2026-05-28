import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './lib/jwt'

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  
  // Public paths don't need authentication
  if (
    currentPath.startsWith('/_next') || 
    currentPath.startsWith('/Images') || 
    currentPath.startsWith('/uploads') || 
    currentPath.startsWith('/api') || 
    currentPath.startsWith('/policy') ||
    currentPath.startsWith('/forgot-password') ||
    currentPath.startsWith('/reset-password') ||
    currentPath === '/' || 
    currentPath === '/homepage'
  ) {
    return NextResponse.next();
  }

  // Read session JWT from cookies
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  const role = session?.role?.toLowerCase() || '';

  // 1. Prevent logged-in users from seeing the Login page
  if (currentPath === '/login') {
    if (session) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      if (role === 'cashier') return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
      return NextResponse.redirect(new URL('/customer/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 2. Prevent logged-out users from seeing Dashboards
  if (!session && !currentPath.startsWith('/login') && !currentPath.startsWith('/homepage')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', currentPath + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  
  // 3. Strict Role-based routing protection
  if (session && currentPath.startsWith('/admin') && role !== 'admin') {
    if (role === 'cashier') return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
    return NextResponse.redirect(new URL('/customer/dashboard', request.url));
  }
  
  if (session && currentPath.startsWith('/cashier') && role !== 'cashier') {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    return NextResponse.redirect(new URL('/customer/dashboard', request.url));
  }

  if (session && currentPath.startsWith('/customer') && role !== 'customer') {
    if (currentPath.startsWith('/customer/monitoring')) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/monitoring', request.url));
      if (role === 'cashier') return NextResponse.redirect(new URL('/cashier/monitoring', request.url));
    }
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    if (role === 'cashier') return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
  }
  
  // 4. Attach No-Cache Headers to Protected Routes to prevent Back-Button access after logout
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// Apply middleware to all routes except api, static files, and images
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
