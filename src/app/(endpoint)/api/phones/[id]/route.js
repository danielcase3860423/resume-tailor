export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // recommended for MongoDB
export const revalidate = 0;

import { updatePhoneById, deletePhoneById } from '@/services/(endpoint)/phones/phone.controller';
import { sendError } from '@/helpers/endpoint';
import dbConnect from '@/mongodb';

export const PUT = async (req, { params }) => {
  try {
    await dbConnect();

    const { id } = params;
    const body = await req.json();
    const updatedPhone = await updatePhoneById(id, body);

    return Response.json({
      result: 'success',
      phone: updatedPhone
    });
  } catch (err) {
    console.error('update-phone error:', err);
    return sendError(Response, { msg: 'Failed to update phone' });
  }
};

export const DELETE = async (req, { params }) => {
  try {
    await dbConnect();

    const { id } = params;
    const deletedPhone = await deletePhoneById(id);

    return Response.json({
      result: 'success',
      phone: deletedPhone
    });
  } catch (err) {
    console.error('delete-phone error:', err);
    return sendError(Response, { msg: 'Failed to delete phone' });
  }
};
