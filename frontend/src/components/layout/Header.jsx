import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoMenuOutline,
  IoSearchOutline,
  IoNotificationsOutline,
  IoSunnyOutline,
  IoOpenOutline,
  IoCloseOutline,
  IoAlertCircleOutline,
  IoSendOutline,
  IoCallOutline,
} from 'react-icons/io5';
import FlipCardTimer from '../FlipCardTimer';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, getMessages, submitLearnerSos, initiateCall } from '../../services/api';

export default function Header({ onToggleSidebar, isSidebarOpen }) {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeQuery, setActiveQuery] = useState('');
  const [showSearchCard, setShowSearchCard] = useState(false);
  const [searchSource, setSearchSource] = useState('educolink');
  const [googleProvider, setGoogleProvider] = useState('web');
  const [googleAnswer, setGoogleAnswer] = useState(null);
  const [googleSnippet, setGoogleSnippet] = useState(null);
  const [googleKnowledge, setGoogleKnowledge] = useState(null);
  const [unreadWellwisherCount, setUnreadWellwisherCount] = useState(0);

  // SOS state (learner only)
  const [showSosCard, setShowSosCard] = useState(false);
  const [sosReason, setSosReason] = useState('');
  const [sosMsg, setSosMsg] = useState('');
  const [sosLoading, setSosLoading] = useState(false);
  const [sosRemaining, setSosRemaining] = useState(null);
  const sosBtnRef = useRef(null);
  const sosCardRef = useRef(null);

  // Call state
  const [showCallCard, setShowCallCard] = useState(false);
  const [callPhoneNumber, setCallPhoneNumber] = useState('');
  const [callMsg, setCallMsg] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const callBtnRef = useRef(null);
  const callCardRef = useRef(null);

  useEffect(() => {
    if (!showSosCard) return undefined;
    const handler = (e) => {
      if (
        sosCardRef.current && !sosCardRef.current.contains(e.target) &&
        sosBtnRef.current && !sosBtnRef.current.contains(e.target)
      ) {
        setShowSosCard(false);
        setSosMsg('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSosCard]);

  useEffect(() => {
    if (!showCallCard) return undefined;
    const handler = (e) => {
      if (
        callCardRef.current && !callCardRef.current.contains(e.target) &&
        callBtnRef.current && !callBtnRef.current.contains(e.target)
      ) {
        setShowCallCard(false);
        setCallMsg('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCallCard]);

  const handleSosSubmit = async () => {
    const reason = sosReason.trim();
    if (!reason) {
      setSosMsg('Please describe why you need help.');
      return;
    }
    setSosLoading(true);
    setSosMsg('');
    try {
      const res = await submitLearnerSos(token, { reason });
      setSosRemaining(res.remainingToday ?? null);
      setSosReason('');
      // Notify Home page to release fullscreen focus lock after SOS is successfully sent.
      window.dispatchEvent(new CustomEvent('educolink:sos-submitted', { detail: { reason } }));
      setSosMsg(`SOS sent and focus lock released. ${res.remainingToday != null ? `${res.remainingToday} requests left today.` : ''}`);
    } catch (err) {
      setSosMsg(err.message || 'Failed to send SOS.');
    } finally {
      setSosLoading(false);
    }
  };

  const handleInitiateCall = async () => {
    const phoneNumber = callPhoneNumber.trim();
    if (!phoneNumber) {
      setCallMsg('Please enter a phone number.');
      return;
    }
    if (!token || !user?.id) {
      setCallMsg('Not authenticated.');
      return;
    }

    setCallLoading(true);
    setCallMsg('');

    try {
      const result = await initiateCall(token, {
        learnerId: user.id,
        learnerPhoneNumber: phoneNumber,
      });

      setCallMsg(`Call initiated! Execution ID: ${result.executionSid}`);
      setCallPhoneNumber('');

      // Clear message after 4 seconds
      setTimeout(() => {
        setCallMsg('');
        setShowCallCard(false);
      }, 4000);
    } catch (err) {
      setCallMsg(`Call failed: ${err.message}`);
    } finally {
      setCallLoading(false);
    }
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const getResultTitle = (item) => item?.title || item?.link || 'Result';
  const getResultLink = (item) => item?.link || item?.url || '';
  const getResultSnippet = (item) => item?.snippet || item?.description || 'No summary available.';
  const getResultDisplayLink = (item) => item?.displayLink || item?.displayedLink || getDomain(getResultLink(item));

  const handleAuthAction = () => {
    const loginPath = user?.role === 'wellwisher' ? '/wellwisher/login' : '/login';
    if (token) {
      logout();
      navigate(loginPath);
      return;
    }

    navigate(loginPath);
  };

  useEffect(() => {
    if (!token || user?.role === 'wellwisher' || !user?.linkedWellwisherId || !user?.id) {
      setUnreadWellwisherCount(0);
      return undefined;
    }

    let alive = true;
    const storageKey = `educolink_wellwisher_last_seen_${user.id}`;

    const refreshUnreadCount = async () => {
      try {
        const data = await getMessages(token, user.linkedWellwisherId);
        const allMessages = data?.messages || [];
        const lastSeen = localStorage.getItem(storageKey) || '';

        const unread = allMessages.filter(
          (m) =>
            m.senderId === user.linkedWellwisherId &&
            (!lastSeen || new Date(m.createdAt || 0).getTime() > new Date(lastSeen).getTime()),
        ).length;

        if (alive) {
          setUnreadWellwisherCount(unread);
        }
      } catch {
        if (alive) {
          setUnreadWellwisherCount(0);
        }
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 8000);
    const onRead = () => refreshUnreadCount();
    window.addEventListener('educolink:wellwisher-messages-read', onRead);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      window.removeEventListener('educolink:wellwisher-messages-read', onRead);
    };
  }, [token, user?.id, user?.linkedWellwisherId, user?.role]);

  const markWellwisherMessagesAsRead = () => {
    if (!user?.id) {
      return;
    }

    localStorage.setItem(`educolink_wellwisher_last_seen_${user.id}`, new Date().toISOString());
    setUnreadWellwisherCount(0);
  };

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'S';

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setShowSearchCard(false);
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    setSearchError('');
    setShowSearchCard(true);
    setActiveQuery(trimmed);
    setSearchSource('educolink');

    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}`);

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];

      setSearchResults(results);
      if (!results.length) {
        setSearchError('No EducoLink result found. Click Google to fetch web result cards.');
      }
    } catch (err) {
      setSearchResults([]);
      setSearchError(err.message || 'Unable to fetch search results.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const openGoogleSearch = () => {
    const trimmed = query.trim() || activeQuery;
    if (!trimmed) {
      return;
    }

    runGoogleCardSearch(trimmed);
  };

  const runGoogleCardSearch = async (keyword) => {
    setLoadingSearch(true);
    setSearchError('');
    setShowSearchCard(true);
    setActiveQuery(keyword);
    setSearchSource('google');

    try {
      const response = await fetch(`${API_BASE_URL}/api/search/web?q=${encodeURIComponent(keyword)}`);
      if (!response.ok) {
        throw new Error('Unable to fetch web search results');
      }

      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      setGoogleProvider(data?.provider || 'web');
      setGoogleAnswer(data?.answer || null);
      setGoogleSnippet(data?.snippet || null);
      setGoogleKnowledge(data?.knowledge || null);

      setSearchResults(results);
      if (!results.length && !data?.answer && !data?.knowledge) {
        setSearchError('No results found. Try another keyword.');
      }
    } catch (err) {
      setSearchResults([]);
      setGoogleAnswer(null);
      setGoogleSnippet(null);
      setGoogleKnowledge(null);
      setSearchError(err.message || 'Unable to fetch web search results.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  const closeSearchCard = () => {
    setShowSearchCard(false);
  };

  const hasDirectAnswerSection = Boolean(googleAnswer || googleKnowledge || googleSnippet);

  const directAnswerText =
    googleAnswer ||
    (googleKnowledge?.title ? String(googleKnowledge.title) : null) ||
    googleSnippet ||
    '';

  const directAnswerSnippet =
    (googleAnswer && (googleSnippet || googleKnowledge?.description)) ||
    (!googleAnswer && googleKnowledge?.description) ||
    null;

  return (
    <>
      <header className="header">
        <div className="header-left">
        {!isSidebarOpen && (
          <img
            src="/Educolink%20logo.png"
            alt="EducoLink"
            className="header-mini-logo"
          />
        )}

        <button
          type="button"
          className="btn-icon nav-toggle-btn"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Hide navigation' : 'Show navigation'}
          aria-label={isSidebarOpen ? 'Hide navigation' : 'Show navigation'}
        >
          <IoMenuOutline />
        </button>

        <div className="header-search-wrap">
        <form className="header-search" onSubmit={handleSearchSubmit}>
          <IoSearchOutline />
          <input
            type="text"
            placeholder="Search modules, notes, lectures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="search-google-btn" onClick={openGoogleSearch}>
            Google
          </button>
        </form>

        {showSearchCard && searchSource !== 'google' && (
          <div className="search-result-card">
            <div className="search-card-header">
              <div>
                <h4>{searchSource === 'google' ? 'Google Web Cards' : 'EducoLink Results'}</h4>
                <p>{activeQuery}</p>
              </div>
              <button
                type="button"
                className="search-card-close"
                onClick={closeSearchCard}
                aria-label="Close search results"
              >
                <IoCloseOutline />
              </button>
            </div>

            {loadingSearch && <div className="search-card-state">Searching...</div>}
            {!loadingSearch && searchError && <div className="search-card-state">{searchError}</div>}

            {!loadingSearch && !searchError && (
              <div className="search-results-list">
                {searchResults.map((item) => (
                  <a key={item.link + item.title} href={item.link} className="search-result-item">
                    <h5>{item.title}</h5>
                    <p>{item.description}</p>
                    <span>
                      Read more <IoOpenOutline />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

        <div className="header-right">
        <FlipCardTimer />
        <button className="btn-icon" title="Toggle Theme">
          <IoSunnyOutline />
        </button>

        {/* Call button */}
        {token && (
          <div style={{ position: 'relative' }}>
            <button
              ref={callBtnRef}
              className="btn-icon call-btn"
              title="Quick Call"
              onClick={() => { setShowCallCard((v) => !v); setCallMsg(''); }}
              aria-label="Call"
            >
              <IoCallOutline />
            </button>

            {showCallCard && (
              <div ref={callCardRef} className="call-popup-card">
                <div className="call-popup-header">
                  <span>Quick Call</span>
                  <button type="button" className="search-card-close" onClick={() => setShowCallCard(false)} aria-label="Close Call"><IoCloseOutline /></button>
                </div>
                <p className="call-popup-hint">Enter phone number to call</p>
                <input
                  type="tel"
                  className="call-popup-input"
                  placeholder="e.g. +917870099934"
                  value={callPhoneNumber}
                  onChange={(e) => setCallPhoneNumber(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInitiateCall(); }}
                />
                {callMsg && (
                  <div className={`call-popup-msg ${callMsg.includes('initiated') ? 'success' : 'error'}`}>{callMsg}</div>
                )}
                <button
                  type="button"
                  className="call-popup-send"
                  onClick={handleInitiateCall}
                  disabled={callLoading}
                >
                  {callLoading ? 'Calling...' : <><IoCallOutline /> Call</>}
                </button>
              </div>
            )}
          </div>
        )}

        <button className="btn-icon" title="Notifications" style={{ position: 'relative' }} onClick={markWellwisherMessagesAsRead}>
          <IoNotificationsOutline />
          {unreadWellwisherCount > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '2px',
              minWidth: '16px', height: '16px', borderRadius: '999px',
              padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700,
              background: 'var(--error)', color: '#fff', border: '2px solid var(--surface-container-lowest)'
            }}>
              {unreadWellwisherCount > 9 ? '9+' : unreadWellwisherCount}
            </span>
          )}
        </button>

        {/* SOS button — learner only */}
        {token && user?.role !== 'wellwisher' && (
          <div style={{ position: 'relative' }}>
            <button
              ref={sosBtnRef}
              className="btn-icon sos-btn"
              title="Send SOS to Wellwisher"
              onClick={() => { setShowSosCard((v) => !v); setSosMsg(''); }}
              aria-label="SOS"
            >
              <IoAlertCircleOutline />
            </button>

            {showSosCard && (
              <div ref={sosCardRef} className="sos-popup-card">
                <div className="sos-popup-header">
                  <span>Send SOS</span>
                  <button type="button" className="search-card-close" onClick={() => setShowSosCard(false)} aria-label="Close SOS"><IoCloseOutline /></button>
                </div>
                <p className="sos-popup-hint">Up to 3 SOS per day. Explain what you need.</p>
                <textarea
                  className="sos-popup-textarea"
                  rows={3}
                  placeholder="I need help because..."
                  value={sosReason}
                  onChange={(e) => setSosReason(e.target.value)}
                />
                {sosMsg && (
                  <div className={`sos-popup-msg ${sosMsg.includes('sent') ? 'success' : 'error'}`}>{sosMsg}</div>
                )}
                {sosRemaining !== null && !sosMsg.includes('sent') && (
                  <div className="sos-popup-hint">{sosRemaining} requests remaining today.</div>
                )}
                <button
                  type="button"
                  className="sos-popup-send"
                  onClick={handleSosSubmit}
                  disabled={sosLoading}
                >
                  {sosLoading ? 'Sending...' : <><IoSendOutline /> Send SOS</>}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          className="auth-action-btn"
          onClick={handleAuthAction}
          title={token ? 'Logout' : 'Login'}
        >
          {token ? 'Logout' : 'Login'}
        </button>
        <div className="header-avatar" title="Profile">
          {userInitial}
        </div>
        </div>
      </header>

      {showSearchCard && searchSource === 'google' && (
        <>
          <div className="search-modal-backdrop" onClick={closeSearchCard} />
          <div className="search-result-card search-result-card-google">
            <div className="search-card-header">
              <div>
                <h4>Google Search</h4>
                <p>{activeQuery}</p>
                <p className="search-google-meta">Source: {googleProvider}</p>
              </div>
              <button
                type="button"
                className="search-card-close search-card-close-google"
                onClick={closeSearchCard}
                aria-label="Close search results"
              >
                <IoCloseOutline />
              </button>
            </div>

            {loadingSearch && <div className="search-card-state">Searching...</div>}
            {!loadingSearch && searchError && <div className="search-card-state">{searchError}</div>}

            {!loadingSearch && !searchError && (
              <div className="search-results-list search-results-list-google">
                {hasDirectAnswerSection && (
                  <section className="search-answer-card">
                    <div className="search-answer-title">{activeQuery}</div>
                    <div className="search-answer-text">{directAnswerText}</div>
                    {directAnswerSnippet && <p className="search-answer-snippet">{directAnswerSnippet}</p>}
                    <div className="search-answer-source">From Google</div>
                  </section>
                )}

                {searchResults.map((item, idx) => {
                  const title = getResultTitle(item);
                  const link = getResultLink(item);
                  const snippet = getResultSnippet(item);
                  const displayLink = getResultDisplayLink(item);
                  const key = `${link || 'nolink'}-${title}-${idx}`;

                  if (!link) {
                    return (
                      <div key={key} className="search-result-item search-result-item-google">
                        <div className="search-result-domain">{displayLink}</div>
                        <h5>{title}</h5>
                        <p>{snippet}</p>
                      </div>
                    );
                  }

                  return (
                    <a key={key} href={link} className="search-result-item search-result-item-google">
                      <div className="search-result-domain">{displayLink}</div>
                      <h5>{title}</h5>
                      <p>{snippet}</p>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
