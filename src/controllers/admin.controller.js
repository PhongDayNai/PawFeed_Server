import { successResponse } from '../utils/response.js';

export async function adminPing(req, res) {
  return res.json(
    successResponse({
      message: 'Admin role middleware works.',
      user: req.user
    })
  );
}
