import { randomUUID } from 'crypto';
import { Router } from 'express';
import { findUserByEmail, findUserById, listSosRequests, listTaskSubmissions, listTasks, listUsers, upsertTask, upsertUser } from '../lib/db.js';
import { toPublicUser } from '../lib/publicUser.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function sanitizeLearner(user) {
  const preferences = user.preferences || {};
  const managedFocus = preferences.managedFocus || {};
  const learnerAnalytics = preferences.learnerAnalytics || {};
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'learner',
    linkedWellwisherId: user.linkedWellwisherId || null,
    focus: {
      status: managedFocus.status || 'idle',
      durationMinutes: Number(managedFocus.durationMinutes) || 45,
      pin: managedFocus.pin || null,
      message: managedFocus.message || '',
      updatedAt: managedFocus.updatedAt || null,
    },
    analytics: {
      totalFocusMinutes: Number(learnerAnalytics.totalFocusMinutes) || 0,
      completedTaskCount: Number(learnerAnalytics.completedTaskCount) || 0,
      sosTodayCount: Number(learnerAnalytics.sosTodayCount) || 0,
      lastActiveAt: learnerAnalytics.lastActiveAt || null,
    },
  };
}

function ensureWellwisherLinks(user) {
  return Array.isArray(user.linkedLearnerIds) ? user.linkedLearnerIds : [];
}

router.get('/wellwisher/dashboard', requireAuth, requireRole('wellwisher'), async (req, res) => {
  const wellwisher = req.auth.user;
  const linkedLearnerIds = ensureWellwisherLinks(wellwisher);
  const allUsers = await listUsers();
  const linkedLearners = allUsers.filter((user) => linkedLearnerIds.includes(user.id) && (user.role || 'learner') === 'learner');
  const tasks = await listTasks();
  const submissions = await listTaskSubmissions();
  const sosRequests = await listSosRequests();

  return res.json({
    wellwisher: {
      ...toPublicUser(wellwisher),
      linkedLearnerIds,
    },
    learners: linkedLearners.map((learner) => ({
      ...sanitizeLearner(learner),
      tasks: tasks.filter((task) => task.learnerId === learner.id),
      submissions: submissions.filter((entry) => entry.learnerId === learner.id),
      sosRequests: sosRequests.filter((entry) => entry.learnerId === learner.id),
    })),
  });
});

router.post('/wellwisher/link-learner', requireAuth, requireRole('wellwisher'), async (req, res) => {
  const wellwisher = req.auth.user;
  const { learnerEmail, learnerCode } = req.body || {};

  let learner = null;

  // --- find by permanent learner code ---
  if (learnerCode && !learnerEmail) {
    const code = String(learnerCode).trim().toUpperCase();
    const allUsers = await listUsers();
    const candidate = allUsers.find(
      (u) => u.learnerCode === code && (u.role || 'learner') === 'learner',
    );
    if (!candidate) {
      return res.status(404).json({ message: 'Learner code not found. Check the code and try again.' });
    }
    learner = candidate;
  } else {
    // --- find by email ---
    const normalizedEmail = String(learnerEmail || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Provide a learner email or learner code.' });
    }
    learner = await findUserByEmail(normalizedEmail);
    if (!learner || (learner.role || 'learner') !== 'learner') {
      return res.status(404).json({ message: 'Learner account not found.' });
    }
  }

  const learnerLinkedWellwisherId = learner.linkedWellwisherId || null;
  if (learnerLinkedWellwisherId && learnerLinkedWellwisherId !== wellwisher.id) {
    return res.status(409).json({ message: 'This learner is already linked to another wellwisher.' });
  }

  const linkedLearnerIds = ensureWellwisherLinks(wellwisher);
  if (!linkedLearnerIds.includes(learner.id)) {
    linkedLearnerIds.push(learner.id);
  }

  const updatedWellwisher = { ...wellwisher, linkedLearnerIds };
  const updatedLearner = {
    ...learner,
    linkedWellwisherId: wellwisher.id,
  };

  await upsertUser(updatedWellwisher);
  await upsertUser(updatedLearner);

  return res.status(201).json({ learner: sanitizeLearner(updatedLearner) });
});

router.post('/wellwisher/tasks', requireAuth, requireRole('wellwisher'), async (req, res) => {
  const wellwisher = req.auth.user;
  const { learnerId, title, details, dueAt, proofRequired, durationMinutes } = req.body || {};
  const linkedLearnerIds = ensureWellwisherLinks(wellwisher);
  if (!linkedLearnerIds.includes(learnerId)) {
    return res.status(403).json({ message: 'You can only assign tasks to linked learners.' });
  }

  if (!String(title || '').trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  const learner = await findUserById(learnerId);
  if (!learner) {
    return res.status(404).json({ message: 'Learner not found.' });
  }

  const task = {
    id: `task_${randomUUID()}`,
    learnerId,
    assignedBy: wellwisher.id,
    title: String(title).trim(),
    details: String(details || '').trim(),
    dueAt: dueAt || null,
    proofRequired: Boolean(proofRequired),
    durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : null,
    status: 'assigned',
    createdAt: new Date().toISOString(),
  };

  await upsertTask(task);
  return res.status(201).json({ task });
});

router.post('/wellwisher/focus-control', requireAuth, requireRole('wellwisher'), async (req, res) => {
  const wellwisher = req.auth.user;
  const { learnerId, status, durationMinutes, pin, message } = req.body || {};
  const linkedLearnerIds = ensureWellwisherLinks(wellwisher);
  if (!linkedLearnerIds.includes(learnerId)) {
    return res.status(403).json({ message: 'You can only manage linked learners.' });
  }

  const learner = await findUserById(learnerId);
  if (!learner) {
    return res.status(404).json({ message: 'Learner not found.' });
  }

  const normalizedStatus = ['idle', 'active', 'paused', 'stopped'].includes(String(status || 'idle'))
    ? String(status || 'idle')
    : 'idle';

  const updatedLearner = {
    ...learner,
    preferences: {
      ...(learner.preferences || {}),
      managedFocus: {
        ...((learner.preferences || {}).managedFocus || {}),
        status: normalizedStatus,
        durationMinutes: Number(durationMinutes) || Number((learner.preferences || {}).managedFocus?.durationMinutes) || 45,
        pin: String(pin || '').trim() || (learner.preferences || {}).managedFocus?.pin || null,
        message: String(message || '').trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: wellwisher.id,
        startedAt: normalizedStatus === 'active' ? new Date().toISOString() : (learner.preferences || {}).managedFocus?.startedAt || null,
      },
    },
  };

  await upsertUser(updatedLearner);

  return res.json({ learner: sanitizeLearner(updatedLearner) });
});

router.patch('/wellwisher/tasks/:taskId', requireAuth, requireRole('wellwisher'), async (req, res) => {
  const wellwisher = req.auth.user;
  const { taskId } = req.params;
  const { status } = req.body || {};
  const tasks = await listTasks();
  const task = tasks.find((entry) => entry.id === taskId && entry.assignedBy === wellwisher.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const normalizedStatus = ['assigned', 'submitted', 'review-needed', 'approved', 'rejected'].includes(String(status || 'assigned'))
    ? String(status)
    : task.status;

  const updatedTask = {
    ...task,
    status: normalizedStatus,
  };
  await upsertTask(updatedTask);

  if (normalizedStatus === 'approved') {
    const learner = await findUserById(task.learnerId);
    if (learner) {
      const currentCompleted = Number(learner.preferences?.learnerAnalytics?.completedTaskCount) || 0;
      await upsertUser({
        ...learner,
        preferences: {
          ...(learner.preferences || {}),
          learnerAnalytics: {
            ...((learner.preferences || {}).learnerAnalytics || {}),
            completedTaskCount: currentCompleted + 1,
            lastActiveAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  return res.json({ task: updatedTask });
});

export default router;