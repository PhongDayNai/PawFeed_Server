import { forbiddenError } from '../utils/errors.js';

export function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    const currentRole = req.user?.role || req.auth?.role;

    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return next(
        forbiddenError(
          'You do not have the required role to access this resource.',
          'INSUFFICIENT_ROLE'
        )
      );
    }

    return next();
  };
}
