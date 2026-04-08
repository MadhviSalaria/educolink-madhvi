import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineGlobeAlt,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineArrowPath,
  HiOutlineHome,
} from 'react-icons/hi2';
import '../styles/workspace.css';

/* ——— Storage keys ——— */
const LS_BOOKMARKS = 'educolink_bookmarks';
const LS_ANALYTICS = 'educolink_workspace_analytics';
const LS_PIN       = 'educolink_focus_pin';
const LS_EXT_SNAPSHOT = 'educolink_extension_analytics_snapshot';

/* ——— Default Educational Sites ——— */
const DEFAULT_SITES = [
  { id: 'default-1', name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
  { id: 'default-2', name: 'Desmos Math', url: 'https://www.desmos.com/calculator' },
  { id: 'default-3', name: 'PhET Simulations', url: 'https://phet.colorado.edu/' },
  { id: 'default-4', name: 'Geogebra', url: 'https://www.geogebra.org/calculator' },
  { id: 'default-5', name: 'W3Schools', url: 'https://www.w3schools.com/' },
  { id: 'default-6', name: 'Stack Overflow', url: 'https://stackoverflow.com/' }
];

/* ——— Helpers ——— */
const normalizeUrl = (raw) => {
  const t = raw.trim();
  if (!t) return '';
  const full = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return new URL(full).toString();
};

const favUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return '';
  }
};

const fmtRuntime = (sec) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const loadAnalytics = () => {
  try { return JSON.parse(localStorage.getItem(LS_ANALYTICS)) || {}; } catch { return {}; }
};

const saveAnalytics = (data) => {
  localStorage.setItem(LS_ANALYTICS, JSON.stringify(data));
};

const loadExtSnapshot = () => {
  try { return JSON.parse(localStorage.getItem(LS_EXT_SNAPSHOT)) || {}; } catch { return {}; }
};

const saveExtSnapshot = (data) => {
  localStorage.setItem(LS_EXT_SNAPSHOT, JSON.stringify(data));
};

/* ——— Mini Favicon with fallback ——— */
function SiteFavicon({ url, name }) {
  const [err, setErr] = useState(false);
  return (
    <div className="sw-site-favicon">
      {!err ? (
        <img src={favUrl(url)} alt="" onError={() => setErr(true)} />
      ) : (
        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
          {name?.[0]?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   Main Component
   ============================================================ */
export default function SmartWorkspace() {
  /* ——— Bookmarks state ——— */
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_BOOKMARKS));
      return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_SITES;
    } catch { return DEFAULT_SITES; }
  });

  const [activeId, setActiveId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_BOOKMARKS));
      return (Array.isArray(saved) && saved.length > 0) ? saved[0].id : DEFAULT_SITES[0].id;
    } catch { return DEFAULT_SITES[0].id; }
  });

  /* ——— Iframe state ——— */
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef(null);

  /* ——— Analytics (runtime per site in seconds) ——— */
  const [analytics, setAnalytics] = useState({});
  const sessionStartRef = useRef(null);
  const sessionIdRef = useRef(null);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const liveTimerRef = useRef(null);
  const extensionSnapshotRef = useRef({});

  /* ——— Modal state ——— */
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1 = pin(add), 2 = details, 3 = pin(delete)
  const [deletingId, setDeletingId] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addMsg, setAddMsg] = useState('');

  /* ——— Load from localStorage on mount ——— */
  useEffect(() => {
    setAnalytics(loadAnalytics());
    extensionSnapshotRef.current = loadExtSnapshot();
  }, []);

  useEffect(() => {
    const handleBridgeMessage = (event) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      const { type, payload } = event.data || {};
      if (type !== 'EDUCOLINK_EXTENSION_ANALYTICS') {
        return;
      }

      const extAnalytics = payload?.analytics;
      if (!extAnalytics || typeof extAnalytics !== 'object') {
        return;
      }

      const latest = loadAnalytics();
      const snapshot = { ...extensionSnapshotRef.current };
      let changed = false;

      Object.entries(extAnalytics).forEach(([bookmarkId, rawValue]) => {
        const extTotal = Number(rawValue) || 0;
        const prevSynced = Number(snapshot[bookmarkId]) || 0;

        if (extTotal > prevSynced) {
          const delta = extTotal - prevSynced;
          latest[bookmarkId] = (latest[bookmarkId] || 0) + delta;
          snapshot[bookmarkId] = extTotal;
          changed = true;
          return;
        }

        if (extTotal < prevSynced) {
          // Extension storage was reset (extension reload/uninstall), so re-baseline.
          snapshot[bookmarkId] = extTotal;
        }
      });

      if (changed) {
        saveAnalytics(latest);
        setAnalytics({ ...latest });
      }

      extensionSnapshotRef.current = snapshot;
      saveExtSnapshot(snapshot);
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  /* ——— Persist bookmarks ——— */
  useEffect(() => {
    localStorage.setItem(LS_BOOKMARKS, JSON.stringify(bookmarks));
  }, [bookmarks]);

  /* ——— Active site tracking ——— */
  const activeBookmark = bookmarks.find((b) => b.id === activeId) || null;

  /* ——— Stop session timer ——— */
  const stopSession = useCallback(() => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    if (sessionStartRef.current && sessionIdRef.current) {
      const elapsed = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const latest = loadAnalytics();
      latest[sessionIdRef.current] = (latest[sessionIdRef.current] || 0) + elapsed;
      saveAnalytics(latest);
      setAnalytics({ ...latest });
    }
    sessionStartRef.current = null;
    sessionIdRef.current = null;
    setLiveSeconds(0);
  }, []);

  /* ——— Start session timer for active bookmark ——— */
  useEffect(() => {
    stopSession();
    if (!activeId || blocked) return;
    sessionStartRef.current = Date.now();
    sessionIdRef.current = activeId;
    setLiveSeconds(0);
    liveTimerRef.current = setInterval(() => {
      setLiveSeconds(Math.round((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, blocked]);

  /* ——— Stop timer on unmount ——— */
  useEffect(() => () => stopSession(), [stopSession]);

  /* ——— Reset iframe state when active changes ——— */
  useEffect(() => {
    setBlocked(false);
    setLoading(true);
    if (!activeBookmark) { setLoading(false); }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIframeLoad = () => {
    setBlocked(false);
    setLoading(false);
  };

  // Only flag blocked on genuine network-level failure (no response at all)
  const handleIframeError = () => {
    setBlocked(true);
    setLoading(false);
  };

  /* ——— Reload iframe ——— */
  const reloadIframe = () => {
    if (!activeBookmark) return;
    setBlocked(false);
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = activeBookmark.url;
    }
  };

  const openTrackedExternal = useCallback((bookmark) => {
    if (!bookmark?.url || !bookmark?.id) {
      return;
    }

    const fallbackUrl = (() => {
      try {
        const u = new URL(bookmark.url);
        u.searchParams.set('el_track', bookmark.id);
        return u.toString();
      } catch {
        return bookmark.url;
      }
    })();

    const correlationId = `${bookmark.id}-${Date.now()}`;
    let handledByExtension = false;

    const onMessage = (event) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      const { type, payload } = event.data || {};
      if (!payload || payload.correlationId !== correlationId) {
        return;
      }

      if (type === 'EDUCOLINK_EXTENSION_OPENED') {
        handledByExtension = true;
      }

      if (type === 'EDUCOLINK_EXTENSION_OPENED' || type === 'EDUCOLINK_EXTENSION_ERROR') {
        window.removeEventListener('message', onMessage);
      }
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        type: 'EDUCOLINK_OPEN_TRACKED_TAB',
        payload: {
          bookmarkId: bookmark.id,
          name: bookmark.name,
          url: bookmark.url,
        },
        correlationId,
      },
      window.location.origin,
    );

    window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      if (!handledByExtension) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    }, 700);
  }, []);

  /* ——— Delete bookmark ——— */
  const promptDeleteBookmark = (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    setShowModal(true);
    setStep(3);
    setPinInput('');
    setPinMsg('');
  };

  const confirmDeleteBookmark = () => {
    const saved = localStorage.getItem(LS_PIN);
    if (!saved) {
      setPinMsg('No Focus PIN set. Please set one on the Home page → Focus Mode.');
      return;
    }
    if (pinInput !== saved) {
      setPinMsg('Incorrect PIN. Try again.');
      return;
    }
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== deletingId);
      if (activeId === deletingId) setActiveId(updated[0]?.id || null);
      return updated;
    });
    closeModal();
  };

  /* ——— Modal handlers ——— */
  const openModal = () => {
    setShowModal(true);
    setStep(1);
    setPinInput('');
    setPinMsg('');
    setNewName('');
    setNewUrl('');
    setAddMsg('');
  };

  const closeModal = () => setShowModal(false);

  const handleVerifyPin = () => {
    const saved = localStorage.getItem(LS_PIN);
    if (!saved) {
      setPinMsg('No Focus PIN set. Please set one on the Home page → Focus Mode.');
      return;
    }
    if (pinInput !== saved) {
      setPinMsg('Incorrect PIN. Try again.');
      return;
    }
    setPinMsg('');
    setStep(2);
  };

  const handleAddBookmark = () => {
    if (!newName.trim() || !newUrl.trim()) {
      setAddMsg('Please fill in both fields.');
      return;
    }
    try {
      const normalized = normalizeUrl(newUrl);
      const bm = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: newName.trim(),
        url: normalized,
        addedAt: Date.now(),
      };
      setBookmarks((prev) => [bm, ...prev]);
      setActiveId(bm.id);
      closeModal();
    } catch {
      setAddMsg('Enter a valid URL, e.g. https://example.com');
    }
  };

  /* ——— Aggregate analytics ——— */
  const totalRuntime = Object.values(analytics).reduce((acc, v) => acc + (v || 0), 0);
  const siteCount = bookmarks.length;

  /* ——— Current site stored runtime ——— */
  const siteStored = activeId ? (analytics[activeId] || 0) : 0;
  const siteTotal = siteStored + liveSeconds;

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="sw-root">
      {/* ---- Top Toolbar ---- */}
      <header className="sw-toolbar">
        <div className="sw-toolbar-brand">
          <div className="sw-toolbar-icon">
            <HiOutlineGlobeAlt />
          </div>
          <div>
            <div className="sw-toolbar-title">Smart Workspace</div>
            <div className="sw-toolbar-subtitle">Browse the web, right inside EducoLink</div>
          </div>
        </div>

        <div className="sw-toolbar-actions">
          {siteCount > 0 && (
            <div className="sw-analytics-badge">
              <HiOutlineChartBar />
              <span>Total: {fmtRuntime(totalRuntime + liveSeconds)}</span>
            </div>
          )}
          <button className="sw-add-btn" onClick={openModal} title="Add a new website">
            <HiOutlinePlus />
            Add Website
          </button>
        </div>
      </header>

      {/* ---- Body ---- */}
      <div className="sw-body">
        {/* ---- Sidebar ---- */}
        <aside className="sw-sidebar">
          <div className="sw-sidebar-header">
            <div className="sw-sidebar-label">All Websites</div>
            {siteCount > 0 && (
              <div className="sw-sidebar-count">{siteCount} site{siteCount !== 1 ? 's' : ''}</div>
            )}
          </div>

          {siteCount === 0 ? (
            <div className="sw-empty-sidebar">
              <div className="sw-empty-sidebar-icon">🌐</div>
              <p>No websites yet.<br />Tap <strong>Add Website</strong> to get started.</p>
            </div>
          ) : (
            <>
              <div className="sw-site-list">
                {bookmarks.map((bm) => {
                  const runtime = (analytics[bm.id] || 0) + (activeId === bm.id ? liveSeconds : 0);
                  return (
                    <div
                      key={bm.id}
                      className={`sw-site-card${activeId === bm.id ? ' active' : ''}`}
                      onClick={() => setActiveId(bm.id)}
                    >
                      <SiteFavicon url={bm.url} name={bm.name} />
                      <div className="sw-site-info">
                        <div className="sw-site-name">{bm.name}</div>
                        <div className="sw-site-runtime">
                          <HiOutlineClock />
                          {runtime > 0 ? fmtRuntime(runtime) : 'No visits yet'}
                        </div>
                      </div>
                      <div className="sw-site-actions">
                        <a
                          href={bm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sw-icon-btn"
                          title="Open in new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HiOutlineArrowTopRightOnSquare />
                        </a>
                        <button
                          className="sw-icon-btn danger"
                          title="Remove"
                          onClick={(e) => promptDeleteBookmark(bm.id, e)}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Analytics summary */}
              <div className="sw-analytics-panel">
                <div className="sw-analytics-title">📊 Analytics</div>
                <div className="sw-analytics-summary">
                  <div className="sw-analytics-stat">
                    <span>{siteCount}</span>
                    <span>Sites</span>
                  </div>
                  <div className="sw-analytics-stat">
                    <span>{fmtRuntime(totalRuntime + liveSeconds)}</span>
                    <span>Total</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>

        {/* ---- Viewer ---- */}
        <div className="sw-viewer">
          {activeBookmark ? (
            <>
              {/* Viewer toolbar */}
              <div className="sw-viewer-bar">
                <button
                  className="sw-viewer-bar-btn"
                  onClick={() => window.history.back()}
                  title="Back"
                >
                  ←
                </button>
                <button
                  className="sw-viewer-bar-btn"
                  onClick={reloadIframe}
                  title="Reload"
                >
                  <HiOutlineArrowPath />
                </button>
                <div className="sw-viewer-url-pill" title={activeBookmark.url}>
                  🔒 {activeBookmark.url}
                </div>
                {!blocked && (
                  <div className="sw-runtime-pill">
                    <div className="sw-runtime-pulse" />
                    {fmtRuntime(siteTotal)}
                  </div>
                )}
                <a
                  href={activeBookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sw-viewer-bar-btn"
                  title="Open in new tab"
                >
                  <HiOutlineArrowTopRightOnSquare />
                </a>
              </div>


              {/* iframe area */}
              <div className="sw-iframe-wrap">
                {loading && !blocked && (
                  <div className="sw-loading">
                    <div className="sw-loading-spinner" />
                  </div>
                )}
                {blocked ? (
                  <div className="sw-launcher-overlay">
                    <div className="sw-launcher-card">
                      <div className="sw-launcher-icon">⚠️</div>
                      <h3>Site Unreachable</h3>
                      <p>
                        <strong>{activeBookmark.name}</strong> could not be loaded. The site may be
                        down or your network may not be connecting to it.
                      </p>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-sec)' }}>
                        Try reloading or open it in a new tab to verify connectivity.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button
                          className="sw-launch-btn"
                          style={{ flex: 1 }}
                          onClick={reloadIframe}
                        >
                          <HiOutlineArrowPath style={{ fontSize: '1.2rem' }} />
                          Try Again
                        </button>
                        <button
                          className="sw-launch-btn"
                          style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)' }}
                          onClick={() => openTrackedExternal(activeBookmark)}
                        >
                          <HiOutlineArrowTopRightOnSquare style={{ fontSize: '1.2rem' }} />
                          Open in Tab
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    key={`direct-${activeId}`}
                    className="sw-iframe"
                    src={activeBookmark.url}
                    title={activeBookmark.name}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-presentation allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                  />
                )}
              </div>

            </>
          ) : (
            <div className="sw-empty-viewer">
              <div className="sw-empty-viewer-orb">🌐</div>
              <h3>Your Study Browser</h3>
              <p>
                Add websites to your workspace and browse them here without leaving EducoLink.
                Your time on each site is tracked automatically.
              </p>
              <button className="sw-add-btn" onClick={openModal}>
                <HiOutlinePlus /> Add Your First Website
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          Add Website Modal
          ============================================================ */}
      {showModal && (
        <div className="sw-modal-overlay" onClick={closeModal}>
          <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sw-modal-header">
              <div className="sw-modal-header-info">
                <h3>{step === 1 ? '🔐 Verify PIN' : '🌐 Add Website'}</h3>
                <p>
                  {step === 1
                    ? 'Enter your Focus PIN to unlock website addition.'
                    : 'Enter the site name and URL to add it to your queue.'}
                </p>
              </div>
              <button className="sw-modal-close" onClick={closeModal} aria-label="Close">
                <HiOutlineXMark />
              </button>
            </div>

            {/* Step indicator */}
            <div className="sw-steps" style={{ marginTop: '1rem' }}>
              <div className={`sw-step ${step > 1 ? 'done' : 'active'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div className={`sw-step-line ${step > 1 ? 'done' : ''}`} />
              <div className={`sw-step ${step === 2 ? 'active' : ''}`}>2</div>
            </div>

            {/* Body */}
            <div className="sw-modal-body">
              {/* ── Step 1: PIN ── */}
              {step === 1 && (
                <>
                  <div className="sw-pin-header">
                    <div className="sw-pin-icon">
                      <HiOutlineLockClosed />
                    </div>
                    <div className="sw-pin-header-text">
                      <strong>Focus PIN Required</strong>
                      <span>Uses the same PIN as Focus Mode on the Home page.</span>
                    </div>
                  </div>

                  <div className="sw-input-group">
                    <label className="sw-input-label">Enter PIN</label>
                    <div className="sw-input-wrap">
                      <HiOutlineLockClosed />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => {
                          setPinInput(e.target.value.replace(/\D/g, ''));
                          setPinMsg('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                        placeholder="e.g. 123456"
                        className="sw-input"
                        autoFocus
                      />
                    </div>
                    {pinMsg && (
                      <div className="sw-msg error">
                        <HiOutlineExclamationTriangle />
                        {pinMsg}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 2: Details ── */}
              {step === 2 && (
                <>
                  <div className="sw-msg success">
                    <HiOutlineCheckCircle />
                    PIN verified! Fill in the website details below.
                  </div>

                  <div className="sw-input-group">
                    <label className="sw-input-label">Website Name</label>
                    <div className="sw-input-wrap">
                      <HiOutlineGlobeAlt />
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); setAddMsg(''); }}
                        placeholder="e.g. Khan Academy"
                        className="sw-input"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="sw-input-group">
                    <label className="sw-input-label">URL</label>
                    <div className="sw-input-wrap">
                      <HiOutlineGlobeAlt />
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => { setNewUrl(e.target.value); setAddMsg(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                        placeholder="https://khanacademy.org"
                        className="sw-input"
                      />
                    </div>
                  </div>

                  {addMsg && (
                    <div className="sw-msg error">
                      <HiOutlineExclamationTriangle />
                      {addMsg}
                    </div>
                  )}
                </>
              )}

              {/* ── Step 3: Delete Verification ── */}
              {step === 3 && (
                <>
                  <div className="sw-pin-header">
                    <div className="sw-pin-icon" style={{ background: 'rgba(180, 19, 64, 0.08)', color: 'var(--error)' }}>
                      <HiOutlineLockClosed />
                    </div>
                    <div className="sw-pin-header-text">
                      <strong>Delete Website</strong>
                      <span>Enter Focus PIN to delete this site.</span>
                    </div>
                  </div>

                  <div className="sw-input-group">
                    <label className="sw-input-label">Focus PIN</label>
                    <div className="sw-input-wrap">
                      <HiOutlineShieldCheck />
                      <input
                        type="password"
                        value={pinInput}
                        onChange={(e) => { setPinInput(e.target.value); setPinMsg(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && confirmDeleteBookmark()}
                        placeholder="Enter Focus PIN"
                        className="sw-input"
                        autoFocus
                      />
                    </div>
                    {pinMsg && (
                      <div className="sw-msg error">
                        <HiOutlineExclamationTriangle />
                        {pinMsg}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sw-modal-footer">
              <button className="sw-btn-ghost" onClick={closeModal}>Cancel</button>
              {step === 1 && (
                <button className="sw-btn-primary" onClick={handleVerifyPin}>
                  <HiOutlineShieldCheck />
                  Verify PIN
                </button>
              )}
              {step === 2 && (
                <button className="sw-btn-verified" onClick={handleAddBookmark}>
                  <HiOutlinePlus />
                  Add Website
                </button>
              )}
              {step === 3 && (
                <button className="sw-btn-primary danger" style={{ background: 'var(--error)' }} onClick={confirmDeleteBookmark}>
                  <HiOutlineTrash />
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
