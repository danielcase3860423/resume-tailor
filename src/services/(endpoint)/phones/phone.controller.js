import phoneNumbersModel from '@/models/phonenumbers.model';
import dbConnect from '@/mongodb';
import { normalizePhoneNumber } from '@/helpers/phone';

function buildPhonePayload(data = {}) {
  return {
    ...data,
    phoneNumber: normalizePhoneNumber(data.phoneNumber)
  };
}

// 🧩 Get all phones
export async function getPhones() {
  try {
    await dbConnect();

    const phones = await phoneNumbersModel.find({});
    return phones;
  } catch (err) {
    console.error('Error fetching phones:', err);
    throw new Error('Database error while fetching phones');
  }
}

export async function createPhone(data) {
  try {
    await dbConnect();

    const payload = buildPhonePayload(data);
    const existingPhone = await phoneNumbersModel.findOne({ phoneNumber: payload.phoneNumber }).lean();

    if (existingPhone) {
      throw new Error('Phone number already exists');
    }

    const newPhone = await phoneNumbersModel.create(payload);
    return newPhone.toObject();
  } catch (err) {
    console.error('Error creating a new phone:', err);
    throw err?.message === 'Phone number already exists' ? err : new Error('Database error while creating phone');
  }
}

// UPDATE
export async function updatePhoneById(id, updates) {
  try {
    await dbConnect();

    const payload = buildPhonePayload(updates);
    const existingPhone = await phoneNumbersModel.findOne({
      phoneNumber: payload.phoneNumber,
      _id: { $ne: id }
    }).lean();

    if (existingPhone) {
      throw new Error('Phone number already exists');
    }

    const updated = await phoneNumbersModel.findByIdAndUpdate(id, payload, { new: true }).lean();
    return updated;
  } catch (err) {
    console.error('Error updating phone:', err);
    throw err?.message === 'Phone number already exists' ? err : new Error('Database error while updating phone');
  }
}

// DELETE
export async function deletePhoneById(id) {
  try {
    await dbConnect();

    const deleted = await phoneNumbersModel.findByIdAndDelete(id).lean();
    return deleted;
  } catch (err) {
    console.error('Error deleting phone:', err);
    throw new Error('Database error while deleting phone');
  }
}
