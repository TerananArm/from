// middleware.js - Route Protection + Security Headers
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// Security Headers
const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=*, microphone=*, geolocation=()',
};

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Helper to add security headers to response
    const addSecurityHeaders = (response) => {
        Object.entries(securityHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        // Content Security Policy
        response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleusercontent.com; connect-src 'self' https://*.googleapis.com;");
        return response;
    };

    // =========================================================
    // 1. STATIC FILES & ALLOWED EXTENSIONS (No Auth Required)
    // =========================================================
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.') // files with extensions
    ) {
        return addSecurityHeaders(NextResponse.next());
    }

    // =========================================================
    // 2. CRITICAL PUBLIC API WHITELIST (No Auth Required)
    // =========================================================
    // We check using Includes for robustness against sub-paths or query strings
    const criticalPublicRoutes = [
        '/api/registration',
        '/api/applicants/update',
        '/api/applicants/search',
        '/api/public',
        '/api/auth', // NextAuth Routes
        '/login'      // Login Page
    ];

    if (criticalPublicRoutes.some(route => pathname.includes(route))) {
        return addSecurityHeaders(NextResponse.next());
    }

    // =========================================================
    // 3. GENERAL PUBLIC PATHS (No Auth Required)
    // =========================================================
    const otherPublicPaths = ['/search', '/api/setup'];
    // Check startWith for these
    if (otherPublicPaths.some(path => pathname.startsWith(path))) {
        return addSecurityHeaders(NextResponse.next());
    }

    // =========================================================
    // 4. AUTHENTICATION CHECK
    // =========================================================

    // Use env secret, with fallback for development only
    const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key-change-in-production' : undefined);

    const token = await getToken({
        req: request,
        secret: secret,
    });

    // Logging for debugging blocked requests (only API)
    if (!token && pathname.startsWith('/api/')) {
        console.warn(`[Middleware] Blocking unauthorized API access: ${pathname}`);
    }

    // List of Protected Paths
    const isProtectedPath =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/schedule') ||
        pathname.startsWith('/print') ||
        (pathname.startsWith('/api/') && !criticalPublicRoutes.some(route => pathname.includes(route)));

    if (isProtectedPath && !token) {
        if (pathname.startsWith('/api/')) {
            return addSecurityHeaders(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // If user is logged in and trying to access login page, redirect to dashboard
    if (pathname === '/login' && token) {
        return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }

    return addSecurityHeaders(NextResponse.next());
}

// Only run middleware on specific routes
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
