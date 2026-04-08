import { useEffect, useState } from 'react';
import './FlipCardTimer.css';

function pad(num) {
  return num.toString().padStart(2, '0');
}

export default function FlipCardTimer() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return (
    <div className="compact-clock" aria-label="Current time">
      <ClockCell value={hours} label="HRS" />
      <span className="compact-clock-sep">:</span>
      <ClockCell value={minutes} label="MIN" />
      <span className="compact-clock-sep compact-clock-sep-soft">:</span>
      <ClockCell value={seconds} label="SEC" subtle />
    </div>
  );
}

function ClockCell({ value, label, subtle = false }) {
  return (
    <div className={`compact-clock-cell ${subtle ? 'is-subtle' : ''}`}>
      <div className="compact-clock-value">{value}</div>
      <div className="compact-clock-label">{label}</div>
    </div>
  );
}
