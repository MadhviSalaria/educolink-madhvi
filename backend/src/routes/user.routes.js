import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upsertUser } from '../lib/db.js';
import { toPublicUser } from '../lib/publicUser.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: toPublicUser(req.auth.user),
  });
});

router.patch('/me/preferences', requireAuth, async (req, res) => {
  const { user } = req.auth;
  const { theme, focusMode } = req.body || {};

  const updated = {
    ...user,
    preferences: {
      ...user.preferences,
      ...(typeof theme === 'string' ? { theme } : {}),
      ...(typeof focusMode === 'boolean' ? { focusMode } : {}),
    },
  };

  await upsertUser(updated);

  return res.json({
    preferences: updated.preferences,
  });
});

export default router;
