import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect /Waifu to /waifu (preserve query parameters)
  if (pathname === '/Waifu' || pathname.startsWith('/Waifu/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/Waifu/i, '/waifu')
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/Waifu',
    '/Waifu/:path*',
  ],
}

