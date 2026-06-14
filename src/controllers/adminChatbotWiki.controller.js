import { sendPaginated, sendSuccess } from '../utils/response.js';
import {
  listWikiEntries,
  getWikiEntry,
  createWikiEntry,
  updateWikiEntry,
  deleteWikiEntry
} from '../services/chatbot.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    actorRole: req.user?.role || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function listWiki(req, res) {
  const result = await listWikiEntries(req.query);
  return sendPaginated(res, result.entries, result.meta, 'entries');
}

export async function getWiki(req, res) {
  const entry = await getWikiEntry(req.params.id);
  return sendSuccess(res, { entry });
}

export async function createWiki(req, res) {
  const entry = await createWikiEntry(req.body, requestContext(req));
  return sendSuccess(res, { entry });
}

export async function updateWiki(req, res) {
  const entry = await updateWikiEntry(req.params.id, req.body, requestContext(req));
  return sendSuccess(res, { entry });
}

export async function deleteWiki(req, res) {
  await deleteWikiEntry(req.params.id, requestContext(req));
  return sendSuccess(res, { success: true });
}
