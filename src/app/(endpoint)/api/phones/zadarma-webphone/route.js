import { sendError } from '@/helpers/endpoint';
import phonenumbersModel from '@/models/phonenumbers.model';
import dbConnect from '@/mongodb';
import { getActiveUserById } from '@/services/(endpoint)/users/user.controller';
const { api } = require('zadarma');

export const POST = async (req) => {
  try {
    await dbConnect();

    const { userId } = await req.json();
    await getActiveUserById(userId);
    const phone = await phonenumbersModel.findOne({ associatedUserId: userId });
    const data = await api({
      api_method: '/v1/webrtc/get_key',
      api_user_key: process.env.ZADARMA_API_KEY,
      api_secret_key: process.env.ZADARMA_API_SECRET,
      params: {
        sip: phone.sipUsername
      }
    });
    return Response.json({
      result: 'success',
      response: { key: data?.key, login: phone.sipUsername }
    });
  } catch (err) {
    console.error('get-webrtc key error:', err);
    return sendError(Response, { msg: 'Failed to webrtc error' });
  }
};
