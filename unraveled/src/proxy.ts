import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Single source of truth for admin emails — also used in /lib/auth.ts
const ADMIN_EMAILS = new Set(['mikeburnsinnovate@gmail.com', 'mike@xfuel.ai']);

// Paths always public — no session required
const PUBLIC_PATH_PREFIXES = [
  '/about',
  '/explore',
  '/method',
  '/creators',
  '/topics',
  '/people',
  '/institutions',
  '/reports',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/api/og',
  '/api/newsletter',
  '/api/submissions',
  '/api/graph',
  '/api/ratings',      // GET (averages) is public; write enforced at route level
  '/join',
  '/upgrade',
  '/vote',
  '/privacy',
  '/terms',
  '/cookies',
  '/refund',
  '/contact',
  '/api/votes',
  '/sitemap.xml',
  '/robots.txt',
];

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?'),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through static assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // Cookie-aware Supabase client — refreshes session tokens on every request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session (rotates cookies if needed — keeps auth alive)
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect logged-in users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Public content — allow through regardless of auth
  if (isPublic(pathname)) {
    return response;
  }

  // ── Admin protection ────────────────────────────────────────────────────────
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin/');

  if (isAdminPath) {
    // Allow internal scripts via secret header (set ADMIN_SCRIPT_SECRET in .env.local)
    const scriptSecret = process.env.ADMIN_SCRIPT_SECRET;
    if (scriptSecret && request.headers.get('x-admin-secret') === scriptSecret) {
      return response;
    }

    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!user.email || !ADMIN_EMAILS.has(user.email)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // ── Authenticated-only paths (e.g. /account, /saved) ───────────────────────
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
