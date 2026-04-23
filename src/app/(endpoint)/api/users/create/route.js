export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createUser, getUserByEmail } from '@/services/(endpoint)/users/user.controller';
import { sendError } from '@/helpers/endpoint';
import { result } from 'lodash';

export const POST = async (req) => {
  try {
    const body = await req.json();
    const data = await getUserByEmail(body.email);
    if (data.length) return Response.json({
      result: 'failed',
      msg: 'duplicated user'
    })
    const newUser = await createUser(body);


    return Response.json({
      result: 'success',
      user: newUser
    });
  } catch (err) {
    console.error('//////////////////////////create-user error:', err);
    return sendError(Response, { msg: 'Failed to create user_backend' });
  }
};
