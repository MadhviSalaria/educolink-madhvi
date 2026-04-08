import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  IoPersonCircleOutline,
  IoSchoolOutline,
  IoMailOutline,
  IoCalendarOutline,
  IoKeyOutline,
  IoCopyOutline,
} from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { ensureLearnerCode } from '../services/api';

const stats = [
  { label: 'Study Streak', value: '18 days' },
  { label: 'Completed Notes', value: '42' },
  { label: 'Focus Hours', value: '96h' },
];

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [syncingCode, setSyncingCode] = useState(false);
  const attemptedSyncUserIdsRef = useRef(new Set());
  const syncingRef = useRef(false);
  const updateUserRef = useRef(updateUser);

  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    let active = true;

    async function syncLearnerCode() {
      if (!token || !user?.id || user?.role === 'wellwisher' || user?.learnerCode) {
        return;
      }
      if (attemptedSyncUserIdsRef.current.has(user.id) || syncingRef.current) {
        return;
      }

      attemptedSyncUserIdsRef.current.add(user.id);
      syncingRef.current = true;

      try {
        setSyncingCode(true);
        const data = await ensureLearnerCode(token);
        if (active && data?.learner) {
          updateUserRef.current(data.learner);
        }
      } catch {
        // Keep silent in profile UI; learner can still retry by refresh.
      } finally {
        syncingRef.current = false;
        if (active) {
          setSyncingCode(false);
        }
      }
    }

    syncLearnerCode();
    return () => {
      active = false;
    };
  }, [token, user?.id, user?.role, user?.learnerCode]);
  const stats = user?.role === 'wellwisher'
    ? [
        { label: 'Linked Learners', value: String(user?.linkedLearnerIds?.length || 0) },
        { label: 'Role', value: 'Wellwisher' },
        { label: 'Dashboard', value: 'Oversight' },
      ]
    : [
        { label: 'Study Streak', value: '18 days' },
        { label: 'Completed Notes', value: '42' },
        { label: 'Focus Hours', value: '96h' },
      ];

  return (
    <div className="module-page">
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, #123b6e, #2b67b2, #78a9ff)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Profile</h1>
          <p>Your account details and learning snapshot.</p>
        </div>
      </motion.div>

      <motion.div className="clay-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="feature-card-header" style={{ marginBottom: '1rem' }}>
          <div className="feature-card-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}>
            <IoPersonCircleOutline />
          </div>
          <div>
            <div className="feature-card-title">{user?.name || 'EducoLink User'}</div>
            <div className="feature-card-subtitle">{user?.role === 'wellwisher' ? 'Wellwisher Dashboard' : 'Learner Dashboard'}</div>
          </div>
        </div>

        <div className="feature-card-body">
          <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoSchoolOutline /></div>Role: {user?.role === 'wellwisher' ? 'Wellwisher' : 'Learner'}</div>
          <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoMailOutline /></div>Email: {user?.email || 'Not available'}</div>
          <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoCalendarOutline /></div>Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently joined'}</div>
          {user?.role !== 'wellwisher' && (
            <div className="feature-item" style={{ alignItems: 'center' }}>
              <div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoKeyOutline /></div>
              <span style={{ marginRight: '0.6rem' }}>Integration Code:</span>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: '0.1em', fontWeight: 700, color: '#123b6e' }}>
                {user?.learnerCode || (syncingCode ? 'Generating...' : 'Not generated yet')}
              </span>
              {user?.learnerCode && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(user.learnerCode);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  }}
                  style={{ marginLeft: '0.7rem' }}
                  className="btn-ghost"
                >
                  <IoCopyOutline style={{ marginRight: '0.3rem' }} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          )}
          {user?.role === 'wellwisher' && (
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(18,59,110,0.14)', color: '#123b6e' }}><IoKeyOutline /></div>
              Integration Status: Connected to {user?.linkedLearnerIds?.length || 0} learner{(user?.linkedLearnerIds?.length || 0) === 1 ? '' : 's'}
            </div>
          )}
        </div>

        <div className="feature-grid" style={{ marginTop: '1rem' }}>
          {stats.map((s) => (
            <div key={s.label} className="feature-card">
              <div className="feature-card-title">{s.label}</div>
              <div className="feature-card-subtitle" style={{ fontSize: '1.1rem', color: 'var(--on-surface)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
