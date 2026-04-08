import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { IoTimerOutline } from 'react-icons/io5';
import { useGroupTimer } from '../context/GroupTimerContext';

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number.isFinite(totalSeconds) ? Math.floor(totalSeconds) : 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function GroupTimer() {
  const {
    connected,
    roomId,
    timer,
    error,
    isHost,
    joinRoom,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerDurations,
    setTimerMode,
  } = useGroupTimer();

  const [roomInput, setRoomInput] = useState(roomId);
  const [joinMessage, setJoinMessage] = useState('');
  const [showRoomSection, setShowRoomSection] = useState(false);
  const [focusMinutesInput, setFocusMinutesInput] = useState(25);
  const [breakMinutesInput, setBreakMinutesInput] = useState(5);

  const phaseLabel = useMemo(() => (timer.phase === 'break' ? 'Break' : 'Focus'), [timer.phase]);

  useEffect(() => {
    setRoomInput(roomId);
  }, [roomId]);

  useEffect(() => {
    setFocusMinutesInput(Math.max(1, Math.round((timer.focusSeconds || 1500) / 60)));
    setBreakMinutesInput(Math.max(1, Math.round((timer.breakSeconds || 300) / 60)));
  }, [timer.focusSeconds, timer.breakSeconds]);

  useEffect(() => {
    const savedRoom = localStorage.getItem('groupTimerRoom');
    if (savedRoom && String(savedRoom).trim()) {
      setShowRoomSection(true);
      setJoinMessage('Joined successfully');
    }
  }, []);

  const handleJoinRoom = () => {
    const enteredRoom = String(roomInput || '').trim();
    if (!enteredRoom) {
      alert('Please enter a room name.');
      setJoinMessage('Room name cannot be empty.');
      return;
    }

    joinRoom(enteredRoom);
    localStorage.setItem('groupTimerRoom', enteredRoom);
    setShowRoomSection(true);
    setJoinMessage('Joined successfully');
  };

  const handleSetTimer = () => {
    const nextFocus = Math.max(1, Math.min(180, Number(focusMinutesInput) || 25));
    const nextBreak = Math.max(1, Math.min(60, Number(breakMinutesInput) || 5));
    setTimerDurations(nextFocus, nextBreak);
    setJoinMessage('Timer updated');
  };

  return (
    <div className="module-page">
      <div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(242,138,55,0.9), rgba(252,191,128,0.8), rgba(255,235,213,0.85))' }}
      >
        <div className="module-hero-content">
          <h1>Group Timer</h1>
          <p>Dedicated synced timer screen for focused group study sessions.</p>
        </div>
      </div>

      <div className="feature-grid" style={{ alignItems: 'start' }}>
        <div className="feature-card" style={{ gridColumn: '1 / -1' }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(242,138,55,0.15)', color: '#f28a37' }}><IoTimerOutline /></div>
            <div>
              <div className="feature-card-title">Group Timer Dashboard</div>
              <div className="feature-card-subtitle">Room sync, pomodoro controls, and task panel</div>
            </div>
            <Link to="/study-room" className="btn-secondary" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
              Back to Study Room
            </Link>
          </div>

          <div className="feature-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            <div style={{ background: '#f5f6f9', border: '1px solid #e2e5eb', borderRadius: '16px', padding: '1rem 1rem 1.1rem' }}>
              <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ background: timer.phase === 'focus' ? '#f28a37' : '#fff', color: timer.phase === 'focus' ? '#fff' : '#4b5563' }} onClick={() => setTimerMode('focus')}>Focus</button>
                <button className="btn-secondary" style={{ background: timer.phase === 'break' && timer.breakMode !== 'long' ? '#f28a37' : '#fff', color: timer.phase === 'break' && timer.breakMode !== 'long' ? '#fff' : '#4b5563' }} onClick={() => setTimerMode('short-break')}>Short Break</button>
                <button className="btn-secondary" style={{ background: timer.phase === 'break' && timer.breakMode === 'long' ? '#f28a37' : '#fff', color: timer.phase === 'break' && timer.breakMode === 'long' ? '#fff' : '#4b5563' }} onClick={() => setTimerMode('long-break')}>Long Break</button>
              </div>

              <div id="roomSection" style={{ border: '1px solid #efd5de', background: '#f9eef2', borderRadius: '14px', padding: '0.9rem', display: showRoomSection ? 'block' : 'none', marginBottom: '0.8rem' }}>
                <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#6e7282', fontWeight: 700 }}>Room Code</div>
                <div id="roomName" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#933c5f' }}>{roomId.toUpperCase()}</div>
                <div style={{ marginTop: '0.2rem', color: '#6e7282' }}>Phase: <strong style={{ color: '#933c5f' }}>{phaseLabel}</strong></div>
              </div>

              <div style={{ display: 'grid', placeItems: 'center', padding: '0.65rem 0 1rem' }}>
                <div style={{ width: '250px', height: '250px', borderRadius: '50%', border: '10px solid #e8e9ee', background: '#fafbfc', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{formatCountdown(timer.remainingSeconds)}</div>
                    <div style={{ marginTop: '0.35rem', color: '#6b7280', fontWeight: 600 }}>{phaseLabel}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem', marginBottom: '0.65rem' }}>
                <input id="roomInput" value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="Enter Room Code" style={{ borderRadius: '12px', border: '1px solid #d7dbe3', padding: '0.65rem 0.8rem', background: '#fff' }} />
                <button className="btn-secondary" style={{ minWidth: '90px' }} onClick={handleJoinRoom}>Join</button>
              </div>

              {joinMessage && <div style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 700, marginBottom: '0.5rem' }}>{joinMessage}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <input type="number" min={1} max={180} value={focusMinutesInput} onChange={(event) => setFocusMinutesInput(event.target.value)} placeholder="Focus" style={{ borderRadius: '12px', border: '1px solid #d7dbe3', padding: '0.55rem 0.7rem' }} />
                <input type="number" min={1} max={60} value={breakMinutesInput} onChange={(event) => setBreakMinutesInput(event.target.value)} placeholder="Break" style={{ borderRadius: '12px', border: '1px solid #d7dbe3', padding: '0.55rem 0.7rem' }} />
                <button className="btn-secondary" style={{ minWidth: '90px' }} onClick={handleSetTimer}>Set</button>
              </div>

              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ minWidth: '130px' }} disabled={!isHost} onClick={startTimer} title={isHost ? 'Start for everyone' : 'Only host can start'}>Start {isHost ? '(Host)' : ''}</button>
                <button className="btn-secondary" style={{ minWidth: '100px' }} onClick={pauseTimer}>Pause</button>
                <button className="btn-secondary" style={{ minWidth: '100px' }} disabled={!isHost} onClick={resetTimer}>Reset</button>
              </div>

              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: connected ? '#0f766e' : '#b91c1c' }}>{connected ? 'Live sync connected' : 'Live sync disconnected'}</div>
              {!isHost && <div style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: '#6b7280' }}>Host controls Start/Reset.</div>}
              {error && <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>{error}</div>}
            </div>

            <div style={{ background: '#f7f7fa', border: '1px solid #e1e4ea', borderRadius: '16px', padding: '1rem', minHeight: '100%' }}>
              <div style={{ fontWeight: 800, marginBottom: '0.8rem', color: '#374151' }}>Tasks</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.45rem', marginBottom: '0.8rem' }}>
                <input placeholder="Search Task..." style={{ borderRadius: '11px', border: '1px solid #d7dbe3', padding: '0.58rem 0.7rem' }} />
                <button className="btn-secondary">+ Add</button>
              </div>

              {['Complete Project Proposal', 'Review Pull Requests', 'Study React Performance'].map((task) => (
                <div key={task} style={{ border: '1px solid #dde2ea', background: '#f2f4f8', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.6rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{task}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>Track and start synced Pomodoro for this task.</div>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startTimer} disabled={!isHost}>Start Timer</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
