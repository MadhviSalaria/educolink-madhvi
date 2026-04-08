import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { findUserByEmail, listUsers, upsertUser } from '../lib/db.js';
import { toPublicUser } from '../lib/publicUser.js';
import { signToken } from '../lib/token.js';

const router = Router();

const LEARNER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateLearnerCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += LEARNER_CODE_CHARS[Math.floor(Math.random() * LEARNER_CODE_CHARS.length)];
  }
  return code;
}

function issueAuthResponse(user) {
  const token = signToken({ sub: user.id, email: user.email });
  return {
    user: toPublicUser(user),
    token,
  };
}

async function findLearnerByCode(codeInput) {
  const code = String(codeInput || '').trim().toUpperCase();
  if (!code) return null;
  const allUsers = await listUsers();
  return allUsers.find((u) => u.learnerCode === code && (u.role || 'learner') === 'learner') || null;
}

async function generateUniqueLearnerCode() {
  const allUsers = await listUsers();
  const usedCodes = new Set(allUsers.map((u) => u.learnerCode).filter(Boolean));

  let code = generateLearnerCode();
  let attempts = 0;
  while (usedCodes.has(code) && attempts < 30) {
    code = generateLearnerCode();
    attempts += 1;
  }
  return code;
}

router.post('/register', async (req, res) => {
  const { fullName, email, password, role, learnerCode: wellwisherLearnerCode } = req.body || {};
  const normalizedRole = String(role || 'learner').trim().toLowerCase();

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email, and password are required' });
  }

  if (!['learner', 'wellwisher'].includes(normalizedRole)) {
    return res.status(400).json({ message: 'Role must be learner or wellwisher' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  let linkedLearner = null;
  if (normalizedRole === 'wellwisher') {
    if (!String(wellwisherLearnerCode || '').trim()) {
      return res.status(400).json({ message: 'Learner code is required for wellwisher signup.' });
    }
    linkedLearner = await findLearnerByCode(wellwisherLearnerCode);
    if (!linkedLearner) {
      return res.status(404).json({ message: 'Invalid learner code. Please check and try again.' });
    }
    if (linkedLearner.linkedWellwisherId) {
      return res.status(409).json({ message: 'This learner is already linked to another wellwisher.' });
    }
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);

  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const learnerCode = normalizedRole === 'learner' ? await generateUniqueLearnerCode() : undefined;

  let user = {
    id: `usr_${randomUUID()}`,
    name: String(fullName).trim(),
    email: normalizedEmail,
    role: normalizedRole,
    learnerCode,
    linkedLearnerIds: normalizedRole === 'wellwisher' ? [] : undefined,
    linkedWellwisherId: normalizedRole === 'learner' ? null : undefined,
    passwordHash,
    authProvider: 'local',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      focusMode: false,
    },
  };

  if (normalizedRole === 'wellwisher' && linkedLearner) {
    user.linkedLearnerIds = [linkedLearner.id];
  }

  await upsertUser(user);

  if (normalizedRole === 'wellwisher' && linkedLearner) {
    await upsertUser({ ...linkedLearner, linkedWellwisherId: user.id });
  }

  return res.json(issueAuthResponse(user));
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordOk = await bcrypt.compare(String(password), user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (role && (user.role || 'learner') !== String(role).trim().toLowerCase()) {
    return res.status(403).json({ message: 'This account does not match the selected dashboard' });
  }

  let authUser = user;
  if ((authUser.role || 'learner') === 'learner' && !authUser.learnerCode) {
    authUser = { ...authUser, learnerCode: await generateUniqueLearnerCode() };
    await upsertUser(authUser);
  }

  return res.json(issueAuthResponse(authUser));
});

router.post('/google', async (req, res) => {
  const { token, role, learnerCode: wellwisherLearnerCode } = req.body || {};
  const normalizedRole = String(role || 'learner').trim().toLowerCase();

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Google token is required' });
  }

  if (!['learner', 'wellwisher'].includes(normalizedRole)) {
    return res.status(400).json({ message: 'Role must be learner or wellwisher' });
  }

  let payload;
  try {
    const segments = token.split('.');
    payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf-8'));
  } catch {
    payload = {};
  }

  const normalizedEmail = String(payload.email || `google_user_${token.slice(0, 8)}@educolink.local`).toLowerCase().trim();
  const name = String(payload.name || 'Google User').trim();

  let user = await findUserByEmail(normalizedEmail);
  let linkedLearner = null;

  // Only new wellwisher Google signup requires learner code.
  if (!user && normalizedRole === 'wellwisher') {
    if (!String(wellwisherLearnerCode || '').trim()) {
      return res.status(400).json({ message: 'Learner code is required for wellwisher signup.' });
    }
    linkedLearner = await findLearnerByCode(wellwisherLearnerCode);
    if (!linkedLearner) {
      return res.status(404).json({ message: 'Invalid learner code. Please check and try again.' });
    }
    if (linkedLearner.linkedWellwisherId) {
      return res.status(409).json({ message: 'This learner is already linked to another wellwisher.' });
    }
  }

  if (!user) {
    const learnerCode = normalizedRole === 'learner' ? await generateUniqueLearnerCode() : undefined;
    user = {
      id: `usr_${randomUUID()}`,
      name,
      email: normalizedEmail,
      role: normalizedRole,
      learnerCode,
      linkedLearnerIds: normalizedRole === 'wellwisher' ? [] : undefined,
      linkedWellwisherId: normalizedRole === 'learner' ? null : undefined,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        focusMode: false,
      },
    };
  } else {
    user = {
      ...user,
      name,
      authProvider: 'google',
    };
  }

  if ((user.role || normalizedRole) !== normalizedRole) {
    return res.status(403).json({ message: 'This Google account is already linked to another dashboard type' });
  }

  if ((user.role || 'learner') === 'learner' && !user.learnerCode) {
    user.learnerCode = await generateUniqueLearnerCode();
  }

  if (!user.linkedLearnerIds || !Array.isArray(user.linkedLearnerIds)) {
    user.linkedLearnerIds = [];
  }
  if (linkedLearner && !user.linkedLearnerIds.includes(linkedLearner.id)) {
    user.linkedLearnerIds = [linkedLearner.id];
  }

  await upsertUser(user);

  if (linkedLearner) {
    await upsertUser({ ...linkedLearner, linkedWellwisherId: user.id });
  }

  return res.json(issueAuthResponse(user));
});

export default router;
