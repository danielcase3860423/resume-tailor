export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // recommended for MongoDB
export const revalidate = 0;

import { updateProfileById, deleteProfileById } from '@/services/(endpoint)/profiles/profile.controller';
import { sendError } from '@/helpers/endpoint';
import dbConnect from '@/mongodb';

export const PUT = async (req, { params }) => {
  try {
    await dbConnect();

    const { id } = params;
    const body = await req.json();
    const updatedProfile = await updateProfileById(id, body);

    return Response.json({
      result: 'success',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('update-profile error:', err);
    return sendError(Response, { msg: 'Failed to update profile' });
  }
};

export const DELETE = async (req, { params }) => {
  try {
    await dbConnect();

    const { id } = params;
    const deletedProfile = await deleteProfileById(id);

    return Response.json({
      result: 'success',
      profile: deletedProfile
    });
  } catch (err) {
    console.error('delete-profile error:', err);
    return sendError(Response, { msg: 'Failed to delete profile' });
  }
};
