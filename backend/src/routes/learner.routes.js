import { randomUUID } from 'crypto';
import { Router } from 'express';
import { createSosRequest, createTaskSubmission, findTaskById, listSosRequests, listTaskSubmissions, listTasks, listUsers, upsertTask, upsertUser } from '../lib/db.js';
import { toPublicUser } from '../lib/publicUser.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const LEARNER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateLearnerCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += LEARNER_CODE_CHARS[Math.floor(Math.random() * LEARNER_CODE_CHARS.length)];
  }
  return code;
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

function getLearnerPreferences(user) {
  const preferences = user.preferences || {};
  const managedFocus = preferences.managedFocus || {};
  const learnerAnalytics = preferences.learnerAnalytics || {};
  return {
    ...preferences,
    managedFocus: {
      status: managedFocus.status || 'idle',
      durationMinutes: Number(managedFocus.durationMinutes) || 45,
      pin: managedFocus.pin || null,
      startedAt: managedFocus.startedAt || null,
      updatedAt: managedFocus.updatedAt || null,
      updatedBy: managedFocus.updatedBy || null,
      message: managedFocus.message || '',
    },
    learnerAnalytics: {
      totalFocusMinutes: Number(learnerAnalytics.totalFocusMinutes) || 0,
      completedTaskCount: Number(learnerAnalytics.completedTaskCount) || 0,
      sosTodayCount: Number(learnerAnalytics.sosTodayCount) || 0,
      lastActiveAt: learnerAnalytics.lastActiveAt || null,
    },
  };
}

function sanitizeTask(task) {
  return {
    id: task.id,
    learnerId: task.learnerId,
    assignedBy: task.assignedBy,
    title: task.title,
    details: task.details || '',
    dueAt: task.dueAt || null,
    status: task.status || 'assigned',
    proofRequired: Boolean(task.proofRequired),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt,
  };
}

function sanitizeSubmission(submission) {
  return {
    id: submission.id,
    taskId: submission.taskId,
    learnerId: submission.learnerId,
    notes: submission.notes || '',
    proofFiles: Array.isArray(submission.proofFiles) ? submission.proofFiles : [],
    aiReview: submission.aiReview || null,
    submittedAt: submission.submittedAt,
  };
}

function buildAiReview(task, notes, proofFiles) {
  const taskWords = String(task?.title || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const noteText = String(notes || '').toLowerCase();
  const matchedWords = taskWords.filter((word) => noteText.includes(word));
  const coverage = taskWords.length ? matchedWords.length / taskWords.length : 0;
  const proofScore = Math.min(1, (Array.isArray(proofFiles) ? proofFiles.length : 0) / 2);
  const score = Math.round((coverage * 70 + proofScore * 30) * 100) / 100;
  const verdict = score >= 65 ? 'likely-complete' : score >= 35 ? 'needs-review' : 'incomplete';

  return {
    score,
    verdict,
    summary:
      verdict === 'likely-complete'
        ? 'The submission includes task-aligned notes and enough proof to mark it as likely complete.'
        : verdict === 'needs-review'
          ? 'The submission has partial alignment. A wellwisher should review the proof before approving it.'
          : 'The submission does not contain enough task-specific evidence yet.',
    matchedKeywords: matchedWords.slice(0, 8),
  };
}

router.get('/learner/dashboard', requireAuth, requireRole('learner'), async (req, res) => {
  let learner = req.auth.user;
  if (!learner.learnerCode) {
    learner = {
      ...learner,
      learnerCode: await generateUniqueLearnerCode(),
    };
    await upsertUser(learner);
  }
  const tasks = (await listTasks())
    .filter((task) => task.learnerId === learner.id)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  const submissions = (await listTaskSubmissions()).filter((entry) => entry.learnerId === learner.id);
  const sosRequests = (await listSosRequests()).filter((entry) => entry.learnerId === learner.id);
  const preferences = getLearnerPreferences(learner);

  return res.json({
    learner: {
      ...toPublicUser(learner),
      preferences,
    },
    tasks: tasks.map(sanitizeTask),
    submissions: submissions.map(sanitizeSubmission),
    sosRequests,
  });
});

router.post('/learner/ensure-code', requireAuth, requireRole('learner'), async (req, res) => {
  let learner = req.auth.user;
  if (!learner.learnerCode) {
    learner = {
      ...learner,
      learnerCode: await generateUniqueLearnerCode(),
    };
    await upsertUser(learner);
  }

  return res.json({
    learnerCode: learner.learnerCode,
    learner: {
      ...toPublicUser(learner),
      preferences: getLearnerPreferences(learner),
    },
  });
});

router.post('/learner/focus-state', requireAuth, requireRole('learner'), async (req, res) => {
  const learner = req.auth.user;
  const { totalFocusMinutes, lastActiveAt } = req.body || {};
  const preferences = getLearnerPreferences(learner);
  const nextPreferences = {
    ...preferences,
    learnerAnalytics: {
      ...preferences.learnerAnalytics,
      ...(Number.isFinite(Number(totalFocusMinutes)) ? { totalFocusMinutes: Math.max(0, Number(totalFocusMinutes)) } : {}),
      lastActiveAt: lastActiveAt || new Date().toISOString(),
    },
  };

  const updatedUser = {
    ...learner,
    preferences: nextPreferences,
  };

  await upsertUser(updatedUser);

  return res.json({
    preferences: nextPreferences,
  });
});

router.post('/learner/sos', requireAuth, requireRole('learner'), async (req, res) => {
  const learner = req.auth.user;
  const { reason } = req.body || {};
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    return res.status(400).json({ message: 'Please add a reason for the SOS request.' });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRequests = (await listSosRequests()).filter(
    (entry) => entry.learnerId === learner.id && String(entry.createdAt || '').slice(0, 10) === todayKey,
  );

  if (todayRequests.length >= 3) {
    return res.status(400).json({ message: 'Daily SOS limit reached.' });
  }

  const entry = {
    id: `sos_${randomUUID()}`,
    learnerId: learner.id,
    wellwisherId: learner.linkedWellwisherId || null,
    reason: trimmedReason,
    createdAt: new Date().toISOString(),
    status: 'open',
  };

  await createSosRequest(entry);

  const preferences = getLearnerPreferences(learner);
  const updatedUser = {
    ...learner,
    preferences: {
      ...preferences,
      learnerAnalytics: {
        ...preferences.learnerAnalytics,
        sosTodayCount: todayRequests.length + 1,
        lastActiveAt: new Date().toISOString(),
      },
    },
  };
  await upsertUser(updatedUser);

  return res.status(201).json({ request: entry, remainingToday: 2 - todayRequests.length });
});

router.post('/learner/tasks/:taskId/submissions', requireAuth, requireRole('learner'), async (req, res) => {
  const learner = req.auth.user;
  const { taskId } = req.params;
  const { notes, proofFiles } = req.body || {};
  const task = await findTaskById(taskId);

  if (!task || task.learnerId !== learner.id) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const normalizedNotes = String(notes || '').trim();
  const normalizedProofFiles = Array.isArray(proofFiles)
    ? proofFiles.filter((item) => item && typeof item.url === 'string')
    : [];

  if (!normalizedNotes && !normalizedProofFiles.length) {
    return res.status(400).json({ message: 'Add notes or at least one proof file.' });
  }

  const aiReview = buildAiReview(task, normalizedNotes, normalizedProofFiles);
  const submission = {
    id: `sub_${randomUUID()}`,
    taskId: task.id,
    learnerId: learner.id,
    notes: normalizedNotes,
    proofFiles: normalizedProofFiles,
    aiReview,
    submittedAt: new Date().toISOString(),
  };

  await createTaskSubmission(submission);
  await upsertTask({
    ...task,
    status: aiReview.verdict === 'likely-complete' ? 'submitted' : 'review-needed',
    lastSubmissionId: submission.id,
  });

  return res.status(201).json({ submission: sanitizeSubmission(submission), taskStatus: aiReview.verdict });
});

export default router;