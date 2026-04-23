import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { TOKEN_SECRET } from '@/config/constants';
import userModel from '@/models/user.model';
import dbConnect from '@/mongodb';

export function generateToken(user, tokenId) {
  let tokenInfo;
  if (user) {
    tokenInfo = { uuid: user._id };
    tokenInfo.tokenId = tokenId;

    if (user.user_type) {
      tokenInfo.role = user.user_type;
    }

    if (user.full_name) {
      tokenInfo.username = user.user_first_name;
    }

    if (user.user_first_name) {
      tokenInfo.user_first_name = user.user_first_name;
    }
    if (user.user_last_name) {
      tokenInfo.user_last_name = user.user_last_name;
    }

    try {
      tokenInfo.user_picture = user.user_picture;
    } catch {
      tokenInfo.user_picture = '';
    }

    try {
      tokenInfo.verified = user.user_email_verified;
    } catch {
      tokenInfo.verified = false;
    }
    if (user.user_type) {
      tokenInfo.roleTxt = user.user_type;
    }
    if (user.user_email) {
      tokenInfo.email = user.user_email;
    }
    if (user.user_phone_no) {
      tokenInfo.user_phone_no = user.user_phone_no;
    }
  } else {
    tokenInfo = { uuid: null };
  }
  return jwt.sign(tokenInfo, TOKEN_SECRET);
}

export async function getUserByEmail(email) {
  await dbConnect();
  return await userModel.find({ email });
}

export async function getUserById(userId) {
  await dbConnect();
  return await userModel.findById(userId);
}

export async function getActiveUserById(userId) {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('This account is inactive');
  }

  return user;
}

export async function emailExists(email) {
  await dbConnect();
  return (await getUserByEmail(email)) !== null;
}

export function createHashedPassword(plainTextPassword) {
  return new Promise(async (resolve, reject) => {
    await bcrypt
      .genSalt(10)
      .then(async (salt) => {
        await bcrypt
          .hash(plainTextPassword, salt)
          .then(async (hashedPassword) => {
            resolve(hashedPassword);
          })
          .catch((e) => {
            reject(e);
          });
      })
      .catch((e) => {
        reject(e);
      });
  });
}

export async function verifyPassword(hashedPassword, plainTextPassword) {
  if (hashedPassword.startsWith('$2')) {
    // Already bcrypt
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  // Old MD5 check
  const md5Hash = crypto.createHash('md5').update(plainTextPassword).digest('hex');
  const match = md5Hash === hashedPassword;

  if (match) {
    // Upgrade hash to bcrypt here
    const newHash = await bcrypt.hash(plainTextPassword, 10);
    console.log('✅ Migrate this user hash to bcrypt:', newHash);
  }

  return match;
}

// 🧩 Get all users
export async function getUsers() {
  try {
    await dbConnect();

    // exclude password field for security
    const users = await userModel.find({}, { password: 0 }).lean();
    return users;
  } catch (err) {
    console.error('Error fetching users:', err);
    throw new Error('Database error while fetching users');
  }
}

export async function getUsersByRole() {
  try {
    await dbConnect();

    // exclude password field for security
    const users = await userModel.find({ role: 'CALLER'}, { password: 0 }).lean();
    return users;
  } catch (err) {
    console.error('Error fetching users:', err);
    throw new Error('Database error while fetching users');
  }
}

export async function createUser(data) {
  try {
    await dbConnect();
    const hashPwd = await createHashedPassword(data.password);
    const userData = {
      ...data,
      password: hashPwd
    }
    const newUser = await userModel.create(userData);
    return newUser.toObject();
  } catch (err) {
    console.error('Error creating user:', err);
    throw new Error('Database error while creating user');
  }
}

// UPDATE
export async function updateUserById(id, updates) {
  try {
    await dbConnect();

    const updated = await userModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return updated;
  } catch (err) {
    console.error('Error updating user:', err);
    throw new Error('Database error while updating user');
  }
}

// DELETE
export async function deleteUserById(id) {
  try {
    await dbConnect();

    const deleted = await userModel.findByIdAndDelete(id).lean();
    return deleted;
  } catch (err) {
    console.error('Error deleting user:', err);
    throw new Error('Database error while deleting user');
  }
}
