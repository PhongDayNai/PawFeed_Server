import { updateUserProfile, toPublicUser } from '../services/user.service.js';
import { successResponse } from '../utils/response.js';

export async function updateProfile(req, res) {
  const updatedUser = await updateUserProfile(req.user.id, {
    fullName: req.body.fullName
  });

  return res.json(successResponse({ user: toPublicUser(updatedUser) }));
}
