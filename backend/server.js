import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

const { default: app } = await import('./src/app.js');

const port = Number(process.env.PORT || 5001);
const httpServer = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Socket origin blocked by CORS policy'));
    },
    credentials: true,
  },
});

const roomSnapshots = new Map();
const timerSessions = new Map();

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const sanitizeRoomId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '')
  .slice(0, 24) || 'studio';

const timerRoomName = (roomId) => `timer:${roomId}`;

const createDefaultTimerSession = (hostSocketId = null) => ({
  phase: 'focus',
  remainingSeconds: FOCUS_SECONDS,
  focusSeconds: FOCUS_SECONDS,
  breakSeconds: BREAK_SECONDS,
  breakMode: 'short',
  isRunning: false,
  hostSocketId,
  updatedAt: Date.now(),
  intervalHandle: null,
});

const serializeTimerSession = (session) => ({
  phase: session.phase,
  remainingSeconds: session.remainingSeconds,
  focusSeconds: session.focusSeconds,
  breakSeconds: session.breakSeconds,
  breakMode: session.breakMode,
  isRunning: session.isRunning,
  hostSocketId: session.hostSocketId,
  updatedAt: session.updatedAt,
});

const emitTimerState = (roomId) => {
  const session = timerSessions.get(roomId);
  if (!session) {
    return;
  }

  io.to(timerRoomName(roomId)).emit('groupTimer:state', {
    roomId,
    state: serializeTimerSession(session),
  });
};

const stopTimerInterval = (session) => {
  if (session?.intervalHandle) {
    clearInterval(session.intervalHandle);
    session.intervalHandle = null;
  }
};

const startTimerInterval = (roomId) => {
  const session = timerSessions.get(roomId);
  if (!session || session.intervalHandle) {
    return;
  }

  session.intervalHandle = setInterval(() => {
    const active = timerSessions.get(roomId);
    if (!active) {
      return;
    }

    if (!active.isRunning) {
      stopTimerInterval(active);
      return;
    }

    active.remainingSeconds -= 1;
    if (active.remainingSeconds <= 0) {
      if (active.phase === 'focus') {
        active.phase = 'break';
        active.breakMode = 'short';
        active.remainingSeconds = active.breakSeconds;
      } else {
        active.phase = 'focus';
        active.breakMode = 'short';
        active.remainingSeconds = active.focusSeconds;
      }
    }

    active.updatedAt = Date.now();
    emitTimerState(roomId);
  }, 1000);
};

const pruneSnapshots = () => {
  const maxRooms = 100;
  if (roomSnapshots.size <= maxRooms) {
    return;
  }

  const sorted = [...roomSnapshots.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const toDrop = sorted.slice(0, roomSnapshots.size - maxRooms);
  toDrop.forEach(([roomId]) => roomSnapshots.delete(roomId));
};

io.on('connection', (socket) => {
  socket.on('whiteboard:join', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId);
    const previousRoom = socket.data.roomId;
    if (previousRoom) {
      socket.leave(previousRoom);
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    const snapshot = roomSnapshots.get(roomId);
    if (snapshot?.dataUrl) {
      socket.emit('whiteboard:snapshot', { roomId, dataUrl: snapshot.dataUrl });
    }
  });

  socket.on('whiteboard:snapshot', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || socket.data.roomId);
    const dataUrl = typeof payload.dataUrl === 'string' ? payload.dataUrl : '';

    if (!roomId || !dataUrl.startsWith('data:image/png;base64,')) {
      return;
    }

    // Guard against unbounded payloads from malformed clients.
    if (dataUrl.length > 10_000_000) {
      return;
    }

    roomSnapshots.set(roomId, { dataUrl, updatedAt: Date.now() });
    pruneSnapshots();

    socket.to(roomId).emit('whiteboard:snapshot', { roomId, dataUrl });
  });

  socket.on('groupTimer:join', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || 'study-room');
    const roomName = timerRoomName(roomId);
    const previousRoomName = socket.data.timerRoomName;

    if (previousRoomName) {
      socket.leave(previousRoomName);
    }

    socket.join(roomName);
    socket.data.timerRoomName = roomName;
    socket.data.timerRoomId = roomId;

    const session = timerSessions.get(roomId) || createDefaultTimerSession(socket.id);
    if (!session.hostSocketId) {
      session.hostSocketId = socket.id;
    }
    timerSessions.set(roomId, session);

    socket.emit('groupTimer:state', {
      roomId,
      state: serializeTimerSession(session),
    });

    emitTimerState(roomId);
  });

  socket.on('groupTimer:start', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || socket.data.timerRoomId || 'study-room');
    const session = timerSessions.get(roomId) || createDefaultTimerSession(socket.id);

    if (!session.hostSocketId) {
      session.hostSocketId = socket.id;
    }

    if (session.hostSocketId !== socket.id) {
      socket.emit('groupTimer:error', {
        roomId,
        message: 'Only the host can start the timer.',
      });
      return;
    }

    session.isRunning = true;
    session.updatedAt = Date.now();
    timerSessions.set(roomId, session);
    startTimerInterval(roomId);
    emitTimerState(roomId);
  });

  socket.on('groupTimer:pause', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || socket.data.timerRoomId || 'study-room');
    const session = timerSessions.get(roomId);
    if (!session) {
      return;
    }

    session.isRunning = false;
    session.updatedAt = Date.now();
    stopTimerInterval(session);
    emitTimerState(roomId);
  });

  socket.on('groupTimer:reset', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || socket.data.timerRoomId || 'study-room');
    const session = timerSessions.get(roomId) || createDefaultTimerSession(socket.id);

    if (!session.hostSocketId) {
      session.hostSocketId = socket.id;
    }

    if (session.hostSocketId !== socket.id) {
      socket.emit('groupTimer:error', {
        roomId,
        message: 'Only the host can reset the timer.',
      });
      return;
    }

    session.isRunning = false;
    session.phase = 'focus';
    session.breakMode = 'short';
    session.remainingSeconds = session.focusSeconds;
    session.updatedAt = Date.now();
    stopTimerInterval(session);
    timerSessions.set(roomId, session);
    emitTimerState(roomId);
  });

  socket.on('groupTimer:setDurations', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || socket.data.timerRoomId || 'study-room');
    const session = timerSessions.get(roomId) || createDefaultTimerSession(socket.id);

    if (!session.hostSocketId) {
      session.hostSocketId = socket.id;
    }

    if (session.hostSocketId !== socket.id) {
      socket.emit('groupTimer:error', {
        roomId,
        message: 'Only the host can update timer durations.',
      });
      return;
    }

    const focusMinutes = Math.max(1, Math.min(180, Number(payload.focusMinutes) || 25));
    const breakMinutes = Math.max(1, Math.min(60, Number(payload.breakMinutes) || 5));

    session.focusSeconds = Math.floor(focusMinutes * 60);
    session.breakSeconds = Math.floor(breakMinutes * 60);
    session.phase = 'focus';
    session.breakMode = 'short';
    session.isRunning = false;
    session.remainingSeconds = session.focusSeconds;
    session.updatedAt = Date.now();
    stopTimerInterval(session);
    timerSessions.set(roomId, session);
    emitTimerState(roomId);
  });

  socket.on('groupTimer:setMode', (payload = {}) => {
    const roomId = sanitizeRoomId(payload.roomId || socket.data.timerRoomId || 'study-room');
    const session = timerSessions.get(roomId) || createDefaultTimerSession(socket.id);

    if (!session.hostSocketId) {
      session.hostSocketId = socket.id;
    }

    if (session.hostSocketId !== socket.id) {
      socket.emit('groupTimer:error', {
        roomId,
        message: 'Only the host can change timer mode.',
      });
      return;
    }

    const mode = String(payload.mode || 'focus').trim().toLowerCase();
    session.isRunning = false;

    if (mode === 'short-break' || mode === 'short' || mode === 'break') {
      session.phase = 'break';
      session.breakMode = 'short';
      session.remainingSeconds = session.breakSeconds;
    } else if (mode === 'long-break' || mode === 'long') {
      session.phase = 'break';
      session.breakMode = 'long';
      session.remainingSeconds = Math.max(session.breakSeconds * 3, 60);
    } else {
      session.phase = 'focus';
      session.breakMode = 'short';
      session.remainingSeconds = session.focusSeconds;
    }

    session.updatedAt = Date.now();
    stopTimerInterval(session);
    timerSessions.set(roomId, session);
    emitTimerState(roomId);
  });

  socket.on('disconnect', () => {
    timerSessions.forEach((session, roomId) => {
      if (session.hostSocketId !== socket.id) {
        return;
      }

      const members = io.sockets.adapter.rooms.get(timerRoomName(roomId));
      const nextHostSocketId = members ? [...members].find((id) => id !== socket.id) || null : null;
      session.hostSocketId = nextHostSocketId;
      session.updatedAt = Date.now();

      if (!nextHostSocketId) {
        session.isRunning = false;
        stopTimerInterval(session);
      }

      emitTimerState(roomId);
    });
  });
});

httpServer.listen(port, () => {
  console.log(`EducoLink backend running on http://localhost:${port}`);
  console.log(`Socket.IO enabled for whiteboard rooms`);
});
