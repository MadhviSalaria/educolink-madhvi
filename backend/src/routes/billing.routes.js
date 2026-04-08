import { createHmac, timingSafeEqual } from 'crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { upsertUser } from '../lib/db.js';
import { toPublicUser } from '../lib/publicUser.js';
import {
  buildSubscriptionStateFromRazorpayPayment,
  findBillingPlanByKey,
  getBillingPlans,
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getSubscriptionSnapshot,
  withSubscriptionUpdate,
} from '../lib/subscription.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getRazorpayClient() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function isExpired(snapshot) {
  if (!snapshot?.currentPeriodEnd) {
    return false;
  }
  return new Date(snapshot.currentPeriodEnd).getTime() <= Date.now();
}

async function syncUserSubscription(user) {
  const snapshot = getSubscriptionSnapshot(user);
  if (!snapshot.isPremium && snapshot.status !== 'active') {
    return user;
  }

  if (!isExpired(snapshot)) {
    return user;
  }

  return upsertUser(withSubscriptionUpdate(user, {
    tier: 'free',
    status: 'expired',
  }));
}

function verifyRazorpaySignature({ orderId, paymentId, signature, keySecret }) {
  const digest = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const left = Buffer.from(digest);
  const right = Buffer.from(String(signature || ''));

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

router.get('/billing/plans', (_req, res) => {
  const plans = getBillingPlans();
  return res.json({
    configured: plans.length > 0 && Boolean(getRazorpayKeyId() && getRazorpayKeySecret()),
    keyId: getRazorpayKeyId() || null,
    plans,
  });
});

router.get('/billing/status', requireAuth, async (req, res) => {
  const syncedUser = await syncUserSubscription(req.auth.user);
  return res.json({
    user: toPublicUser(syncedUser),
    subscription: getSubscriptionSnapshot(syncedUser),
  });
});

router.post('/billing/order', requireAuth, async (req, res) => {
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return res.status(500).json({ message: 'Razorpay is not configured on the backend.' });
  }

  const user = req.auth.user;
  if ((user.role || 'learner') !== 'learner') {
    return res.status(403).json({ message: 'Premium subscription is available for learner accounts only.' });
  }

  const planKey = String(req.body?.planKey || 'premium-monthly').trim();
  const plan = findBillingPlanByKey(planKey);
  if (!plan) {
    return res.status(400).json({ message: 'Selected billing plan is not available.' });
  }

  const order = await razorpay.orders.create({
    amount: Math.round(Number(plan.amount) * 100),
    currency: plan.currency,
    receipt: `educolink_${user.id.slice(-10)}_${plan.key}`,
    notes: {
      userId: user.id,
      userEmail: user.email,
      planKey: plan.key,
    },
  });

  await upsertUser(withSubscriptionUpdate(user, {
    provider: 'razorpay',
    lastOrderId: order.id,
    razorpayOrderId: order.id,
  }));

  return res.status(201).json({
    keyId: getRazorpayKeyId(),
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    },
    plan,
    prefill: {
      name: user.name,
      email: user.email,
    },
  });
});

router.post('/billing/verify', requireAuth, async (req, res) => {
  const razorpay = getRazorpayClient();
  const keySecret = getRazorpayKeySecret();
  if (!razorpay || !keySecret) {
    return res.status(500).json({ message: 'Razorpay is not configured on the backend.' });
  }

  const planKey = String(req.body?.planKey || '').trim();
  const razorpayOrderId = String(req.body?.razorpay_order_id || req.body?.razorpayOrderId || '').trim();
  const razorpayPaymentId = String(req.body?.razorpay_payment_id || req.body?.razorpayPaymentId || '').trim();
  const razorpaySignature = String(req.body?.razorpay_signature || req.body?.razorpaySignature || '').trim();

  if (!planKey || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Payment verification payload is incomplete.' });
  }

  const plan = findBillingPlanByKey(planKey);
  if (!plan) {
    return res.status(400).json({ message: 'Selected billing plan is not available.' });
  }

  const signatureOk = verifyRazorpaySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    keySecret,
  });

  if (!signatureOk) {
    return res.status(400).json({ message: 'Payment signature verification failed.' });
  }

  const [order, payment] = await Promise.all([
    razorpay.orders.fetch(razorpayOrderId),
    razorpay.payments.fetch(razorpayPaymentId),
  ]);

  if (!order?.id || !payment?.id) {
    return res.status(404).json({ message: 'Payment details could not be verified with Razorpay.' });
  }

  if (String(order?.notes?.userId || '') && String(order.notes.userId) !== req.auth.user.id) {
    return res.status(403).json({ message: 'This payment does not belong to the current user.' });
  }

  if (Number(order.amount) !== Math.round(Number(plan.amount) * 100) || String(order.currency).toUpperCase() !== String(plan.currency).toUpperCase()) {
    return res.status(400).json({ message: 'Payment amount does not match the selected plan.' });
  }

  if (!['authorized', 'captured'].includes(String(payment.status || '').toLowerCase())) {
    return res.status(400).json({ message: 'Payment is not completed yet.' });
  }

  const updatedUser = await upsertUser(withSubscriptionUpdate(req.auth.user, {
    ...buildSubscriptionStateFromRazorpayPayment({
      plan,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      paidAt: new Date().toISOString(),
    }),
  }));

  return res.json({
    user: toPublicUser(updatedUser),
    subscription: getSubscriptionSnapshot(updatedUser),
  });
});

router.post('/billing/sync', requireAuth, async (req, res) => {
  const updatedUser = await syncUserSubscription(req.auth.user);
  return res.json({
    user: toPublicUser(updatedUser),
    subscription: getSubscriptionSnapshot(updatedUser),
  });
});

export default router;