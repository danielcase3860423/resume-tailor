export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { createPhone } from '@/services/(endpoint)/phones/phone.controller';
import { sendError } from '@/helpers/endpoint';
import dbConnect from '@/mongodb';

export const POST = async (req) => {
  try {
    await dbConnect();
    const body = await req.json();
    const newPhone = await createPhone(body);

    return Response.json({ result: 'success', phone: newPhone });
  } catch (err) {
    console.error('create-phone error:', err);
    return sendError(Response, { msg: 'Failed to create phone' });
  }
};
