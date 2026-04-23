import { NextResponse } from 'next/server';

export default function customHeaderMiddleware() {
  return async (request, _next) => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  };
}
