import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_EMAIL = 'mikeburnsinnovate@gmail.com';

// Paths that don't require auth
const PUBLIC_PATHS = new Set(['/', '/login']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through static assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Logged-in users don't need the coming soon or login pages
  if (user && PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/browse', request.url));
  }

  // Public paths — allow through
  if (PUBLIC_PATHS.has(pathname)) {
    return response;
  }

  // API routes — return 401 JSON instead of redirect
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Admin API — email check
    if (pathname.startsWith('/api/admin/') && user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return response;
  }

  // No session → send to login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin pages — email check
  if (pathname.startsWith('/admin') && user.email !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/browse', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
