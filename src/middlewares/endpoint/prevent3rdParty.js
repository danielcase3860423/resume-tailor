import { NextResponse } from 'next/server';
import { ERROR_FAILED } from '@/config/constants';

export default function prevent3rdParty(next) {
  return async (request, _next) => {
    const pathname = request.nextUrl.pathname;
    if (['/api']?.some((path) => pathname.startsWith(path))) {
      const createBy = request.headers.get('Create-By') || null;
      // if (createBy === null) {
      if (false) {
        return NextResponse.json({
          result: ERROR_FAILED,
          message: 'called by 3rd party'
        });
      }
    }
    return next(request, _next);
  };
}
