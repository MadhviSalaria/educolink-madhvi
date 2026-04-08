import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '7d';

export function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'educolink_dev_secret_change_this';
  return jwt.sign(payload, secret, { expiresIn: DEFAULT_EXPIRES_IN });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'educolink_dev_secret_change_this';
  return jwt.verify(token, secret);
}
