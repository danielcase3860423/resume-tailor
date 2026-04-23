export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { createProfile } from '@/services/(endpoint)/profiles/profile.controller';
import { sendError } from '@/helpers/endpoint';
import dbConnect from '@/mongodb';

export const POST = async (req) => {
  try {
    await dbConnect();
    const body = await req.json();
    const newProfile = await createProfile(body);

    return Response.json({ result: 'success', profile: newProfile });
  } catch (err) {
    console.error('create-profile error:', err);
    return sendError(Response, { msg: 'Failed to create user_api' });
  }
};
