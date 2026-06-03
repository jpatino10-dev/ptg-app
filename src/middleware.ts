import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public routes
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/auth/') || pathname.startsWith('/book') || pathname.startsWith('/order-shirt') || pathname.startsWith('/api/book/') || pathname.startsWith('/api/group-slots') || pathname.startsWith('/api/cron/')) {
    return supabaseResponse
  }

  // Protected routes — redirect to login if not authenticated
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based routing
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, must_reset_password')
    .eq('id', user.id)
    .single()

  // Force password reset before accessing any protected route
  if (profile?.must_reset_password && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth/set-password', request.url))
  }

  const role = profile?.role
  const isAdmin     = role === 'admin'
  const isDirector  = role === 'director'

  // Payments and discounts are admin-only
  if ((pathname.startsWith('/admin/payments') || pathname.startsWith('/admin/discounts')) && !isAdmin) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  if (pathname.startsWith('/admin') && !isAdmin && !isDirector) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/coach') && role !== 'coach' && !isAdmin && !isDirector) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/parent') && role !== 'parent' && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
