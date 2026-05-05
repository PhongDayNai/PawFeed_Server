import { getAdminDashboard } from '../services/adminDashboard.service.js';
import { sendSuccess } from '../utils/response.js';

export async function adminDashboard(req, res) {
  const dashboard = await getAdminDashboard();
  return sendSuccess(res, { dashboard });
}
