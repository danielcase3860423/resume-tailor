import { NextResponse } from 'next/server';
import {
  CONSTANT_USER_ROLE_ADMIN,
  CONSTANT_USER_ROLE_USER,
  CONSTANT_USER_ROLE_CALLER,
  CONSTANT_USER_ROLE_GUEST,
  COOKIE_USER_KEY
} from '@/config/constants';

const sharedCommonPageRoute = ['/login'];

const whiteList = [...sharedCommonPageRoute, '/applies', '/resume', '/users', '/profiles', '/phones', '/calls', '/jobs'];

const accessList = {
  [CONSTANT_USER_ROLE_ADMIN]: [...sharedCommonPageRoute, '/applies', '/resume', '/users', '/profiles', '/phones', '/jobs'],
  [CONSTANT_USER_ROLE_USER]: [...sharedCommonPageRoute, '/applies', '/resume', '/jobs'],
  [CONSTANT_USER_ROLE_CALLER]: [...sharedCommonPageRoute, '/calls'],
  [CONSTANT_USER_ROLE_GUEST]: [...sharedCommonPageRoute]
};

export default function RouteRoleBasedMiddleware(next) {
  return async (request, _next) => {
    const pathname = request.nextUrl.pathname;

    // Check if the route is in the whitelist
    if (whiteList.some((path) => pathname.startsWith(path))) {
      let canAccess = false;
      const cookie = request.cookies.get(COOKIE_USER_KEY);

      if (cookie) {
        const user = JSON.parse(cookie.value);
        const userRole = user.role.toUpperCase();
        canAccess = accessList[userRole]?.some((path) => pathname.startsWith(path));
      } else {
        canAccess = accessList[CONSTANT_USER_ROLE_GUEST]?.some((path) => pathname.startsWith(path));
      }

      if (!canAccess) {
        const url = new URL(`/error400`, request.url);
        return NextResponse.redirect(url);
      }
    }

    return next(request, _next);
  };
}
