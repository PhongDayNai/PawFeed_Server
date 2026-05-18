/**
 * Legacy redirect middleware
 * Redirects /api/* → /v1/* for backward compatibility
 */
export function redirectLegacy(req, res, next) {
  if (req.path.startsWith('/api/')) {
    const redirectPath = req.path.replace('/api', '/v1');
    const queryString = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, redirectPath + queryString);
  }
  next();
}