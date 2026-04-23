export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import { ERROR_SUCCESS } from '@/config/constants';

export const POST = async (req) => {
  try {
    // Always return success after clearing cookie
    const response = Response.json({
      msg: "You're logged out successfully.",
      result: ERROR_SUCCESS
    });

    // 🧹 Remove JWT cookie
    response.headers.append('Set-Cookie', `auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);

    return response;
  } catch (err) {
    console.error('Logout error:', err);
    return sendError(Response, { msg: 'Logout failed', code: 500 });
  }
};
