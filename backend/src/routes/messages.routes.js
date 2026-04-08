import { randomUUID } from 'crypto';
import { Router } from 'express';
import { clearConversationMessages, createMessage, findUserById, listMessages } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/messages/:partnerId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth.user.id;
    const partnerId = String(req.params.partnerId || '').trim();
    if (!partnerId) {
      return res.status(400).json({ message: 'partnerId is required.' });
    }

    const partner = await findUserById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    const allMessages = await listMessages();
    const conversation = allMessages
      .filter(
        (m) =>
          (m.senderId === userId && m.receiverId === partnerId) ||
          (m.senderId === partnerId && m.receiverId === userId),
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.json({
      messages: conversation,
      partner: { id: partner.id, name: partner.name, role: partner.role || 'learner' },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/messages', requireAuth, async (req, res, next) => {
  try {
    const senderId = req.auth.user.id;
    const { receiverId, text } = req.body || {};

    if (!String(receiverId || '').trim()) {
      return res.status(400).json({ message: 'receiverId is required.' });
    }

    const trimmedText = String(text || '').trim();
    if (!trimmedText) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const receiver = await findUserById(String(receiverId).trim());
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    const msg = await createMessage({
      id: `msg_${randomUUID()}`,
      senderId,
      receiverId: String(receiverId).trim(),
      text: trimmedText.slice(0, 1000),
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ message: msg });
  } catch (err) {
    return next(err);
  }
});

router.delete('/messages/:partnerId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth.user.id;
    const partnerId = String(req.params.partnerId || '').trim();
    if (!partnerId) {
      return res.status(400).json({ message: 'partnerId is required.' });
    }

    const partner = await findUserById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    const result = await clearConversationMessages(userId, partnerId);
    return res.json({
      message: 'Conversation cleared successfully.',
      removedCount: result.removedCount,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
