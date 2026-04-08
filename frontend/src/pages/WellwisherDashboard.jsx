import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { IoAlertCircleOutline, IoChatbubblesOutline, IoCheckmarkCircleOutline, IoLinkOutline, IoLockClosedOutline, IoPeopleOutline, IoSendOutline, IoTimerOutline, IoCallOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { assignLearnerTask, clearMessages, getMessages, getWellwisherDashboard, linkLearnerAccount, reviewLearnerTask, sendMessage, updateLearnerFocusControl, initiateCall } from '../services/api';

const emptyTaskForm = {
  learnerId: '',
  title: '',
  details: '',
  dueAt: '',
  durationMinutes: '',
  proofRequired: true,
};

const emptyFocusForm = {
  learnerId: '',
  status: 'active',
  durationMinutes: 45,
  pin: '',
  message: '',
};

export default function WellwisherDashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [learnerEmail, setLearnerEmail] = useState('');
  const [linkMode, setLinkMode] = useState('email'); // 'email' | 'code'
  const [learnerInviteCode, setLearnerInviteCode] = useState('');
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [focusForm, setFocusForm] = useState(emptyFocusForm);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Per-learner messages
  const [activeChatLearnerId, setActiveChatLearnerId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef(null);

  // Call state
  const [callPhoneNumbers, setCallPhoneNumbers] = useState({}); // { learnerId: phoneNumber }
  const [callLoading, setCallLoading] = useState({}); // { learnerId: boolean }
  const [callMessage, setCallMessage] = useState('');

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getWellwisherDashboard(token);
      setDashboard(data);
      setError('');
      const firstLearnerId = data?.learners?.[0]?.id || '';
      setTaskForm((prev) => ({ ...prev, learnerId: prev.learnerId || firstLearnerId }));
      setFocusForm((prev) => ({ ...prev, learnerId: prev.learnerId || firstLearnerId }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadDashboard({ silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  const learnerOptions = dashboard?.learners || [];
  const openSosCount = useMemo(
    () => learnerOptions.reduce((sum, learner) => sum + learner.sosRequests.filter((entry) => entry.status === 'open').length, 0),
    [learnerOptions],
  );
  const sosNotifications = useMemo(() => {
    return learnerOptions
      .flatMap((learner) =>
        learner.sosRequests.map((entry) => ({
          ...entry,
          learnerName: learner.name,
          learnerEmail: learner.email,
        })),
      )
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [learnerOptions]);

  const handleLinkLearner = async (event) => {
    event.preventDefault();
    setActionMessage('');
    setActionError('');

    try {
      const payload = linkMode === 'code'
        ? { learnerCode: learnerInviteCode.trim().toUpperCase() }
        : { learnerEmail };
      await linkLearnerAccount(token, payload);
      setLearnerEmail('');
      setLearnerInviteCode('');
      setActionMessage('Learner linked successfully.');
      await loadDashboard({ silent: true });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAssignTask = async (event) => {
    event.preventDefault();
    setActionMessage('');
    setActionError('');

    try {
      await assignLearnerTask(token, taskForm);
      setTaskForm((prev) => ({ ...emptyTaskForm, learnerId: prev.learnerId }));
      setActionMessage('Task assigned successfully.');
      await loadDashboard({ silent: true });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleFocusUpdate = async (event) => {
    event.preventDefault();
    setActionMessage('');
    setActionError('');

    try {
      await updateLearnerFocusControl(token, focusForm);
      setActionMessage('Focus settings updated.');
      await loadDashboard({ silent: true });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleTaskReview = async (taskId, status) => {
    setActionMessage('');
    setActionError('');

    try {
      await reviewLearnerTask(token, taskId, status);
      setActionMessage(`Task marked as ${status}.`);
      await loadDashboard({ silent: true });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const loadChatMessages = async (learnerId) => {
    if (!token || !learnerId) return;
    try {
      const data = await getMessages(token, learnerId);
      setChatMessages(data?.messages || []);
      setChatError('');
    } catch (err) {
      setChatError(err.message || 'Could not load messages.');
    }
  };

  const openChat = (learnerId) => {
    setActiveChatLearnerId(learnerId);
    setChatInput('');
    setChatError('');
    loadChatMessages(learnerId);
  };

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !activeChatLearnerId) return;
    setChatLoading(true);
    try {
      await sendMessage(token, { receiverId: activeChatLearnerId, text: trimmed });
      setChatInput('');
      await loadChatMessages(activeChatLearnerId);
    } catch (err) {
      setChatError(err.message || 'Send failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = async (learnerId) => {
    if (!learnerId) return;
    const ok = window.confirm('Clear all messages in this chat?');
    if (!ok) return;

    setChatLoading(true);
    try {
      await clearMessages(token, learnerId);
      setChatMessages([]);
      setChatError('');
    } catch (err) {
      setChatError(err.message || 'Could not clear chat.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleInitiateCall = async (learnerId) => {
    const phoneNumber = callPhoneNumbers[learnerId]?.trim();
    if (!phoneNumber || !learnerId) {
      setCallMessage('Please enter a phone number.');
      return;
    }

    setCallLoading((prev) => ({ ...prev, [learnerId]: true }));
    setCallMessage('');

    try {
      const result = await initiateCall(token, {
        learnerId,
        learnerPhoneNumber: phoneNumber,
      });

      setCallMessage(`Call initiated! Execution ID: ${result.executionSid}`);
      // Clear phone number after successful call
      setCallPhoneNumbers((prev) => ({ ...prev, [learnerId]: '' }));

      // Clear message after 5 seconds
      setTimeout(() => setCallMessage(''), 5000);
    } catch (err) {
      setCallMessage(`Call failed: ${err.message}`);
    } finally {
      setCallLoading((prev) => ({ ...prev, [learnerId]: false }));
    }
  };

  // Poll chat messages when a chat is open
  useEffect(() => {
    if (!activeChatLearnerId || !token) return undefined;
    const id = window.setInterval(() => loadChatMessages(activeChatLearnerId), 8000);
    return () => window.clearInterval(id);
  }, [activeChatLearnerId, token]);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isAuthenticated) {
    return (
      <div className="module-page">
        <div className="module-hero" style={{ background: 'linear-gradient(135deg, #124170, #2b6cb0, #7dd3fc)' }}>
          <div className="module-hero-content">
            <h1>Wellwisher Dashboard</h1>
            <p>Sign in with a wellwisher account to monitor learners, assign tasks, and control focus sessions.</p>
            <Link to="/wellwisher/login" className="login-button" style={{ width: 'fit-content', marginTop: '1rem' }}>Open wellwisher login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'wellwisher') {
    return (
      <div className="module-page">
        <div className="module-hero" style={{ background: 'linear-gradient(135deg, #6b1f39, #b54768, #f59eb5)' }}>
          <div className="module-hero-content">
            <h1>Wellwisher Access Only</h1>
            <p>This dashboard is reserved for wellwisher accounts. Use the learner home dashboard for study modules.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page oversight-page">
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, #0f4c5c, #178f83, #8ad7c0)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Wellwisher Command Center</h1>
          <p>Track learner progress, push focus sessions, review SOS requests, and approve task proof from one dashboard.</p>
        </div>
      </motion.div>

      <div className="feature-grid oversight-grid">
        <div className="feature-card oversight-stat-card">
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(15,76,92,0.12)', color: '#0f4c5c' }}><IoPeopleOutline /></div>
            <div>
              <div className="feature-card-title">Linked Learners</div>
              <div className="feature-card-subtitle">{dashboard?.learners?.length || 0} active connections</div>
            </div>
          </div>
        </div>

        <div className="feature-card oversight-stat-card">
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(179,77,64,0.12)', color: '#b34d40' }}><IoAlertCircleOutline /></div>
            <div>
              <div className="feature-card-title">Open SOS Alerts</div>
              <div className="feature-card-subtitle">{openSosCount} requests need attention</div>
            </div>
          </div>
        </div>

        <div className="feature-card oversight-stat-card">
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(18,109,83,0.12)', color: '#126d53' }}><IoCheckmarkCircleOutline /></div>
            <div>
              <div className="feature-card-title">Task Oversight</div>
              <div className="feature-card-subtitle">Approve or review learner proof directly here</div>
            </div>
          </div>
        </div>
      </div>

      <div className="feature-card oversight-sos-notification-module">
        <div className="feature-card-header">
          <div className="feature-card-icon" style={{ background: 'rgba(179,77,64,0.12)', color: '#b34d40' }}><IoAlertCircleOutline /></div>
          <div>
            <div className="feature-card-title">SOS Notifications</div>
            <div className="feature-card-subtitle">Instant learner SOS reasons and timestamps</div>
          </div>
        </div>

        {!sosNotifications.length && <div className="oversight-empty">No SOS notifications yet.</div>}
        {sosNotifications.slice(0, 8).map((entry) => (
          <div key={entry.id} className="oversight-item-card alert">
            <strong>{entry.learnerName} • {new Date(entry.createdAt).toLocaleString()}</strong>
            <p>{entry.reason}</p>
            <span>Status: {entry.status}</span>
          </div>
        ))}
      </div>

      {(actionMessage || actionError || error) && (
        <div className={`oversight-banner ${actionError || error ? 'error' : 'success'}`}>
          {actionError || error || actionMessage}
        </div>
      )}

      <div className="feature-grid oversight-grid-forms">
        <form className="feature-card oversight-form" onSubmit={handleLinkLearner}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(35,88,164,0.12)', color: '#2358a4' }}><IoLinkOutline /></div>
            <div>
              <div className="feature-card-title">Link Learner</div>
              <div className="feature-card-subtitle">Connect via email or learner&apos;s permanent code.</div>
            </div>
          </div>
          <div className="link-mode-tabs">
            <button type="button" className={`link-tab ${linkMode === 'email' ? 'active' : ''}`} onClick={() => setLinkMode('email')}>By Email</button>
            <button type="button" className={`link-tab ${linkMode === 'code' ? 'active' : ''}`} onClick={() => setLinkMode('code')}>By Invite Code</button>
          </div>
          {linkMode === 'email' ? (
            <input className="oversight-input" type="email" placeholder="learner@email.com" value={learnerEmail} onChange={(event) => setLearnerEmail(event.target.value)} required />
          ) : (
            <input
              className="oversight-input invite-code-input"
              type="text"
              placeholder="8-char code (e.g. AB3K7MNP)"
              maxLength={8}
              value={learnerInviteCode}
              onChange={(event) => setLearnerInviteCode(event.target.value.toUpperCase())}
              required
            />
          )}
          <button type="submit" className="login-button">Link learner</button>
        </form>

        <form className="feature-card oversight-form" onSubmit={handleAssignTask}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(111,76,179,0.12)', color: '#6f4cb3' }}><IoCheckmarkCircleOutline /></div>
            <div>
              <div className="feature-card-title">Assign Task</div>
              <div className="feature-card-subtitle">Create a timed task and require proof if needed.</div>
            </div>
          </div>
          <select className="oversight-input" value={taskForm.learnerId} onChange={(event) => setTaskForm((prev) => ({ ...prev, learnerId: event.target.value }))} required>
            <option value="">Select learner</option>
            {learnerOptions.map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}
          </select>
          <input className="oversight-input" type="text" placeholder="Task title" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} required />
          <textarea className="oversight-input oversight-textarea" placeholder="Task details" value={taskForm.details} onChange={(event) => setTaskForm((prev) => ({ ...prev, details: event.target.value }))} rows={3} />
          <input className="oversight-input" type="number" min="5" max="480" placeholder="Task timer (minutes, optional)" value={taskForm.durationMinutes} onChange={(event) => setTaskForm((prev) => ({ ...prev, durationMinutes: event.target.value }))} />
          <input className="oversight-input" type="datetime-local" value={taskForm.dueAt} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueAt: event.target.value }))} />
          <label className="oversight-checkbox"><input type="checkbox" checked={taskForm.proofRequired} onChange={(event) => setTaskForm((prev) => ({ ...prev, proofRequired: event.target.checked }))} /> Require proof upload</label>
          <button type="submit" className="login-button">Assign task</button>
        </form>

        <form className="feature-card oversight-form" onSubmit={handleFocusUpdate}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(180,82,40,0.12)', color: '#b45228' }}><IoTimerOutline /></div>
            <div>
              <div className="feature-card-title">Focus Control</div>
              <div className="feature-card-subtitle">Push a PIN-protected focus state to a learner.</div>
            </div>
          </div>
          <select className="oversight-input" value={focusForm.learnerId} onChange={(event) => setFocusForm((prev) => ({ ...prev, learnerId: event.target.value }))} required>
            <option value="">Select learner</option>
            {learnerOptions.map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}
          </select>
          <select className="oversight-input" value={focusForm.status} onChange={(event) => setFocusForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="active">Start</option>
            <option value="paused">Pause</option>
            <option value="stopped">Stop</option>
            <option value="idle">Reset</option>
          </select>
          <input className="oversight-input" type="number" min="5" max="480" value={focusForm.durationMinutes} onChange={(event) => setFocusForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) || 45 }))} />
          <input className="oversight-input" type="text" placeholder="PIN (4-6 digits)" value={focusForm.pin} onChange={(event) => setFocusForm((prev) => ({ ...prev, pin: event.target.value.replace(/[^\d]/g, '').slice(0, 6) }))} />
          <textarea className="oversight-input oversight-textarea" placeholder="Message for learner" value={focusForm.message} onChange={(event) => setFocusForm((prev) => ({ ...prev, message: event.target.value }))} rows={3} />
          <button type="submit" className="login-button">Update focus</button>
        </form>
      </div>

      <div className="oversight-learner-list">
        {loading && <div className="feature-card">Loading wellwisher dashboard...</div>}
        {!loading && !learnerOptions.length && <div className="feature-card">No learners linked yet. Link a learner account to begin.</div>}
        {!loading && learnerOptions.map((learner) => (
          <motion.div key={learner.id} className="feature-card oversight-learner-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(15,76,92,0.12)', color: '#0f4c5c' }}><IoPeopleOutline /></div>
              <div>
                <div className="feature-card-title">{learner.name}</div>
                <div className="feature-card-subtitle">{learner.email}</div>
              </div>
            </div>

            <div className="oversight-chip-row">
              <span className="oversight-chip">Focus: {learner.focus.status}</span>
              <span className="oversight-chip">Focus minutes: {learner.analytics.totalFocusMinutes}</span>
              <span className="oversight-chip">Tasks done: {learner.analytics.completedTaskCount}</span>
              <span className="oversight-chip">SOS today: {learner.analytics.sosTodayCount}</span>
            </div>

            <div className="oversight-columns">
              <div>
                <h3 className="oversight-section-title">Assigned tasks</h3>
                {learner.tasks.length ? learner.tasks.map((task) => (
                  <div key={task.id} className="oversight-item-card">
                    <strong>{task.title}</strong>
                    <p>{task.details || 'No extra details provided.'}</p>
                    <span>Status: {task.status}</span>
                    <div className="oversight-inline-actions">
                      <button type="button" className="oversight-action-btn" onClick={() => handleTaskReview(task.id, 'approved')}>Approve</button>
                      <button type="button" className="oversight-action-btn subtle" onClick={() => handleTaskReview(task.id, 'rejected')}>Reject</button>
                    </div>
                  </div>
                )) : <div className="oversight-empty">No tasks assigned yet.</div>}
              </div>

              <div>
                <h3 className="oversight-section-title">Task submissions</h3>
                {learner.submissions.length ? learner.submissions.map((submission) => (
                  <div key={submission.id} className="oversight-item-card">
                    <strong>{submission.taskId}</strong>
                    <p>{submission.notes || 'No learner notes added.'}</p>
                    <span>AI verdict: {submission.aiReview?.verdict || 'pending'}</span>
                    {submission.proofFiles?.length ? (
                      <div className="oversight-proof-links">
                        {submission.proofFiles.map((file) => (
                          <a key={file.url} href={file.url} target="_blank" rel="noreferrer">{file.originalName || file.name || 'Proof file'}</a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )) : <div className="oversight-empty">No submissions yet.</div>}
              </div>

              <div>
                <h3 className="oversight-section-title">SOS feed</h3>
                {learner.sosRequests.length ? learner.sosRequests.map((entry) => (
                  <div key={entry.id} className="oversight-item-card alert">
                    <strong>{new Date(entry.createdAt).toLocaleString()}</strong>
                    <p>{entry.reason}</p>
                    <span>Status: {entry.status}</span>
                  </div>
                )) : <div className="oversight-empty">No SOS requests.</div>}
              </div>
            </div>

            {/* Wellwisher Messages — per learner */}
            <div className="oversight-chat-section">
              <div className="oversight-chat-header">
                <IoChatbubblesOutline />
                <h3 className="oversight-section-title" style={{ margin: 0 }}>Wellwisher Messages</h3>
                <button
                  type="button"
                  className="oversight-action-btn subtle"
                  onClick={() => activeChatLearnerId === learner.id ? setActiveChatLearnerId(null) : openChat(learner.id)}
                >
                  {activeChatLearnerId === learner.id ? 'Close chat' : 'Open chat'}
                </button>
              </div>

              {activeChatLearnerId === learner.id && (
                <div className="oversight-chat-body">
                  <div className="chat-messages-box">
                    {chatMessages.length === 0 && <p className="chat-empty">No messages yet.</p>}
                    {chatMessages.map((m) => (
                      <div key={m.id} className={`chat-bubble ${m.senderId === user?.id ? 'mine' : 'theirs'}`}>
                        <span className="chat-text">{m.text}</span>
                        <span className="chat-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {chatError && <div className="oversight-banner error">{chatError}</div>}
                  <div className="chat-tools-row">
                    <button type="button" className="chat-clear-btn" onClick={() => handleClearChat(learner.id)} disabled={chatLoading}>
                      Clear chat
                    </button>
                  </div>
                  <div className="chat-input-row">
                    <input
                      type="text"
                      className="chat-input"
                      placeholder="Message the learner..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    />
                    <button type="button" className="chat-send-btn" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                      <IoSendOutline />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}