const ACTIVE_PREMIUM_STATUSES = new Set(['active', 'captured']);

function parseAmount(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function addDays(dateInput, days) {
  const base = new Date(dateInput || Date.now());
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

export function getBillingPlans() {
  return [
    {
      key: 'premium-monthly',
      tier: 'premium',
      label: 'Premium Monthly',
      description: 'Full access to all learner modules and AI-powered study tools.',
      interval: 'month',
      currency: (process.env.RAZORPAY_CURRENCY || 'INR').toUpperCase(),
      amount: parseAmount(process.env.RAZORPAY_PREMIUM_MONTHLY_AMOUNT, 199),
      durationDays: 30,
    },
    {
      key: 'premium-yearly',
      tier: 'premium',
      label: 'Premium Yearly',
      description: 'Annual premium access with the best effective price.',
      interval: 'year',
      currency: (process.env.RAZORPAY_CURRENCY || 'INR').toUpperCase(),
      amount: parseAmount(process.env.RAZORPAY_PREMIUM_YEARLY_AMOUNT, 1999),
      durationDays: 365,
    },
  ];
}

export function findBillingPlanByKey(planKey) {
  return getBillingPlans().find((plan) => plan.key === planKey) || null;
}

export function getSubscriptionSnapshot(user = {}) {
  const raw = user.subscription || {};
  const tier = String(raw.tier || 'free').trim().toLowerCase() || 'free';
  const status = String(raw.status || (tier === 'free' ? 'free' : 'inactive')).trim().toLowerCase();
  const currentPeriodEnd = raw.currentPeriodEnd || null;
  const stillValid = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() > Date.now() : ACTIVE_PREMIUM_STATUSES.has(status);
  const isPremium = tier === 'premium' && ACTIVE_PREMIUM_STATUSES.has(status) && stillValid;

  return {
    tier,
    status,
    isPremium,
    planKey: raw.planKey || null,
    planLabel: raw.planLabel || null,
    interval: raw.interval || null,
    currency: raw.currency || null,
    amount: Number.isFinite(Number(raw.amount)) ? Number(raw.amount) : null,
    provider: raw.provider || null,
    currentPeriodEnd: raw.currentPeriodEnd || null,
    purchasedAt: raw.purchasedAt || null,
    razorpayOrderId: raw.razorpayOrderId || null,
    razorpayPaymentId: raw.razorpayPaymentId || null,
    lastOrderId: raw.lastOrderId || null,
    lastVerifiedAt: raw.lastVerifiedAt || null,
    lastSyncedAt: raw.lastSyncedAt || null,
  };
}

export function isPremiumActive(user = {}) {
  return getSubscriptionSnapshot(user).isPremium;
}

export function withSubscriptionUpdate(user = {}, updates = {}) {
  return {
    ...user,
    subscription: {
      tier: 'free',
      status: 'free',
      planKey: null,
      planLabel: null,
      interval: null,
      currency: null,
      amount: null,
      provider: null,
      currentPeriodEnd: null,
      purchasedAt: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      lastOrderId: null,
      lastVerifiedAt: null,
      lastSyncedAt: new Date().toISOString(),
      ...(user.subscription || {}),
      ...updates,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

export function buildSubscriptionStateFromRazorpayPayment({ plan, orderId, paymentId, paidAt }) {
  const resolvedPlan = plan || findBillingPlanByKey('premium-monthly');
  const purchasedAt = paidAt || new Date().toISOString();

  return {
    tier: resolvedPlan?.tier || 'premium',
    status: 'active',
    planKey: resolvedPlan?.key || null,
    planLabel: resolvedPlan?.label || null,
    interval: resolvedPlan?.interval || null,
    currency: resolvedPlan?.currency || null,
    amount: Number.isFinite(Number(resolvedPlan?.amount)) ? Number(resolvedPlan.amount) : null,
    provider: 'razorpay',
    purchasedAt,
    currentPeriodEnd: addDays(purchasedAt, Number(resolvedPlan?.durationDays) || 30),
    razorpayOrderId: orderId || null,
    razorpayPaymentId: paymentId || null,
    lastOrderId: orderId || null,
    lastVerifiedAt: new Date().toISOString(),
  };
}

export function getFrontendAppUrl() {
  return String(process.env.FRONTEND_APP_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
}

export function getRazorpayKeyId() {
  return String(process.env.RAZORPAY_KEY_ID || '').trim();
}

export function getRazorpayKeySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET || '').trim();
}