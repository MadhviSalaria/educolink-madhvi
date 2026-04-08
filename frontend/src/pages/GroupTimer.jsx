import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoLeafOutline, IoTimerOutline } from 'react-icons/io5';
import '../styles/challengeTimer.css';

const DEFAULT_TASKS = [
  { id: 1, title: 'Complete Project Proposal', focusMinutes: 25, breakMinutes: 5 },
  { id: 2, title: 'Review Pull Requests', focusMinutes: 30, breakMinutes: 5 },
  { id: 3, title: 'Study React Performance', focusMinutes: 40, breakMinutes: 10 },
];

const PHASES = {
  focus: 'focus',
  shortBreak: 'short-break',
  longBreak: 'long-break',
};

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number.isFinite(totalSeconds) ? Math.floor(totalSeconds) : 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getPhaseLabel(phase) {
  if (phase === PHASES.shortBreak) return 'Short Break';
  if (phase === PHASES.longBreak) return 'Long Break';
  return 'Focus';
}

export default function GroupTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState(PHASES.focus);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);

  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [taskTitleInput, setTaskTitleInput] = useState('');
  const [taskFocusInput, setTaskFocusInput] = useState(25);
  const [taskBreakInput, setTaskBreakInput] = useState(5);
  const [taskSearch, setTaskSearch] = useState('');
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [message, setMessage] = useState('Personal timer ready. Create your challenge and start.');

  const currentPhaseSeconds = useMemo(() => {
    if (phase === PHASES.shortBreak) return Math.max(1, Number(breakMinutes) || 5) * 60;
    if (phase === PHASES.longBreak) return Math.max(1, Number(longBreakMinutes) || 15) * 60;
    return Math.max(1, Number(focusMinutes) || 25) * 60;
  }, [phase, focusMinutes, breakMinutes, longBreakMinutes]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setPhase((current) => {
            if (current === PHASES.focus) {
              setMessage('Focus complete. Take a short break.');
              return PHASES.shortBreak;
            }

            setMessage('Break complete. Back to focus challenge.');
            return PHASES.focus;
          });

          setIsRunning(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const progress = useMemo(() => {
    const total = Math.max(1, currentPhaseSeconds);
    return Math.min(1, Math.max(0, 1 - remainingSeconds / total));
  }, [remainingSeconds, currentPhaseSeconds]);

  const dewDrops = useMemo(
    () => Array.from({ length: 48 }, (_, index) => ({
      id: index,
      left: (index * 97) % 100,
      delay: -((index * 0.43) % 8),
      duration: 3.5 + (index % 9) * 0.45,
      size: 6 + (index % 5) * 4,
      opacity: 0.2 + ((index % 6) * 0.1),
    })),
    []
  );

  const activeDrops = Math.max(10, Math.floor(12 + progress * 36));

  const switchPhase = (nextPhase) => {
    const nextSeconds = nextPhase === PHASES.shortBreak
      ? Math.max(1, Number(breakMinutes) || 5) * 60
      : nextPhase === PHASES.longBreak
        ? Math.max(1, Number(longBreakMinutes) || 15) * 60
        : Math.max(1, Number(focusMinutes) || 25) * 60;

    setPhase(nextPhase);
    setIsRunning(false);
    setRemainingSeconds(nextSeconds);
    setMessage(`${getPhaseLabel(nextPhase)} selected.`);
  };

  const startTimer = () => {
    if (remainingSeconds <= 0) {
      setRemainingSeconds(currentPhaseSeconds);
    }
    setIsRunning(true);
    setMessage(`Challenge running: ${getPhaseLabel(phase)}.`);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    setMessage('Challenge paused.');
  };

  const resetTimer = () => {
    setIsRunning(false);
    setRemainingSeconds(currentPhaseSeconds);
    setMessage('Challenge reset.');
  };

  const handleSetTimer = () => {
    const safeFocus = Math.max(1, Math.min(180, Number(focusMinutes) || 25));
    const safeBreak = Math.max(1, Math.min(60, Number(breakMinutes) || 5));
    const safeLongBreak = Math.max(1, Math.min(120, Number(longBreakMinutes) || 15));

    setFocusMinutes(safeFocus);
    setBreakMinutes(safeBreak);
    setLongBreakMinutes(safeLongBreak);
    setIsRunning(false);

    if (phase === PHASES.focus) setRemainingSeconds(safeFocus * 60);
    if (phase === PHASES.shortBreak) setRemainingSeconds(safeBreak * 60);
    if (phase === PHASES.longBreak) setRemainingSeconds(safeLongBreak * 60);

    setMessage('Challenge durations updated.');
  };

  const handleAddTask = () => {
    const title = String(taskTitleInput || '').trim();
    if (!title) {
      setMessage('Task title cannot be empty.');
      return;
    }

    const nextFocus = Math.max(1, Math.min(180, Number(taskFocusInput) || 25));
    const nextBreak = Math.max(1, Math.min(60, Number(taskBreakInput) || 5));
    const nextLong = Math.max(nextBreak + 2, Math.min(120, nextBreak * 3));

    const task = {
      id: Date.now(),
      title,
      focusMinutes: nextFocus,
      breakMinutes: nextBreak,
    };

    setTasks((prev) => [task, ...prev]);
    setTaskTitleInput('');

    setFocusMinutes(nextFocus);
    setBreakMinutes(nextBreak);
    setLongBreakMinutes(nextLong);
    setPhase(PHASES.focus);
    setRemainingSeconds(nextFocus * 60);
    setIsRunning(true);
    setActiveTaskId(task.id);
    setMessage(`Challenge started: ${title}`);
  };

  const handleStartTask = (task) => {
    const nextLong = Math.max(task.breakMinutes + 2, Math.min(120, task.breakMinutes * 3));
    setFocusMinutes(task.focusMinutes);
    setBreakMinutes(task.breakMinutes);
    setLongBreakMinutes(nextLong);
    setPhase(PHASES.focus);
    setRemainingSeconds(task.focusMinutes * 60);
    setIsRunning(true);
    setActiveTaskId(task.id);
    setMessage(`Challenge started: ${task.title}`);
  };

  const filteredTasks = tasks.filter((task) => task.title.toLowerCase().includes(taskSearch.toLowerCase().trim()));

  return (
    <div className="module-page challenge-page">
      <div className="challenge-dew-layer" aria-hidden>
        {dewDrops.slice(0, activeDrops).map((drop) => (
          <span
            key={drop.id}
            className="challenge-dew-drop"
            style={{
              left: `${drop.left}%`,
              width: `${drop.size}px`,
              height: `${Math.round(drop.size * 1.35)}px`,
              opacity: drop.opacity,
              animationDuration: `${drop.duration}s`,
              animationDelay: `${drop.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="challenge-shell">
        <div
          className="module-hero challenge-glass"
          style={{ background: 'linear-gradient(135deg, rgba(114,185,255,0.28), rgba(109,255,190,0.22), rgba(255,255,255,0.55))' }}
        >
          <div className="module-hero-content">
            <h1>Challenge Timer</h1>
            <p>Personal focus timer with creative visual flow and task-driven challenges.</p>
          </div>
        </div>

        <div className="feature-grid" style={{ alignItems: 'start' }}>
          <div className="feature-card challenge-glass" style={{ gridColumn: '1 / -1' }}>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(63, 155, 255, 0.15)', color: '#3f9bff' }}>
                <IoTimerOutline />
              </div>
              <div>
                <div className="feature-card-title">Challenge Timer Dashboard</div>
                <div className="feature-card-subtitle">Personal timer, adaptive visuals, and challenge list</div>
              </div>
              <Link to="/study-room" className="btn-secondary" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                Back to Study Room
              </Link>
            </div>

            <div className="feature-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', alignItems: 'start' }}>
              <div className="challenge-glass" style={{ borderRadius: '16px', padding: '1rem 1rem 1.1rem' }}>
                <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ background: phase === PHASES.focus ? '#3f9bff' : '#fff', color: phase === PHASES.focus ? '#fff' : '#4b5563' }} onClick={() => switchPhase(PHASES.focus)}>Focus</button>
                  <button className="btn-secondary" style={{ background: phase === PHASES.shortBreak ? '#3f9bff' : '#fff', color: phase === PHASES.shortBreak ? '#fff' : '#4b5563' }} onClick={() => switchPhase(PHASES.shortBreak)}>Short Break</button>
                  <button className="btn-secondary" style={{ background: phase === PHASES.longBreak ? '#3f9bff' : '#fff', color: phase === PHASES.longBreak ? '#fff' : '#4b5563' }} onClick={() => switchPhase(PHASES.longBreak)}>Long Break</button>
                </div>

                <div style={{ border: '1px solid rgba(63,155,255,0.2)', background: 'rgba(240,249,255,0.7)', borderRadius: '14px', padding: '0.9rem', marginBottom: '0.8rem' }}>
                  <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#487595', fontWeight: 700 }}>Current Challenge Phase</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1f5275' }}>{getPhaseLabel(phase)}</div>
                  <div style={{ marginTop: '0.2rem', color: '#487595' }}>Rain intensity: <strong>{Math.round(progress * 100)}%</strong></div>
                </div>

                <div style={{ display: 'grid', placeItems: 'center', padding: '0.65rem 0 1rem' }}>
                  <div style={{ width: '250px', height: '250px', borderRadius: '50%', border: '10px solid rgba(154,199,255,0.35)', background: 'rgba(255,255,255,0.85)', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: '0 12px 40px rgba(52, 125, 196, 0.18)' }}>
                    <div>
                      <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f2740', lineHeight: 1 }}>{formatCountdown(remainingSeconds)}</div>
                      <div style={{ marginTop: '0.35rem', color: '#4f6d86', fontWeight: 600 }}>{getPhaseLabel(phase)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <input type="number" min={1} max={180} value={focusMinutes} onChange={(event) => setFocusMinutes(event.target.value)} placeholder="Focus" style={{ borderRadius: '12px', border: '1px solid #bdd5e6', padding: '0.55rem 0.7rem' }} />
                  <input type="number" min={1} max={60} value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} placeholder="Short" style={{ borderRadius: '12px', border: '1px solid #bdd5e6', padding: '0.55rem 0.7rem' }} />
                  <input type="number" min={1} max={120} value={longBreakMinutes} onChange={(event) => setLongBreakMinutes(event.target.value)} placeholder="Long" style={{ borderRadius: '12px', border: '1px solid #bdd5e6', padding: '0.55rem 0.7rem' }} />
                  <button className="btn-secondary" style={{ minWidth: '90px' }} onClick={handleSetTimer}>Set</button>
                </div>

                <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" style={{ minWidth: '130px' }} onClick={startTimer}>Start</button>
                  <button className="btn-secondary" style={{ minWidth: '100px' }} onClick={pauseTimer}>Pause</button>
                  <button className="btn-secondary" style={{ minWidth: '100px' }} onClick={resetTimer}>Reset</button>
                </div>

                <div style={{ marginTop: '0.5rem', fontSize: '0.84rem', color: '#0f766e', fontWeight: 700 }}>{message}</div>
              </div>

              <div className="challenge-glass" style={{ borderRadius: '16px', padding: '1rem', minHeight: '100%' }}>
                <div style={{ fontWeight: 800, marginBottom: '0.8rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IoLeafOutline />
                  Challenge Tasks
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.45rem', marginBottom: '0.55rem' }}>
                  <input
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search challenge..."
                    style={{ borderRadius: '11px', border: '1px solid #bdd5e6', padding: '0.58rem 0.7rem' }}
                  />
                  <button className="btn-secondary" onClick={handleAddTask}>+ Add</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: '0.45rem', marginBottom: '0.8rem' }}>
                  <input
                    value={taskTitleInput}
                    onChange={(event) => setTaskTitleInput(event.target.value)}
                    placeholder="New challenge title"
                    style={{ borderRadius: '11px', border: '1px solid #bdd5e6', padding: '0.58rem 0.7rem' }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={taskFocusInput}
                    onChange={(event) => setTaskFocusInput(event.target.value)}
                    placeholder="F"
                    style={{ borderRadius: '11px', border: '1px solid #bdd5e6', padding: '0.58rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={taskBreakInput}
                    onChange={(event) => setTaskBreakInput(event.target.value)}
                    placeholder="B"
                    style={{ borderRadius: '11px', border: '1px solid #bdd5e6', padding: '0.58rem 0.5rem' }}
                  />
                </div>

                {filteredTasks.map((task) => (
                  <div key={task.id} style={{ border: '1px solid #cfe0ee', background: activeTaskId === task.id ? 'rgba(216, 239, 255, 0.85)' : 'rgba(247, 252, 255, 0.9)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.6rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{task.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#50708a', marginBottom: '0.45rem' }}>Focus {task.focusMinutes}m / Break {task.breakMinutes}m</div>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleStartTask(task)}>
                      Start Challenge
                    </button>
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', padding: '0.4rem 0.1rem' }}>
                    No challenge task found. Add a new one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
