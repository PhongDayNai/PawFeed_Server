import { getUserDashboard } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/response.js';

export async function getDashboard(req, res) {
  const dashboard = await getUserDashboard(req.user.id);
  return sendSuccess(res, dashboard);
}
