import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  IoChevronForward,
  IoBrushOutline,
  IoColorPaletteOutline,
  IoLayersOutline,
  IoTrashOutline,
  IoDownloadOutline,
  IoArrowUndoOutline,
  IoArrowRedoOutline,
  IoVideocamOutline,
  IoHandLeftOutline,
  IoShareSocialOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';
import { API_BASE_URL } from '../services/api';

const COLORS = ['#111827', '#574db3', '#0f766e', '#c49000', '#b41340', '#0e7490'];
const OPENCV_PREF_KEY = 'educolink:whiteboard:opencv-enabled';

export default function Whiteboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const canvasRef = useRef(null);
  const boardWrapRef = useRef(null);
  const socketRef = useRef(null);
  const roomIdRef = useRef('studio');

  const isDrawingRef = useRef(false);
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const handsModulePromiseRef = useRef(null);
  const opencvRef = useRef(null);
  const openCvPromiseRef = useRef(null);
  const opencvEnabledRef = useRef(false);
  const rafRef = useRef(null);
  const frameBusyRef = useRef(false);
  const latestResultsRef = useRef(null);
  const gestureOverlayCanvasRef = useRef(null);

  const gestureStrokeRef = useRef(false);
  const gestureModeRef = useRef('none');
  const strokeDirtyRef = useRef(false);
  const lastGesturePointRef = useRef(null);
  const lastRawGesturePointRef = useRef(null);
  const smoothingWindowRef = useRef([]);
  const missingHandFramesRef = useRef(0);
  const actionCooldownUntilRef = useRef(0);
  const lastFingerCountRef = useRef(0);
  const stableFingerFramesRef = useRef(0);
  const gestureEnabledStateRef = useRef(false);
  const toolStateRef = useRef('pen');

  const initialRoom = (searchParams.get('room') || 'studio').trim().slice(0, 24) || 'studio';
  const [roomId, setRoomId] = useState(initialRoom);
  const [roomDraft, setRoomDraft] = useState(initialRoom);

  const [tool, setTool] = useState('pen');
  const [brushColor, setBrushColor] = useState('#111827');
  const [brushSize, setBrushSize] = useState(4);

  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [gestureReady, setGestureReady] = useState(false);
  const [opencvReady, setOpenCvReady] = useState(false);
  const [opencvEnabled, setOpenCvEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(OPENCV_PREF_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [opencvLoading, setOpenCvLoading] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Select Hand Tool and click On');
  const [gestureCursor, setGestureCursor] = useState({ x: 0, y: 0, visible: false, drawing: false });

  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    gestureEnabledStateRef.current = gestureEnabled;
  }, [gestureEnabled]);

  useEffect(() => {
    toolStateRef.current = tool;
  }, [tool]);

  useEffect(() => {
    opencvEnabledRef.current = opencvEnabled;

    try {
      window.localStorage.setItem(OPENCV_PREF_KEY, opencvEnabled ? '1' : '0');
    } catch {
      // Ignore storage failures (private mode/quota).
    }
  }, [opencvEnabled]);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  const restoreSnapshot = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas || !dataUrl) {
      return;
    }

    const ctx = getCtx();
    if (!ctx) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  };

  const broadcastSnapshot = () => {
    const canvas = canvasRef.current;
    const socket = socketRef.current;
    if (!canvas || !socket?.connected) {
      return;
    }

    socket.emit('whiteboard:snapshot', {
      roomId: roomIdRef.current,
      dataUrl: canvas.toDataURL('image/png'),
    });
  };

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    historyRef.current.push(canvas.toDataURL('image/png'));
    if (historyRef.current.length > 35) {
      historyRef.current.shift();
    }
    redoRef.current = [];
  };

  const startStroke = (point, options = {}) => {
    const ctx = getCtx();
    if (!ctx) {
      return;
    }

    const forcePen = options.forcePen === true;
    const forceEraser = options.forceEraser === true;

    saveSnapshot();
    isDrawingRef.current = true;
    strokeDirtyRef.current = false;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = forceEraser
      ? 'destination-out'
      : (forcePen ? 'source-over' : (tool === 'eraser' ? 'destination-out' : 'source-over'));
    ctx.strokeStyle = brushColor;
  };

  const extendStroke = (point) => {
    const ctx = getCtx();
    if (!ctx || !isDrawingRef.current) {
      return;
    }
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    strokeDirtyRef.current = true;
  };

  const stopStroke = ({ shouldBroadcast = true } = {}) => {
    const ctx = getCtx();
    if (!ctx) {
      return;
    }

    const shouldSync = strokeDirtyRef.current;

    if (isDrawingRef.current) {
      ctx.closePath();
      isDrawingRef.current = false;
    }

    if (shouldBroadcast && shouldSync) {
      broadcastSnapshot();
    }

    strokeDirtyRef.current = false;
  };

  const getOverlayCanvas = (width, height) => {
    let overlay = gestureOverlayCanvasRef.current;

    if (!overlay) {
      overlay = document.createElement('canvas');
      gestureOverlayCanvasRef.current = overlay;
    }

    if (overlay.width !== width || overlay.height !== height) {
      overlay.width = width;
      overlay.height = height;
    }

    return overlay;
  };

  const toBgra = (hex, alpha = 255) => {
    const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!parsed) {
      return [17, 24, 39, alpha];
    }

    const r = Number.parseInt(parsed[1], 16);
    const g = Number.parseInt(parsed[2], 16);
    const b = Number.parseInt(parsed[3], 16);

    return [b, g, r, alpha];
  };

  const smoothGesturePoint = (rawPoint) => {
    const previousSmoothed = lastGesturePointRef.current;
    const previousRaw = lastRawGesturePointRef.current;

    let velocity = 0;
    if (previousRaw) {
      velocity = Math.hypot(rawPoint.x - previousRaw.x, rawPoint.y - previousRaw.y);
    }

    // Adaptive low-pass filter to reduce jitter while keeping fast motion responsive.
    const alpha = Math.min(0.7, Math.max(0.2, 0.2 + velocity / 50));
    const lowPassPoint = previousSmoothed
      ? {
          x: previousSmoothed.x + (rawPoint.x - previousSmoothed.x) * alpha,
          y: previousSmoothed.y + (rawPoint.y - previousSmoothed.y) * alpha,
        }
      : rawPoint;

    const window = smoothingWindowRef.current;
    window.push(lowPassPoint);
    if (window.length > 5) {
      window.shift();
    }

    const summed = window.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );

    const smoothed = {
      x: summed.x / window.length,
      y: summed.y / window.length,
    };

    lastRawGesturePointRef.current = rawPoint;
    lastGesturePointRef.current = smoothed;

    return smoothed;
  };

  const drawGestureSegmentWithOpenCv = (from, to) => {
    if (!opencvEnabledRef.current) {
      return false;
    }

    const cv = opencvRef.current;
    const canvas = canvasRef.current;
    const ctx = getCtx();

    if (!cv || !canvas || !ctx) {
      return false;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) {
      return false;
    }

    const overlay = getOverlayCanvas(width, height);

    let strokeLayer;
    let filteredLayer;

    try {
      strokeLayer = cv.Mat.zeros(height, width, cv.CV_8UC4);
      filteredLayer = new cv.Mat();

      const color = toBgra(brushColor, 255);
      const thickness = Math.max(2, Math.round(brushSize * 1.3));

      cv.line(
        strokeLayer,
        new cv.Point(Math.round(from.x), Math.round(from.y)),
        new cv.Point(Math.round(to.x), Math.round(to.y)),
        new cv.Scalar(color[0], color[1], color[2], color[3]),
        thickness,
        cv.LINE_AA,
      );

      cv.circle(
        strokeLayer,
        new cv.Point(Math.round(to.x), Math.round(to.y)),
        Math.max(1, Math.round(thickness / 2.3)),
        new cv.Scalar(color[0], color[1], color[2], color[3]),
        -1,
        cv.LINE_AA,
      );

      // Mild blur smooths segment edges to reduce aliasing noise.
      cv.GaussianBlur(strokeLayer, filteredLayer, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
      cv.imshow(overlay, filteredLayer);
      ctx.drawImage(overlay, 0, 0, width, height);

      strokeDirtyRef.current = true;
      return true;
    } catch {
      return false;
    } finally {
      strokeLayer?.delete?.();
      filteredLayer?.delete?.();
    }
  };

  const cycleBrushColor = () => {
    const currentIndex = COLORS.indexOf(brushColor);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % COLORS.length;
    setBrushColor(COLORS[nextIndex]);
  };

  const loadHandsModule = async () => {
    if (!handsModulePromiseRef.current) {
      handsModulePromiseRef.current = import('@mediapipe/hands')
        .then((mod) => mod.Hands)
        .catch((error) => {
          handsModulePromiseRef.current = null;
          throw error;
        });
    }

    return handsModulePromiseRef.current;
  };

  const ensureOpenCvReady = async () => {
    if (opencvRef.current) {
      return true;
    }

    if (openCvPromiseRef.current) {
      return openCvPromiseRef.current;
    }

    openCvPromiseRef.current = (async () => {
      try {
        const cvModule = await import('@techstark/opencv-js');
        const cv = cvModule.default || cvModule;

        if (typeof cv?.Mat !== 'function') {
          await new Promise((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
              if (!settled) {
                settled = true;
                reject(new Error('OpenCV init timeout'));
              }
            }, 9000);

            cv.onRuntimeInitialized = () => {
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                resolve();
              }
            };
          });
        }

        opencvRef.current = cv;
        setOpenCvReady(true);
        return true;
      } catch {
        setOpenCvReady(false);
        openCvPromiseRef.current = null;
        return false;
      }
    })();

    return openCvPromiseRef.current;
  };

  const toggleOpenCvMode = async () => {
    if (opencvEnabledRef.current) {
      setOpenCvEnabled(false);
      setGestureStatus('OpenCV draw disabled (using canvas draw)');
      return;
    }

    setOpenCvLoading(true);
    setGestureStatus('Loading OpenCV engine...');
    const ok = await ensureOpenCvReady();
    setOpenCvLoading(false);

    if (ok) {
      setOpenCvEnabled(true);
      setGestureStatus('OpenCV draw enabled');
      return;
    }

    setOpenCvEnabled(false);
    setGestureStatus('OpenCV load failed. Using canvas draw fallback');
  };

  const resizeCanvas = () => {
    const wrap = boardWrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) {
      return;
    }

    const existing = canvas.width && canvas.height ? canvas.toDataURL('image/png') : null;
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(320, wrap.clientWidth);
    const height = Math.max(360, Math.floor(window.innerHeight * 0.56));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = getCtx();
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (existing) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = existing;
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const pointFromPointer = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    if (tool === 'hand') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    event.preventDefault();
    const p = pointFromPointer(event);
    canvas.setPointerCapture(event.pointerId);
    startStroke(p);
  };

  const draw = (event) => {
    if (tool === 'hand' || !isDrawingRef.current) {
      return;
    }

    event.preventDefault();
    const p = pointFromPointer(event);
    extendStroke(p);
  };

  const stopDrawing = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    stopStroke();

    if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) {
      return;
    }

    saveSnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeDirtyRef.current = true;
    broadcastSnapshot();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || !historyRef.current.length) {
      return;
    }

    redoRef.current.push(canvas.toDataURL('image/png'));
    const previous = historyRef.current.pop();
    restoreSnapshot(previous);
    setTimeout(() => broadcastSnapshot(), 0);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    if (!canvas || !redoRef.current.length) {
      return;
    }

    historyRef.current.push(canvas.toDataURL('image/png'));
    const next = redoRef.current.pop();
    restoreSnapshot(next);
    setTimeout(() => broadcastSnapshot(), 0);
  };

  const downloadBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const link = document.createElement('a');
    link.download = `educolink-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const stopGestureTracking = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    frameBusyRef.current = false;
    latestResultsRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.onmute = null;
        track.onunmute = null;
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (handsRef.current?.close) {
      handsRef.current.close();
    }
    handsRef.current = null;

    gestureStrokeRef.current = false;
    gestureModeRef.current = 'none';
    strokeDirtyRef.current = false;
    lastGesturePointRef.current = null;
    lastRawGesturePointRef.current = null;
    smoothingWindowRef.current = [];
    missingHandFramesRef.current = 0;
    actionCooldownUntilRef.current = 0;
    lastFingerCountRef.current = 0;
    stableFingerFramesRef.current = 0;

    stopStroke({ shouldBroadcast: true });
    setGestureCursor({ x: 0, y: 0, visible: false, drawing: false });
    setGestureReady(false);
  };

  const startGestureTracking = async (forceStart = false) => {
    if (toolStateRef.current !== 'hand') {
      setGestureStatus('Select Hand Tool first');
      return;
    }

    if (!forceStart && !gestureEnabledStateRef.current) {
      setGestureStatus('Gesture is Off');
      return;
    }

    try {
      setGestureStatus('Requesting camera...');

      const constraints = selectedDeviceId
        ? { video: { deviceId: { exact: selectedDeviceId } }, audio: false }
        : { video: { facingMode: 'user' }, audio: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const [videoTrack] = stream.getVideoTracks();
      videoTrack.onended = () => {
        if (gestureEnabledStateRef.current) {
          setGestureStatus('Camera interrupted. Click Reconnect');
          setGestureReady(false);
        }
      };

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setGestureStatus('Loading MediaPipe Hands...');
      const Hands = await loadHandsModule();
      const openCvLoaded = opencvEnabledRef.current ? await ensureOpenCvReady() : false;
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });

      hands.onResults((results) => {
        latestResultsRef.current = results;
      });

      handsRef.current = hands;
      setGestureReady(true);
      setGestureStatus(
        openCvLoaded
          ? 'Hand active: OpenCV Draw | 2 Erase | hold 3 Undo | hold 4 Redo | hold 5 Clear | fist Color'
          : 'Hand active: canvas draw mode | 2 Erase | hold 3 Undo | hold 4 Redo',
      );

      const loop = () => {
        const video = videoRef.current;
        const handsModel = handsRef.current;
        const canvas = canvasRef.current;

        if (!video || !handsModel || !canvas || !gestureEnabledStateRef.current || toolStateRef.current !== 'hand') {
          return;
        }

        if (!frameBusyRef.current) {
          frameBusyRef.current = true;
          handsModel.send({ image: video }).finally(() => {
            frameBusyRef.current = false;
          });
        }

        const hand = latestResultsRef.current?.multiHandLandmarks?.[0];

        if (!hand) {
          missingHandFramesRef.current += 1;
          if (gestureStrokeRef.current && missingHandFramesRef.current > 8) {
            gestureStrokeRef.current = false;
            stopStroke({ shouldBroadcast: true });
          }
          if (missingHandFramesRef.current > 4) {
            setGestureCursor((prev) => ({ ...prev, visible: false, drawing: false }));
          }
          setGestureStatus('Hand Tool active: show your hand in camera');
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        missingHandFramesRef.current = 0;

        const indexTip = hand[8];
        const indexPip = hand[6];
        const middleTip = hand[12];
        const middlePip = hand[10];
        const ringTip = hand[16];
        const ringPip = hand[14];
        const pinkyTip = hand[20];
        const pinkyPip = hand[18];

        const indexUp = indexTip.y < indexPip.y;
        const middleUp = middleTip.y < middlePip.y;
        const ringUp = ringTip.y < ringPip.y;
        const pinkyUp = pinkyTip.y < pinkyPip.y;

        const handednessLabel = latestResultsRef.current?.multiHandedness?.[0]?.label || 'Right';
        const thumbTip = hand[4];
        const thumbMcp = hand[2];
        const thumbUp = handednessLabel === 'Left' ? thumbTip.x > thumbMcp.x : thumbTip.x < thumbMcp.x;

        const raisedCount = [thumbUp, indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
        const drawMode = raisedCount <= 1;
        const eraseMode = raisedCount === 2;

        if (raisedCount === lastFingerCountRef.current) {
          stableFingerFramesRef.current += 1;
        } else {
          stableFingerFramesRef.current = 0;
        }

        const now = performance.now();
        if (now >= actionCooldownUntilRef.current && stableFingerFramesRef.current >= 8) {
          if (raisedCount === 3) {
            undo();
            actionCooldownUntilRef.current = now + 900;
            stableFingerFramesRef.current = 0;
          } else if (raisedCount === 4) {
            redo();
            actionCooldownUntilRef.current = now + 900;
            stableFingerFramesRef.current = 0;
          } else if (raisedCount === 5) {
            clearBoard();
            actionCooldownUntilRef.current = now + 900;
            stableFingerFramesRef.current = 0;
          } else if (raisedCount === 0) {
            cycleBrushColor();
            actionCooldownUntilRef.current = now + 700;
            stableFingerFramesRef.current = 0;
          }
        }

        lastFingerCountRef.current = raisedCount;

        const rawPoint = {
          x: (1 - indexTip.x) * canvas.clientWidth,
          y: indexTip.y * canvas.clientHeight,
        };

        const previous = lastGesturePointRef.current;
        const point = smoothGesturePoint(rawPoint);
        const openCvActiveNow = opencvEnabledRef.current && Boolean(opencvRef.current);
        setGestureCursor({ x: point.x, y: point.y, visible: true, drawing: drawMode });

        if (drawMode || eraseMode) {
          const targetMode = eraseMode ? 'erase' : 'draw';

          if (gestureStrokeRef.current && gestureModeRef.current !== targetMode) {
            stopStroke({ shouldBroadcast: true });
            gestureStrokeRef.current = false;
            gestureModeRef.current = 'none';
          }

          if (!gestureStrokeRef.current) {
            gestureStrokeRef.current = true;
            gestureModeRef.current = targetMode;

            if (drawMode) {
              saveSnapshot();
              isDrawingRef.current = true;
              strokeDirtyRef.current = false;
              drawGestureSegmentWithOpenCv(point, point);
            } else {
              startStroke(point, { forcePen: false, forceEraser: true });
              extendStroke(point);
            }
          } else {
            const dist = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 2;
            if (dist > 0.35) {
              if (eraseMode) {
                extendStroke(point);
              } else {
                const rendered = drawGestureSegmentWithOpenCv(previous || point, point);
                if (!rendered) {
                  if (!isDrawingRef.current) {
                    startStroke(previous || point, { forcePen: true, forceEraser: false });
                  }
                  extendStroke(point);
                }
              }
            }
          }
        } else if (gestureStrokeRef.current) {
          gestureStrokeRef.current = false;
          gestureModeRef.current = 'none';
          stopStroke({ shouldBroadcast: true });
          lastRawGesturePointRef.current = null;
          lastGesturePointRef.current = null;
          smoothingWindowRef.current = [];
        }

        if (drawMode) {
          setGestureStatus(openCvActiveNow ? 'Hand Tool: 1 finger Draw (OpenCV)' : 'Hand Tool: 1 finger Draw (Canvas)');
        } else if (eraseMode) {
          setGestureStatus('Hand Tool: 2 fingers Erase');
        } else if (raisedCount === 3) {
          setGestureStatus('Hand Tool: hold 3 fingers Undo');
        } else if (raisedCount === 4) {
          setGestureStatus('Hand Tool: hold 4 fingers Redo');
        } else if (raisedCount === 5) {
          setGestureStatus('Hand Tool: hold 5 fingers Clear');
        } else if (raisedCount === 0) {
          setGestureStatus('Hand Tool: fist to cycle color');
        } else {
          setGestureStatus('Hand Tool active');
        }

        // Frame throttling: only process at most ~30 FPS
        const throttleNow = performance.now();
        if (!rafRef.current || !rafRef.current._lastFrameTime) {
          rafRef.current = { _lastFrameTime: throttleNow };
        }
        const minFrameInterval = 33; // ms, ~30 FPS
        if (throttleNow - rafRef.current._lastFrameTime >= minFrameInterval) {
          rafRef.current._lastFrameTime = throttleNow;
          rafRef.current = requestAnimationFrame(loop);
        } else {
          setTimeout(() => {
            rafRef.current = requestAnimationFrame(loop);
          }, minFrameInterval - (throttleNow - rafRef.current._lastFrameTime));
        }
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setGestureReady(false);
      setGestureStatus('Could not start camera/gesture');
    }
  };

  const reconnectGestureCamera = async () => {
    if (toolStateRef.current !== 'hand') {
      setTool('hand');
      return;
    }

    if (!gestureEnabledStateRef.current) {
      gestureEnabledStateRef.current = true;
      setGestureEnabled(true);
    }

    stopGestureTracking();
    await startGestureTracking(true);
  };

  const toggleGesture = async () => {
    if (toolStateRef.current !== 'hand') {
      setTool('hand');
      return;
    }

    if (gestureEnabledStateRef.current) {
      gestureEnabledStateRef.current = false;
      setGestureEnabled(false);
      stopGestureTracking();
      setGestureStatus('Gesture off');
      return;
    }

    gestureEnabledStateRef.current = true;
    setGestureEnabled(true);
    await startGestureTracking(true);
  };

  const refreshVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(cameras);
      setSelectedDeviceId((prev) => prev || cameras[0]?.deviceId || '');
    } catch {
      setVideoDevices([]);
    }
  };

  const copyRoomLink = async () => {
    const url = `${window.location.origin}/whiteboard?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(''), 1200);
    } catch {
      setCopyStatus('fail');
      setTimeout(() => setCopyStatus(''), 1200);
    }
  };

  const joinRoom = () => {
    const cleaned = roomDraft.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'studio';
    setRoomId(cleaned);
    setRoomDraft(cleaned);

    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      historyRef.current = [];
      redoRef.current = [];
    }
  };

  useEffect(() => {
    roomIdRef.current = roomId;
    setSearchParams({ room: roomId }, { replace: true });

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('whiteboard:join', { roomId });
    }
  }, [roomId, setSearchParams]);

  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('whiteboard:join', { roomId: roomIdRef.current });
    };

    const onSnapshot = (payload = {}) => {
      if (!payload?.dataUrl || payload.roomId !== roomIdRef.current) {
        return;
      }
      restoreSnapshot(payload.dataUrl);
    };

    socket.on('connect', onConnect);
    socket.on('whiteboard:snapshot', onSnapshot);

    return () => {
      socket.off('connect', onConnect);
      socket.off('whiteboard:snapshot', onSnapshot);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    refreshVideoDevices();
    const onDeviceChange = () => refreshVideoDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) {
        return;
      }

      if (gestureEnabledStateRef.current) {
        gestureEnabledStateRef.current = false;
        setGestureEnabled(false);
      }
      stopGestureTracking();
      setGestureStatus('Camera off (tab inactive)');
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (tool !== 'hand') {
      if (gestureEnabledStateRef.current) {
        gestureEnabledStateRef.current = false;
        setGestureEnabled(false);
      }
      stopGestureTracking();
      setGestureStatus('Select Hand Tool and click On');
    }
  }, [tool]);

  useEffect(() => {
    if (tool !== 'hand') {
      return undefined;
    }

    let cancelled = false;
    const preload = () => {
      loadHandsModule().catch(() => null);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        if (!cancelled) {
          preload();
        }
      }, { timeout: 1200 });

      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        preload();
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [tool]);

  useEffect(() => () => stopGestureTracking(), []);

  return (
    <div className="module-page whiteboard-page">
      <FloatingParticles />
      <GradientMesh colors={['#0f766e', '#14b8a6', '#99f6e4']} />

      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.75), rgba(20,184,166,0.58), rgba(153,246,228,0.42))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Collaborative Whiteboard</h1>
          <p>Sketch ideas, solve problems, and export your board for revision.</p>
        </div>
      </motion.div>

      <motion.div className="whiteboard-shell" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="whiteboard-toolbar">
          <div className="whiteboard-group">
            <span className="whiteboard-label"><IoShareSocialOutline /> Room</span>
            <div className="whiteboard-room-row">
              <input
                type="text"
                value={roomDraft}
                onChange={(e) => setRoomDraft(e.target.value)}
                className="whiteboard-room-input"
                placeholder="room-id"
              />
              <button type="button" className="btn-secondary" onClick={joinRoom}>Join</button>
              <button type="button" className="btn-secondary" onClick={copyRoomLink}>
                {copyStatus === 'copied' ? <IoCheckmarkOutline /> : <IoCopyOutline />}
                {copyStatus === 'copied' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="whiteboard-group">
            <span className="whiteboard-label"><IoBrushOutline /> Tool</span>
            <button type="button" className={`whiteboard-chip ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>
              Draw
            </button>
            <button type="button" className={`whiteboard-chip ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>
              Erase
            </button>
            <button type="button" className={`whiteboard-chip ${tool === 'hand' ? 'active' : ''}`} onClick={() => setTool('hand')}>
              Hand
            </button>
          </div>

          <div className="whiteboard-group">
            <span className="whiteboard-label"><IoColorPaletteOutline /> Color</span>
            <div className="whiteboard-colors">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`whiteboard-color ${brushColor === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => {
                    setBrushColor(color);
                    if (tool !== 'hand') {
                      setTool('pen');
                    }
                  }}
                  aria-label={`Use ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="whiteboard-group whiteboard-size">
            <span className="whiteboard-label"><IoLayersOutline /> Size {brushSize}px</span>
            <input
              type="range"
              min={2}
              max={26}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </div>

          <div className="whiteboard-group">
            <span className="whiteboard-label"><IoHandLeftOutline /> Hand Gesture</span>
            <div className="whiteboard-room-row">
              <button type="button" className={`whiteboard-chip ${gestureEnabled ? 'active' : ''}`} onClick={toggleGesture}>
                <IoVideocamOutline /> {gestureEnabled ? 'On' : 'Off'}
              </button>
              <button type="button" className="whiteboard-chip" onClick={reconnectGestureCamera} disabled={tool !== 'hand'}>
                Reconnect
              </button>
              <button
                type="button"
                className={`whiteboard-chip ${opencvEnabled ? 'active' : ''}`}
                onClick={toggleOpenCvMode}
                disabled={opencvLoading}
              >
                {opencvLoading ? 'Loading OpenCV...' : (opencvEnabled ? 'OpenCV On' : 'OpenCV Off')}
              </button>
              <span className={`whiteboard-status ${gestureReady ? 'ready' : ''}`}>{gestureStatus}</span>
            </div>
            <div className="whiteboard-room-row">
              <span className="whiteboard-status">
                1: Draw | 2: Erase | hold 3: Undo | hold 4: Redo | hold 5: Clear | fist: Color
              </span>
              <span className={`whiteboard-status ${opencvReady && opencvEnabled ? 'ready' : ''}`}>
                OpenCV: {opencvEnabled ? (opencvReady ? 'Ready' : 'Loading') : 'Disabled'}
              </span>
            </div>
            <div className="whiteboard-room-row">
              <select
                className="whiteboard-room-input"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={gestureEnabled}
                aria-label="Select camera"
              >
                <option value="">Default Camera</option>
                {videoDevices.map((device, idx) => (
                  <option key={device.deviceId || `cam-${idx}`} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
            {gestureEnabled && <video ref={videoRef} className="whiteboard-video-preview" muted playsInline />}
          </div>

          <div className="whiteboard-actions">
            <button type="button" className="btn-secondary" onClick={undo}><IoArrowUndoOutline /> Undo</button>
            <button type="button" className="btn-secondary" onClick={redo}><IoArrowRedoOutline /> Redo</button>
            <button type="button" className="btn-secondary" onClick={clearBoard}><IoTrashOutline /> Clear</button>
            <button type="button" className="btn-primary" onClick={downloadBoard}><IoDownloadOutline /> Download</button>
          </div>
        </div>

        <div className="whiteboard-canvas-wrap" ref={boardWrapRef}>
          <canvas
            ref={canvasRef}
            className="whiteboard-canvas"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />
          {gestureCursor.visible && (
            <div
              className={`whiteboard-gesture-cursor ${gestureCursor.drawing ? 'pinch' : ''}`}
              style={{ left: `${gestureCursor.x}px`, top: `${gestureCursor.y}px` }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
