import { updateUserProfile, toPublicUser } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

export async function updateProfile(req, res) {
  const updatedUser = await updateUserProfile(req.user.id, {
    fullName: req.body.fullName
  });

  return sendSuccess(res, { user: toPublicUser(updatedUser) });
}
