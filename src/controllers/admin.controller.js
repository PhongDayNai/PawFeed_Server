import { sendSuccess } from '../utils/response.js';

export async function adminPing(req, res) {
  return sendSuccess(res, {
    message: 'Admin role middleware works.',
    user: req.user
  });
}
