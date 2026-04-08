import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoCheckmarkCircleOutline,
  IoLockClosedOutline,
  IoOpenOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoWalletOutline,
} from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import {
  createBillingOrder,
  getBillingPlans,
  syncBillingSubscription,
  verifyBillingPayment,
} from '../services/api';

const premiumHighlights = [
  'Unlock all learner modules and premium study tools.',
  'Use AI tutor answers, syllabus analysis, and transcript fetch without free-tier limits.',
  'Keep subscription status synced to your EducoLink account.',
];

const premiumModules = [
  'EducoAssist',
  'Notes Hub',
  'Study Room',
  'Collaborative Whiteboard',
  'Productivity Tools',
  'Visual Labs',
  'Smart Workspace',
  'Break Zone',
  'Lecture Zone',
];

export default function PremiumAccess({ lockedPath = '' }) {
  const { token, user, updateUser, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');

  const sortedPlans = useMemo(
    () => [...plans].sort((left, right) => Number(left.amount || 0) - Number(right.amount || 0)),
    [plans],
  );

  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existing = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'));
    document.body.appendChild(script);
  });

  useEffect(() => {
    let active = true;

    getBillingPlans()
      .then((data) => {
        if (active) {
          setPlans(Array.isArray(data?.plans) ? data.plans : []);
          setRazorpayKeyId(data?.keyId || '');
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message || 'Unable to load billing plans right now.');
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPlans(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshAccessState = async () => {
    if (!token) {
      setMessage('Please log in before syncing subscription status.');
      return;
    }

    setActionLoading('sync');
    setMessage('');
    try {
      const data = await syncBillingSubscription(token);
      if (data?.user) {
        updateUser(data.user);
      } else {
        await refreshUser();
      }
      setMessage('Access status refreshed.');
    } catch (error) {
      setMessage(error.message || 'Unable to refresh subscription right now.');
    } finally {
      setActionLoading('');
    }
  };

  const startCheckout = async (planKey) => {
    if (!token) {
      setMessage('Please log in before starting a subscription.');
      return;
    }

    if (!razorpayKeyId) {
      setMessage('Razorpay is not configured yet. Add your Razorpay keys in the backend env first.');
      return;
    }

    setActionLoading(planKey);
    setMessage('');

    try {
      const RazorpayConstructor = await loadRazorpayScript();
      const data = await createBillingOrder(token, planKey);
      const order = data?.order;
      const plan = data?.plan;

      if (!RazorpayConstructor || !order?.id || !plan?.key) {
        throw new Error('Razorpay order could not be created.');
      }

      const checkout = new RazorpayConstructor({
        key: data?.keyId || razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'EducoLink Premium',
        description: plan.label,
        order_id: order.id,
        prefill: data?.prefill || {},
        notes: {
          planKey: plan.key,
          learnerId: user?.id || '',
        },
        theme: {
          color: '#09596e',
        },
        modal: {
          ondismiss: () => {
            setActionLoading('');
          },
        },
        handler: async (response) => {
          try {
            const verified = await verifyBillingPayment(token, {
              planKey: plan.key,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verified?.user) {
              updateUser(verified.user);
            } else {
              await refreshUser();
            }

            setMessage('Payment verified. Premium access is now active.');
          } catch (error) {
            setMessage(error.message || 'Payment succeeded, but verification failed.');
          } finally {
            setActionLoading('');
          }
        },
      });

      checkout.open();
    } catch (error) {
      setMessage(error.message || 'Unable to start checkout right now.');
      setActionLoading('');
    }
  };

  const subscription = user?.subscription || {};

  return (
    <div className="module-page premium-page">
      <motion.div
        className="module-hero premium-hero"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>EducoLink Premium</h1>
          <p>
            Upgrade to unlock the full learning stack, gated AI features, and every premium module in one subscription.
          </p>
          <div className="premium-hero-chips">
            <span className="premium-chip"><IoShieldCheckmarkOutline /> Secure Razorpay checkout</span>
            <span className="premium-chip"><IoSparklesOutline /> Full module access</span>
            <span className="premium-chip"><IoWalletOutline /> Instant payment verification</span>
          </div>
        </div>
      </motion.div>

      <div className="premium-grid">
        <motion.div className="feature-card premium-summary-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(9, 89, 110, 0.12)', color: '#09596e' }}>
              <IoLockClosedOutline />
            </div>
            <div>
              <div className="feature-card-title">Access status</div>
              <div className="feature-card-subtitle">
                {user?.isPremium ? 'Premium active' : 'Free plan'}
              </div>
            </div>
          </div>

          <div className="premium-status-panel">
            <div>
              <strong>Status:</strong> {subscription.status || 'free'}
            </div>
            <div>
              <strong>Plan:</strong> {subscription.planLabel || 'No premium plan'}
            </div>
            <div>
              <strong>Renews / ends:</strong> {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Not scheduled'}
            </div>
            {lockedPath && !user?.isPremium && (
              <div>
                <strong>Blocked module:</strong> {lockedPath}
              </div>
            )}
          </div>

          <div className="premium-feature-list">
            {premiumHighlights.map((item) => (
              <div key={item} className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(9, 89, 110, 0.1)', color: '#09596e' }}>
                  <IoCheckmarkCircleOutline />
                </div>
                {item}
              </div>
            ))}
          </div>

          {user?.isPremium && (
            <div className="feature-card-action">
              <button type="button" className="btn-primary" onClick={refreshAccessState} disabled={actionLoading === 'sync'}>
                {actionLoading === 'sync' ? 'Refreshing...' : 'Refresh Access'}
              </button>
            </div>
          )}
        </motion.div>

        <motion.div className="feature-card premium-modules-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(180, 19, 64, 0.12)', color: '#b41340' }}>
              <IoSparklesOutline />
            </div>
            <div>
              <div className="feature-card-title">Premium modules</div>
              <div className="feature-card-subtitle">Everything included after upgrade</div>
            </div>
          </div>
          <div className="premium-module-grid">
            {premiumModules.map((item) => (
              <div key={item} className="premium-module-pill">{item}</div>
            ))}
          </div>
          <div className="feature-card-action">
            <Link to="/settings" className="btn-secondary premium-link-btn">
              <IoOpenOutline /> Account settings
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="feature-grid premium-plan-grid">
        {loadingPlans && (
          <motion.div className="feature-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="feature-card-title">Loading plans...</div>
          </motion.div>
        )}

        {!loadingPlans && sortedPlans.map((plan, index) => (
          <motion.div
            key={plan.key}
            className={`feature-card premium-plan-card ${index === 1 ? 'recommended' : ''}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="premium-plan-head">
              <div>
                <div className="feature-card-title">{plan.label}</div>
                <div className="feature-card-subtitle">{plan.description}</div>
              </div>
              {index === 1 && <span className="premium-plan-badge">Best value</span>}
            </div>

            <div className="premium-plan-price">
              <span>{plan.currency} {plan.amount}</span>
              <small>per {plan.interval}</small>
            </div>

            <div className="premium-feature-list compact">
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}>
                  <IoCheckmarkCircleOutline />
                </div>
                Premium-only module routes unlocked
              </div>
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}>
                  <IoCheckmarkCircleOutline />
                </div>
                AI answer and transcript endpoints enabled
              </div>
            </div>

            <div className="feature-card-action">
              <button
                type="button"
                className="btn-primary"
                onClick={() => startCheckout(plan.key)}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading === plan.key ? 'Opening...' : `Choose ${plan.label}`}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {message && <div className="premium-message-card">{message}</div>}
    </div>
  );
}
