import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoSettingsOutline,
  IoNotificationsOutline,
  IoMoonOutline,
  IoShieldCheckmarkOutline,
  IoLanguageOutline,
} from 'react-icons/io5';

const options = [
  { title: 'Notifications', desc: 'Manage study reminders and alerts.', icon: <IoNotificationsOutline /> },
  { title: 'Appearance', desc: 'Tune theme density and visual comfort.', icon: <IoMoonOutline /> },
  { title: 'Privacy', desc: 'Control account data and permissions.', icon: <IoShieldCheckmarkOutline /> },
  { title: 'Language', desc: 'Set your preferred app language.', icon: <IoLanguageOutline /> },
];

export default function Settings() {
  return (
    <div className="module-page">
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, #3f3f46, #71717a, #a1a1aa)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Settings</h1>
          <p>Configure your account, preferences, and app behavior.</p>
        </div>
      </motion.div>

      <div className="feature-grid">
        {options.map((opt) => (
          <motion.div
            key={opt.title}
            className="feature-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(63,63,70,0.14)', color: '#3f3f46' }}>
                {opt.icon}
              </div>
              <div>
                <div className="feature-card-title">{opt.title}</div>
                <div className="feature-card-subtitle">Preference</div>
              </div>
            </div>
            <div className="feature-card-body">
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(63,63,70,0.14)', color: '#3f3f46' }}>
                  <IoSettingsOutline />
                </div>
                {opt.desc}
              </div>
            </div>
            {opt.path && (
              <div className="feature-card-action">
                <Link to={opt.path} className="btn-secondary premium-link-btn">
                  Open
                </Link>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
