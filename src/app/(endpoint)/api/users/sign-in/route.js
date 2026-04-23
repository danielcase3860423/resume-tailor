export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { sendError } from '@/helpers/endpoint';
import bcrypt from 'bcryptjs/dist/bcrypt';
import { generateToken, getUserByEmail, verifyPassword } from '@/services/(endpoint)/users/user.controller';
import { randomUUID } from '@/helpers/common';
import dbConnect from '@/mongodb';
import { ERROR_SUCCESS } from '@/config/constants';

export const POST = async (req) => {
  try {
    await dbConnect();
    const { email, password } = await req.json();
    const users = await getUserByEmail(email);
    const user = users[0];
    if (user) {
      if (user.status !== 'ACTIVE') {
        return Response.json({
          status: 'failed',
          msg: 'This account is inactive'
        })
      }
      if (await verifyPassword(user.password, password)) {
        const tokenId = randomUUID();
        const token = generateToken(user, tokenId);
        const data = {
          token,
          username: user.username,
          email: user.email,
          role: user.role,
          profiles: user.profiles,
          _id: user._id
        };
        return Response.json({ valid: true, result: ERROR_SUCCESS, data });
      } else {
        return Response.json({
          status: 'failed',
          msg: 'incorrect password'
        })
      }
    } else {
      return sendError(Response, { msg: 'The email does not exist', code: 401 });
    }
  } catch (e) {
    console.error('Sign-in failed:', e);
    return sendError(Response, { msg: 'Sign-in failed due to a server error', code: 500 });
  }
};
