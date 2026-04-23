export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { updateUserById, deleteUserById } from '@/services/(endpoint)/users/user.controller';
import { sendError } from '@/helpers/endpoint';

export const PUT = async (req, { params }) => {
  try {
    const { id } = params;
    const body = await req.json();
    const updatedUser = await updateUserById(id, body);

    return Response.json({
      result: 'success',
      user: updatedUser
    });
  } catch (err) {
    console.error('update-user error:', err);
    return sendError(Response, { msg: 'Failed to update user' });
  }
};

export const DELETE = async (req, { params }) => {
  try {
    const { id } = params;
    const deletedUser = await deleteUserById(id);

    return Response.json({
      result: 'success',
      user: deletedUser
    });
  } catch (err) {
    console.error('delete-user error:', err);
    return sendError(Response, { msg: 'Failed to delete user' });
  }
};
