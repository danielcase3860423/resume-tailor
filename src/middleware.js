import stackMiddlewares from '@/middlewares/stackHandler';
import RouteRoleBasedMiddleware from '@/middlewares/frontend/RouteRoleBasedMiddleware';
import customHeaderMiddleware from '@/middlewares/frontend/customHeaderMiddleware';
import prevent3rdParty from '@/middlewares/endpoint/prevent3rdParty';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)'
    }
  ]
};

const middlewares = [RouteRoleBasedMiddleware, prevent3rdParty, customHeaderMiddleware];
export default stackMiddlewares(middlewares);
