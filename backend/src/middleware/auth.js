import { verifyToken } from '../lib/token.js';
import { findUserById } from '../lib/db.js';
import { isPremiumActive } from '../lib/subscription.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const decoded = verifyToken(token);
    const user = await findUserById(decoded.sub);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token user' });
    }

    req.auth = {
      userId: user.id,
      user,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const currentRole = req.auth?.user?.role || 'learner';
    if (!roles.includes(currentRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  };
}

export function requirePremium(req, res, next) {
  if (isPremiumActive(req.auth?.user)) {
    return next();
  }

  return res.status(402).json({
    message: 'Premium subscription required to access this feature.',
    code: 'PREMIUM_REQUIRED',
  });
}
