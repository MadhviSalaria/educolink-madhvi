import { getSubscriptionSnapshot } from './subscription.js';

export function toPublicUser(user = {}) {
  const subscription = getSubscriptionSnapshot(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'learner',
    learnerCode: user.learnerCode || null,
    linkedLearnerIds: Array.isArray(user.linkedLearnerIds) ? user.linkedLearnerIds : [],
    linkedWellwisherId: user.linkedWellwisherId || null,
    authProvider: user.authProvider || 'local',
    preferences: user.preferences || {},
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    subscription,
    isPremium: subscription.isPremium,
  };
}