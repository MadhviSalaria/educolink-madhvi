import { Router } from 'express';
import twilio from 'twilio';
import { findUserById } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Initialize Twilio client with credentials from environment
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  }

  return twilio(accountSid, authToken);
};

// POST /api/calls/initiate - Initiate a call via Twilio Studio flow
// Both learners and wellwishers can use this endpoint
router.post('/calls/initiate', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth.user.id;
    const { learnerId, learnerPhoneNumber } = req.body || {};

    if (!learnerId || !learnerPhoneNumber) {
      return res.status(400).json({
        message: 'learnerId and learnerPhoneNumber are required.',
      });
    }

    // Verify learner exists
    const learner = await findUserById(learnerId);
    if (!learner) {
      return res.status(404).json({ message: 'Learner not found.' });
    }

    // Verify requester exists
    const requester = await findUserById(userId);
    if (!requester) {
      return res.status(404).json({ message: 'Requester not found.' });
    }

    // Allow both learners and wellwishers to make calls
    // For learners: they call their wellwisher
    // For wellwishers: they call their learners
    const isLearner = requester?.role !== 'wellwisher';

    // Learner can only call if this is their own call request
    if (isLearner && learnerId !== userId) {
      return res.status(403).json({ message: 'Learners can only call their own contacts.' });
    }

    const client = getTwilioClient();
    const flowSid = process.env.TWILIO_FLOW_SID;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!flowSid || !fromNumber) {
      return res.status(500).json({
        message: 'Twilio Studio flow configuration missing.',
      });
    }

    // Format phone number to E.164 format if needed
    const toNumber = learnerPhoneNumber.startsWith('+') 
      ? learnerPhoneNumber 
      : `+${learnerPhoneNumber}`;

    // Execute Twilio Studio flow
    const execution = await client.studio.v2
      .flows(flowSid)
      .executions.create({
        to: toNumber,
        from: fromNumber,
      });

    return res.status(200).json({
      success: true,
      message: 'Call initiated successfully.',
      executionSid: execution.sid,
      status: execution.status,
    });
  } catch (err) {
    console.error('Twilio call initiation error:', err);

    // Twilio auth error (usually wrong SID/token pair in .env)
    if (err?.code === 20003 || String(err?.message || '').toLowerCase().includes('authenticate')) {
      return res.status(500).json({
        message: 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env',
      });
    }

    // Handle specific Twilio errors
    if (String(err?.message || '').includes('Not allowed')) {
      return res.status(403).json({ message: 'Call initiation blocked. Check Twilio account configuration.' });
    }

    return next(err);
  }
});

// GET /api/calls/status/:executionSid - Check call status
router.get('/calls/status/:executionSid', requireAuth, async (req, res, next) => {
  try {
    const { executionSid } = req.params;

    if (!executionSid) {
      return res.status(400).json({ message: 'executionSid is required.' });
    }

    const client = getTwilioClient();
    const flowSid = process.env.TWILIO_FLOW_SID;

    if (!flowSid) {
      return res.status(500).json({ message: 'Twilio Studio flow configuration missing.' });
    }

    const execution = await client.studio.v2
      .flows(flowSid)
      .executions(executionSid)
      .fetch();

    return res.json({
      executionSid: execution.sid,
      status: execution.status,
      dateCreated: execution.dateCreated,
      dateUpdated: execution.dateUpdated,
    });
  } catch (err) {
    console.error('Twilio status check error:', err);
    return next(err);
  }
});

export default router;
