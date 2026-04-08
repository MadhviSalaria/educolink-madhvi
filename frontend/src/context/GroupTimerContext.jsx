/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';

const GroupTimerContext = createContext(null);

const DEFAULT_ROOM_ID = 'study-room';
const FOCUS_SECONDS = 25 * 60;
const ROOM_STORAGE_KEY = 'groupTimerRoom';

function toSocketBaseUrl(apiBaseUrl) {
  try {
    const parsed = new URL(apiBaseUrl);
    return parsed.origin;
  } catch {
    return apiBaseUrl;
  }
}

function normalizeRoomId(value) {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);

  return cleaned || DEFAULT_ROOM_ID;
}

function toTimerState(payload = {}) {
  return {
    phase: payload.phase === 'break' ? 'break' : 'focus',
    remainingSeconds: Number.isFinite(payload.remainingSeconds) ? Math.max(0, Math.floor(payload.remainingSeconds)) : FOCUS_SECONDS,
    focusSeconds: Number.isFinite(payload.focusSeconds) ? Math.max(60, Math.floor(payload.focusSeconds)) : FOCUS_SECONDS,
    breakSeconds: Number.isFinite(payload.breakSeconds) ? Math.max(60, Math.floor(payload.breakSeconds)) : 5 * 60,
    breakMode: payload.breakMode === 'long' ? 'long' : 'short',
    isRunning: Boolean(payload.isRunning),
    hostSocketId: payload.hostSocketId || null,
    updatedAt: Number.isFinite(payload.updatedAt) ? payload.updatedAt : Date.now(),
  };
}

export function GroupTimerProvider({ children }) {
  const getInitialRoom = () => {
    const stored = localStorage.getItem(ROOM_STORAGE_KEY);
    return normalizeRoomId(stored || DEFAULT_ROOM_ID);
  };

  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState('');
  const [roomId, setRoomId] = useState(getInitialRoom);
  const [timer, setTimer] = useState({
    phase: 'focus',
    remainingSeconds: FOCUS_SECONDS,
    focusSeconds: FOCUS_SECONDS,
    breakSeconds: 5 * 60,
    breakMode: 'short',
    isRunning: false,
    hostSocketId: null,
    updatedAt: 0,
  });
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const roomIdRef = useRef(DEFAULT_ROOM_ID);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    const socket = io(toSocketBaseUrl(API_BASE_URL), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
    });

    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setSocketId(socket.id || '');
      setError('');
      socket.emit('groupTimer:join', { roomId: roomIdRef.current });
    };

    const onDisconnect = () => {
      setConnected(false);
      setSocketId('');
    };

    const onState = (payload = {}) => {
      const nextRoomId = normalizeRoomId(payload.roomId || roomIdRef.current);
      const nextState = toTimerState(payload.state);
      setRoomId(nextRoomId);
      setTimer(nextState);
    };

    const onError = (payload = {}) => {
      setError(String(payload.message || 'Group timer sync failed.'));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('groupTimer:state', onState);
    socket.on('groupTimer:error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('groupTimer:state', onState);
      socket.off('groupTimer:error', onError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!timer.isRunning || timer.remainingSeconds <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (!prev.isRunning || prev.remainingSeconds <= 0) {
          return prev;
        }

        return {
          ...prev,
          remainingSeconds: Math.max(0, prev.remainingSeconds - 1),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.remainingSeconds]);

  const joinRoom = useCallback((nextRoomId) => {
    const normalized = normalizeRoomId(nextRoomId);
    setRoomId(normalized);
    localStorage.setItem(ROOM_STORAGE_KEY, normalized);
    setError('');
    socketRef.current?.emit('groupTimer:join', { roomId: normalized });
  }, []);

  const startTimer = useCallback(() => {
    setError('');
    socketRef.current?.emit('groupTimer:start', { roomId });
  }, [roomId]);

  const pauseTimer = useCallback(() => {
    setError('');
    socketRef.current?.emit('groupTimer:pause', { roomId });
  }, [roomId]);

  const resetTimer = useCallback(() => {
    setError('');
    socketRef.current?.emit('groupTimer:reset', { roomId });
  }, [roomId]);

  const setTimerDurations = useCallback((focusMinutes, breakMinutes) => {
    setError('');
    socketRef.current?.emit('groupTimer:setDurations', {
      roomId,
      focusMinutes,
      breakMinutes,
    });
  }, [roomId]);

  const setTimerMode = useCallback((mode) => {
    setError('');
    socketRef.current?.emit('groupTimer:setMode', {
      roomId,
      mode,
    });
  }, [roomId]);

  const claimHost = useCallback(() => {
    setError('');
    socketRef.current?.emit('groupTimer:claimHost', {
      roomId,
    });
  }, [roomId]);

  const value = useMemo(() => ({
    connected,
    socketId,
    roomId,
    timer,
    error,
    isHost: Boolean(socketId && timer.hostSocketId && socketId === timer.hostSocketId),
    joinRoom,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerDurations,
    setTimerMode,
    claimHost,
  }), [connected, socketId, roomId, timer, error, joinRoom, startTimer, pauseTimer, resetTimer, setTimerDurations, setTimerMode, claimHost]);

  return (
    <GroupTimerContext.Provider value={value}>
      {children}
    </GroupTimerContext.Provider>
  );
}

export function useGroupTimer() {
  const context = useContext(GroupTimerContext);
  if (!context) {
    throw new Error('useGroupTimer must be used within GroupTimerProvider');
  }
  return context;
}
