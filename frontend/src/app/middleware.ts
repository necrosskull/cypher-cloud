import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/dashboard', '/settings']

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const token = req.cookies.get('access_token')?.value

  // Если пользователь идёт на защищённые роуты и нет токена — редиректим на /login
  if (protectedPaths.some(path => url.pathname.startsWith(path)) && !token) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  return NextResponse.next()
}
