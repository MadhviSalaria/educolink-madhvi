import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import {
  IoPeopleOutline, IoChatbubblesOutline, IoDocumentTextOutline,
  IoEaselOutline, IoShareSocialOutline, IoTimerOutline,
  IoAddOutline, IoVideocamOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh, IllustrationNetwork } from '../components/SVGBackgrounds/SVGBackgrounds';
import { useGroupTimer } from '../context/GroupTimerContext';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const rooms = [
  { name: 'Math Study Group', members: 5, active: true },
  { name: 'Physics Revision', members: 3, active: true },
  { name: 'CS Algorithms', members: 8, active: false },
];

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number.isFinite(totalSeconds) ? Math.floor(totalSeconds) : 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function StudyRoom() {
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
  } = useGroupTimer();
  const [roomInput, setRoomInput] = useState(roomId);
  const [joinMessage, setJoinMessage] = useState('');
  const [showRoomSection, setShowRoomSection] = useState(false);

  const phaseLabel = useMemo(() => (timer.phase === 'break' ? 'Break' : 'Focus'), [timer.phase]);

  useEffect(() => {
    setRoomInput(roomId);
  }, [roomId]);

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

  const illustrations = [
    <IoChatbubblesOutline key="0" />,
    <IoEaselOutline key="1" />,
    <IoDocumentTextOutline key="2" />,
    <IoTimerOutline key="3" />
  ];

  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#c49000', '#f0c040', '#ffe082']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(196,144,0,0.7), rgba(240,192,64,0.5), rgba(255,224,130,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-illustration" style={{ position: 'absolute', top: '-40px', right: '40px', opacity: 0.12, width: '300px', height: '300px' }}>
          <IllustrationNetwork />
        </div>
        <div className="module-hero-content">
          <h1>Study Room</h1>
          <p>Collaborate, discuss, and learn together in real-time study rooms.</p>
        </div>
      </motion.div>

      {/* Active Rooms */}
      <motion.div className="clay-card" style={{ marginBottom: 'var(--space-6)' }} variants={container} initial="hidden" animate="show">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <h3 className="headline-sm">Active Rooms</h3>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IoAddOutline /> Create Room
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rooms.map((room, i) => (
            <motion.div key={i} className="feature-item" variants={item} style={{ justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="feature-item-icon" style={{ background: room.active ? 'rgba(0,104,90,0.15)' : 'rgba(115,119,123,0.1)', color: room.active ? '#00685a' : '#73777b' }}>
                  <IoPeopleOutline />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{room.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>{room.members} members</div>
                </div>
              </div>
              <span className={`status-badge ${room.active ? 'status-online' : 'status-busy'}`}>
                {room.active ? 'Active' : 'Offline'}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div className="feature-grid" variants={container} initial="hidden" animate="show" style={{ alignItems: 'stretch' }}>
        <motion.div className="feature-card" variants={item} style={{ gridColumn: '1 / -1', maxWidth: '980px', width: '100%', margin: '0 auto' }}>
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(-5deg)' }}>
            {illustrations[0]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-study)', color: '#c49000' }}><IoChatbubblesOutline /></div>
            <div>
              <div className="feature-card-title">Real-time Discussion</div>
              <div className="feature-card-subtitle">Chat and share ideas</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(196,144,0,0.1)', color: '#c49000' }}><IoChatbubblesOutline /></div>Group messaging</div>
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(196,144,0,0.1)', color: '#c49000' }}><IoShareSocialOutline /></div>Share resources</div>
          </div>
        </motion.div>

        <motion.div className="feature-card" variants={item}>
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(8deg)' }}>
            {illustrations[1]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-ai)', color: '#574db3' }}><IoEaselOutline /></div>
            <div>
              <div className="feature-card-title">Collaborative Whiteboard</div>
              <div className="feature-card-subtitle">Draw and explain together</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}><IoEaselOutline /></div>Shared drawing canvas</div>
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}><IoVideocamOutline /></div>Screen sharing</div>
          </div>
          <div className="feature-card-action">
            <Link to="/whiteboard" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Launch Whiteboard
            </Link>
          </div>
        </motion.div>

        <motion.div className="feature-card" variants={item}>
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(-5deg)' }}>
            {illustrations[2]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-notes)', color: '#00685a' }}><IoDocumentTextOutline /></div>
            <div>
              <div className="feature-card-title">Shared Resources</div>
              <div className="feature-card-subtitle">Upload and access files</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(0,104,90,0.1)', color: '#00685a' }}><IoDocumentTextOutline /></div>Shared notes & PDFs</div>
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(0,104,90,0.1)', color: '#00685a' }}><IoShareSocialOutline /></div>Collaborative editing</div>
          </div>
        </motion.div>

        <motion.div className="feature-card" variants={item} style={{ paddingBottom: '0.2rem' }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'rgba(242,138,55,0.15)', color: '#f28a37' }}><IoTimerOutline /></div>
            <div>
              <div className="feature-card-title">Group Timer</div>
              <div className="feature-card-subtitle">Same layout + synced controls in Study Room</div>
            </div>
          </div>

          <div className="feature-card-body" style={{ paddingTop: '0.7rem' }}>
            <div className="feature-item" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="feature-item-icon" style={{ background: 'rgba(180,19,64,0.1)', color: '#b41340' }}><IoTimerOutline /></div>
                <span>Synced Pomodoro timer</span>
              </div>
              <span className={`status-badge ${connected ? 'status-online' : 'status-busy'}`}>{connected ? 'Live' : 'Offline'}</span>
            </div>

            <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'flex-start' }}>
              <Link to="/group-timer" className="btn-primary" style={{ minWidth: '170px', textDecoration: 'none', textAlign: 'center' }}>
                Open Group Timer
              </Link>
            </div>

            <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem' }}>
                <input
                  id="roomInput"
                  value={roomInput}
                  onChange={(event) => setRoomInput(event.target.value)}
                  placeholder="Enter Room Code"
                  style={{ borderRadius: '12px', border: '1px solid #d7dbe3', padding: '0.65rem 0.8rem', background: '#fff' }}
                />
                <button className="btn-secondary" style={{ minWidth: '88px' }} onClick={handleJoinRoom}>Join</button>
              </div>

              {joinMessage && <div style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 700 }}>{joinMessage}</div>}

              <div id="roomSection" style={{
                borderRadius: '16px',
                padding: '0.9rem',
                background: 'rgba(180,19,64,0.08)',
                border: '1px solid rgba(180,19,64,0.15)',
                display: showRoomSection ? 'flex' : 'none',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.8rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#6e7282', fontWeight: 700, textTransform: 'uppercase' }}>Room Code</div>
                  <div id="roomName" style={{ fontSize: '1rem', fontWeight: 700, color: '#933c5f' }}>{roomId.toUpperCase()}</div>
                  <div style={{ marginTop: '0.2rem', color: '#6e7282' }}>Phase: <strong style={{ color: '#933c5f' }}>{phaseLabel}</strong></div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b41340', letterSpacing: '0.03em' }}>{formatCountdown(timer.remainingSeconds)}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ minWidth: '128px' }} disabled={!isHost} onClick={startTimer}>Start {isHost ? '(Host)' : ''}</button>
                <button className="btn-secondary" style={{ minWidth: '96px' }} onClick={pauseTimer}>Pause</button>
                <button className="btn-secondary" style={{ minWidth: '96px' }} disabled={!isHost} onClick={resetTimer}>Reset</button>
              </div>

              {error && <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>{error}</div>}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
