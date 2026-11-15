import jwt from 'jsonwebtoken';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production');
    }
    return 'dev_only_local_jwt_secret_teamsync';
  }
  return secret;
};

export const signDemoToken = ({ username, role }) => {
  return jwt.sign({ username, role }, getJwtSecret(), { expiresIn: '4h' });
};

export const verifyTokenClaims = (token) => {
  if (!token) {
    const err = new Error('Invalid or missing token');
    err.statusCode = 401;
    throw err;
  }
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    const err = new Error('Invalid or missing token');
    err.statusCode = 401;
    throw err;
  }
};

export const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyTokenClaims(token);

    if (!decoded.role || !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ message: 'RBAC: Insufficient permissions' });
    }

    req.user = { username: decoded.username, role: decoded.role };
    return next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({ message: 'Invalid or missing token' });
  }
};

export const verifySocketAction = (token, allowedRoles = ['Tech Lead']) => {
  try {
    const decoded = verifyTokenClaims(token);
    if (!decoded.role || !allowedRoles.includes(decoded.role)) {
      return { allowed: false, statusCode: 403, message: 'RBAC: Insufficient permissions' };
    }
    return { allowed: true, statusCode: 200, user: decoded };
  } catch {
    return { allowed: false, statusCode: 401, message: 'Invalid or missing token' };
  }
};
