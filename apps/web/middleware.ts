import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './lib/jwt'

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  
  // Public static assets and APIs that don't need authentication check
  if (
    currentPath.startsWith('/_next') || 
    currentPath.startsWith('/Images') || 
    currentPath.startsWith('/uploads') || 
    currentPath.startsWith('/api') || 
    currentPath.startsWith('/policy') ||
    currentPath.startsWith('/forgot-password') ||
    currentPath.startsWith('/reset-password')
  ) {
    return NextResponse.next();
  }

  // Read session JWT from cookies
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  const role = session?.role?.toLowerCase() || '';

  // 1. Auto-Redirect logged-in users from Landing Page, Homepage, or Login page to their Dashboard
  if (currentPath === '/' || currentPath === '/homepage' || currentPath === '/login') {
    if (session) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      if (role === 'cashier') return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
      return NextResponse.redirect(new URL('/customer/dashboard', request.url));
    }
    // If not logged in, allow them to view landing page or login page
    return NextResponse.next();
  }

  // 2. Prevent logged-out users from seeing Protected Dashboards
  if (!session) {
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
