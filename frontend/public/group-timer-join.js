// Step 1: Get all required elements from the page.
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const roomSection = document.getElementById('roomSection');
const roomNameEl = document.getElementById('roomName');
const timerDisplayEl = document.getElementById('timerDisplay');
const phaseDisplayEl = document.getElementById('phaseDisplay');
const statusMessageEl = document.getElementById('statusMessage');
const roleBadgeEl = document.getElementById('roleBadge');
const permissionMessageEl = document.getElementById('permissionMessage');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const setTimerBtn = document.getElementById('setTimerBtn');
const focusInput = document.getElementById('focusInput');
const breakInput = document.getElementById('breakInput');
const focusTab = document.getElementById('focusTab');
const shortBreakTab = document.getElementById('shortBreakTab');
const longBreakTab = document.getElementById('longBreakTab');

// Step 2: Define storage keys and defaults.
const CURRENT_ROOM_KEY = 'edulink:currentRoom';
const CLIENT_ID_KEY = 'edulink:clientId';
const FOCUS_DEFAULT = 25;
const BREAK_DEFAULT = 5;

// Step 3: Create (or restore) a client id to track host/member role.
let clientId = sessionStorage.getItem(CLIENT_ID_KEY);
if (!clientId) {
  clientId = `client-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(CLIENT_ID_KEY, clientId);
}

// Step 4: Keep active room and active state in memory.
let activeRoom = '';
let activeState = null;
let hostTickInterval = null;
let lastRenderedPhase = '';

// Step 5: Helpers for room key, text, and formatting.
function sanitizeRoomCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

function roomStateKey(roomCode) {
  return `edulink:room:${roomCode}`;
}

function formatMMSS(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function showMessage(message, isError = false) {
  statusMessageEl.textContent = message;
  statusMessageEl.classList.toggle('danger', isError);
}

function setActiveTab(tabName) {
  focusTab.classList.remove('active');
  shortBreakTab.classList.remove('active');
  longBreakTab.classList.remove('active');

  if (tabName === 'focus') {
    focusTab.classList.add('active');
  } else if (tabName === 'long') {
    longBreakTab.classList.add('active');
  } else {
    shortBreakTab.classList.add('active');
  }
}

// Step 6: Build a fresh room state.
function createRoomState(roomCode) {
  return {
    roomCode,
    hostId: clientId,
    phase: 'focus',
    isRunning: false,
    remainingSeconds: FOCUS_DEFAULT * 60,
    focusMinutes: FOCUS_DEFAULT,
    breakMinutes: BREAK_DEFAULT,
    breakMode: 'short',
    updatedAt: Date.now(),
  };
}

// Step 7: Save and load room state from localStorage.
function loadRoomState(roomCode) {
  const raw = localStorage.getItem(roomStateKey(roomCode));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveRoomState(nextState) {
  nextState.updatedAt = Date.now();
  localStorage.setItem(roomStateKey(nextState.roomCode), JSON.stringify(nextState));
  activeState = nextState;
  renderState(nextState);
}

// Step 8: Check role-based permissions.
function isHost() {
  return Boolean(activeState && activeState.hostId === clientId);
}

// Step 9: Render state into UI.
function renderState(state) {
  if (!state) {
    roomSection.style.display = 'none';
    roleBadgeEl.style.display = 'none';
    permissionMessageEl.textContent = '';
    return;
  }

  roomSection.style.display = 'grid';
  roomNameEl.textContent = state.roomCode.toUpperCase();
  timerDisplayEl.textContent = formatMMSS(state.remainingSeconds);
  phaseDisplayEl.textContent = state.phase === 'break' ? 'Break' : 'Focus';
  focusInput.value = state.focusMinutes;
  breakInput.value = state.breakMinutes;
  setActiveTab(state.phase === 'focus' ? 'focus' : (state.breakMode || 'short'));

  const hostView = isHost();
  roleBadgeEl.style.display = 'inline-flex';
  roleBadgeEl.textContent = hostView ? 'Role: Host' : 'Role: Member';

  startBtn.disabled = !hostView;
  resetBtn.disabled = !hostView;

  if (hostView) {
    permissionMessageEl.textContent = 'You are host. Start and Reset are enabled.';
  } else {
    permissionMessageEl.textContent = 'Host controls Start and Reset. Pause is available for all.';
  }

  if (lastRenderedPhase && lastRenderedPhase !== state.phase) {
    alert(state.phase === 'break' ? 'Focus ended. Break started.' : 'Break ended. Focus started.');
  }
  lastRenderedPhase = state.phase;
}

// Step 10: Start host-side ticker (setInterval required).
function startHostTicker() {
  if (hostTickInterval) {
    clearInterval(hostTickInterval);
  }

  hostTickInterval = setInterval(() => {
    if (!activeState || !isHost() || !activeState.isRunning) {
      return;
    }

    const next = { ...activeState };
    next.remainingSeconds -= 1;

    if (next.remainingSeconds <= 0) {
      if (next.phase === 'focus') {
        next.phase = 'break';
        next.breakMode = 'short';
        next.remainingSeconds = next.breakMinutes * 60;
      } else {
        next.phase = 'focus';
        next.breakMode = 'short';
        next.remainingSeconds = next.focusMinutes * 60;
      }
    }

    saveRoomState(next);
  }, 1000);
}

// Step 11: Join room flow (create if not exists).
function joinRoom() {
  const entered = sanitizeRoomCode(roomInput.value);

  if (!entered) {
    alert('Please enter a room code.');
    showMessage('Room code cannot be empty.', true);
    roomInput.focus();
    return;
  }

  activeRoom = entered;
  localStorage.setItem(CURRENT_ROOM_KEY, entered);

  let roomState = loadRoomState(entered);
  if (!roomState) {
    roomState = createRoomState(entered);
    localStorage.setItem(roomStateKey(entered), JSON.stringify(roomState));
  }

  activeState = roomState;
  renderState(roomState);

  startHostTicker();
  showMessage('Joined successfully');
}

// Step 12: Timer controls.
function handleStart() {
  if (!activeState || !isHost()) {
    showMessage('Only host can start the timer.', true);
    return;
  }

  const next = { ...activeState, isRunning: true };
  saveRoomState(next);
}

function handlePause() {
  if (!activeState) {
    return;
  }

  const next = { ...activeState, isRunning: false };
  saveRoomState(next);
}

function handleReset() {
  if (!activeState || !isHost()) {
    showMessage('Only host can reset the timer.', true);
    return;
  }

  const next = {
    ...activeState,
    isRunning: false,
    phase: 'focus',
    breakMode: 'short',
    remainingSeconds: activeState.focusMinutes * 60,
  };
  saveRoomState(next);
}

// Step 13: Custom focus-break setter.
function handleSetTimer() {
  if (!activeState) {
    showMessage('Join a room first.', true);
    return;
  }

  const focusMinutes = Number(focusInput.value);
  const breakMinutes = Number(breakInput.value);

  if (!Number.isFinite(focusMinutes) || focusMinutes < 1 || focusMinutes > 180) {
    showMessage('Focus minutes must be between 1 and 180.', true);
    return;
  }

  if (!Number.isFinite(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) {
    showMessage('Break minutes must be between 1 and 60.', true);
    return;
  }

  const next = {
    ...activeState,
    focusMinutes,
    breakMinutes,
    isRunning: false,
    phase: 'focus',
    breakMode: 'short',
    remainingSeconds: focusMinutes * 60,
  };

  saveRoomState(next);
  showMessage('Custom timer updated.');
}

function handleModeChange(mode) {
  if (!activeState) {
    showMessage('Join a room first.', true);
    return;
  }

  if (!isHost()) {
    showMessage('Only host can change mode.', true);
    return;
  }

  let next = { ...activeState, isRunning: false };

  if (mode === 'focus') {
    next.phase = 'focus';
    next.breakMode = 'short';
    next.remainingSeconds = next.focusMinutes * 60;
  } else if (mode === 'long') {
    const longBreakMinutes = Math.max(1, Math.min(120, next.breakMinutes * 3));
    next.phase = 'break';
    next.breakMode = 'long';
    next.remainingSeconds = longBreakMinutes * 60;
  } else {
    next.phase = 'break';
    next.breakMode = 'short';
    next.remainingSeconds = next.breakMinutes * 60;
  }

  saveRoomState(next);
}

// Step 14: Attach all button events.
joinBtn.addEventListener('click', joinRoom);
startBtn.addEventListener('click', handleStart);
pauseBtn.addEventListener('click', handlePause);
resetBtn.addEventListener('click', handleReset);
setTimerBtn.addEventListener('click', handleSetTimer);
focusTab.addEventListener('click', () => handleModeChange('focus'));
shortBreakTab.addEventListener('click', () => handleModeChange('short'));
longBreakTab.addEventListener('click', () => handleModeChange('long'));

roomInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    joinRoom();
  }
});

// Step 15: Sync updates from other tabs in same browser.
window.addEventListener('storage', (event) => {
  if (!activeRoom) {
    return;
  }

  if (event.key !== roomStateKey(activeRoom)) {
    return;
  }

  const latest = loadRoomState(activeRoom);
  if (!latest) {
    return;
  }

  activeState = latest;
  renderState(latest);
});

// Step 16: Auto-join saved room after reload.
window.addEventListener('DOMContentLoaded', () => {
  const savedRoom = sanitizeRoomCode(localStorage.getItem(CURRENT_ROOM_KEY));
  if (!savedRoom) {
    return;
  }

  roomInput.value = savedRoom;
  joinRoom();
});
