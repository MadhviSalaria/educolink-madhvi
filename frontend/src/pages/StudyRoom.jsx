import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoPeopleOutline, IoChatbubblesOutline, IoDocumentTextOutline,
  IoEaselOutline, IoShareSocialOutline, IoTimerOutline,
  IoAddOutline, IoVideocamOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh, IllustrationNetwork } from '../components/SVGBackgrounds/SVGBackgrounds';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const rooms = [
  { name: 'Math Study Group', members: 5, active: true },
  { name: 'Physics Revision', members: 3, active: true },
  { name: 'CS Algorithms', members: 8, active: false },
];

export default function StudyRoom() {
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
              <div className="feature-card-title">Challenge Timer</div>
              <div className="feature-card-subtitle">Personal focus timer with immersive visual effects</div>
            </div>
          </div>

          <div className="feature-card-body" style={{ paddingTop: '0.7rem' }}>
            <div className="feature-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="feature-item-icon" style={{ background: 'rgba(180,19,64,0.1)', color: '#b41340' }}><IoTimerOutline /></div>
                <span>Personal challenge flow with animated dew-drop background</span>
              </div>
            </div>

            <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'flex-start' }}>
              <Link to="/challenge-timer" className="btn-primary" style={{ minWidth: '190px', textDecoration: 'none', textAlign: 'center' }}>
                Open Challenge Timer
              </Link>
            </div>

            <div style={{ marginTop: 'var(--space-4)', fontSize: '0.92rem', color: 'var(--outline)' }}>
              Build your own focus challenge, select phase, and watch dynamic rain-like dew effects increase as the timer progresses.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
