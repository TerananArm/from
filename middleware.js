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
    // STRATEGY: BLACKLIST (Allow All by Default, Block Admin)
    // =========================================================

    // 1. Always Allow Static Files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return addSecurityHeaders(NextResponse.next());
    }

    // 2. Define What is STRICTLY FORBIDDEN (Admin Only)
    // These paths require Login. Everything else is Public.
    const adminPathPrefixes = [
        '/dashboard',       // Admin UI
        '/api/dashboard',   // Admin Stats
        '/api/user',        // User Management
        '/api/audit',       // Audit Logs
        '/schedule',        // Schedule Management (Admin)
        '/print'            // Print Layout (Usually Admin/Staff?) -> IF public needs check, move out. Assuming Admin.
    ];

    // Check if current path hits a forbidden prefix
    let isProtected = adminPathPrefixes.some(prefix => pathname.startsWith(prefix));

    // Special Case: /api/applicants
    // The LIST view (/api/applicants) is Auth Only.
    // The SEARCH/UPDATE views (/api/applicants/search, ...) are Public.
    if (pathname.startsWith('/api/applicants')) {
        const isPublicApplicantRoute =
            pathname.includes('/search') ||
            pathname.includes('/update');

        if (!isPublicApplicantRoute) {
            isProtected = true;
        }
    }

    // If it's NOT protected, let it pass (Public by Default!)
    if (!isProtected) {
        return addSecurityHeaders(NextResponse.next());
    }

    // =========================================================
    // 3. AUTHENTICATION CHECK (Only reaches here if Protected)
    // =========================================================

    // Use env secret, with fallback for development only
    const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key-change-in-production' : undefined);

    const token = await getToken({
        req: request,
        secret: secret,
    });

    if (!token) {
        // Block API with JSON
        if (pathname.startsWith('/api/')) {
            console.warn(`[Middleware] Blocking Admin API access: ${pathname}`);
            return addSecurityHeaders(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
        }
        // Redirect Pages to Login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // If logged in but accessing login page, go to dashboard
    if (pathname === '/login' && token) {
        return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }

    return addSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
