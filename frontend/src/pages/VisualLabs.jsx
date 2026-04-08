import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoCameraOutline,
  IoChevronForward,
  IoCloudUploadOutline,
  IoColorPaletteOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoGitNetworkOutline,
  IoOpenOutline,
  IoPlayOutline,
  IoBrushOutline,
  IoRefreshOutline,
  IoShapesOutline,
  IoSparklesOutline,
  IoStopOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { jsPDF } from 'jspdf';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';
import { analyzeSyllabus } from '../services/api';
import {
  buildSyllabusVisualModel,
  downloadSvgAsset,
  generateSyllabusFlowchartSVG,
  generateSyllabusMindmapSVG,
} from '../utils/mindmapGenerator';

const SUBJECTS = [
  'General',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English',
  'History',
  'Economics',
];

const LEVELS = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'exam', label: 'Exam Prep' },
];

const LABS = [
  { id: 'mindmap', title: 'Mind Maps', detail: 'Upload a syllabus and build connected revision trees.', icon: IoGitNetworkOutline },
  { id: 'flowchart', title: 'Flowcharts', detail: 'Turn the syllabus into a step-by-step study sequence.', icon: IoShapesOutline },
  { id: 'board', title: 'Concept Boards', detail: 'Arrange topics, priorities, and revision notes on one canvas.', icon: IoColorPaletteOutline },
  { id: 'whiteboard', title: 'Air Whiteboard', detail: 'Use your laptop camera to draw in air and on the board.', icon: IoCameraOutline },
];

const AIR_DRAW_URL = 'https://air-draw-one.vercel.app/';

const whiteboardThemes = [
  '#6d62df',
  '#0e7490',
  '#b41340',
  '#17623f',
  '#e65100',
];

const mediaPipeScriptGroups = [
  [
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
    'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js',
  ],
  [
    'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
    'https://unpkg.com/@mediapipe/hands/hands.js',
  ],
];

let mediaPipeLoaderPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      if (existing.dataset.error === 'true') {
        existing.remove();
      } else {
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error(`Unable to load ${src}`));
        };
        const cleanup = () => {
          existing.removeEventListener('load', onLoad);
          existing.removeEventListener('error', onError);
        };

        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', onError);
        return;
      }
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.dataset.error = 'true';
      reject(new Error(`Unable to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function loadScriptWithFallback(urls = []) {
  let lastError = null;
  for (const src of urls) {
    try {
      await loadScript(src);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load MediaPipe scripts.');
}

function loadMediaPipeLibraries() {
  if (!mediaPipeLoaderPromise) {
    mediaPipeLoaderPromise = mediaPipeScriptGroups.reduce(
      (chain, urls) => chain.then(() => loadScriptWithFallback(urls)),
      Promise.resolve(),
    ).catch((error) => {
      mediaPipeLoaderPromise = null;
      throw error;
    });
  }

  return mediaPipeLoaderPromise;
}

function svgDataUri(svg = '') {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function downloadTextBlob(text, fileName) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value = 'visual-lab') {
  return String(value)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'visual-lab';
}

function getPointFromClient(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function scoreCameraLabel(label = '') {
  const value = String(label || '').toLowerCase();

  let score = 0;
  if (/integrated|built-in|internal|webcam|facetime|front/i.test(value)) score += 5;
  if (/hd|fhd|full hd/i.test(value)) score += 2;
  if (/usb/i.test(value)) score += 1;

  if (/phone|android|iphone|droid|mobile|continuity/i.test(value)) score -= 8;
  if (/droidcam|epoccam|ivcam|iriun|obs|virtual/i.test(value)) score -= 10;

  return score;
}

function isPhoneOrVirtualCamera(label = '') {
  const value = String(label || '').toLowerCase();
  return /phone|android|iphone|redmi|mi\s|mobile|continuity|droidcam|epoccam|ivcam|iriun|obs|virtual/i.test(value);
}

function rankVideoInputs(devices = []) {
  const videoInputs = devices.filter((device) => device.kind === 'videoinput');
  return [...videoInputs].sort((a, b) => scoreCameraLabel(b.label) - scoreCameraLabel(a.label));
}

function pickPreferredCameraDevice(devices = []) {
  const videoInputs = rankVideoInputs(devices);
  if (!videoInputs.length) return null;

  const nonPhone = videoInputs.find((device) => !isPhoneOrVirtualCamera(device.label));
  return nonPhone || videoInputs[0] || null;
}

export default function VisualLabs() {
  const [activeLab, setActiveLab] = useState('mindmap');
  const [subject, setSubject] = useState('General');
  const [level, setLevel] = useState('college');
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusInfo, setSyllabusInfo] = useState(null);
  const [syllabusAnswer, setSyllabusAnswer] = useState('');
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [syllabusError, setSyllabusError] = useState('');
  const [visualMessage, setVisualMessage] = useState('Upload a syllabus PDF to generate premium mind maps, flowcharts, and concept boards.');

  const [whiteboardMode, setWhiteboardMode] = useState('draw');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Camera is off. Use the camera mode for air writing.');
  const [penColor, setPenColor] = useState('#6d62df');
  const [penSize, setPenSize] = useState(5);
  const [whiteboardTool, setWhiteboardTool] = useState('pen');
  const [textToWrite, setTextToWrite] = useState('My note');
  const [textSize, setTextSize] = useState(28);
  const [airMirrorX, setAirMirrorX] = useState(true);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [whiteboardMessage, setWhiteboardMessage] = useState('Use mouse to draw or switch to air mode and start the camera.');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  const strokesRef = useRef([]);
  const textNotesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const airStrokeActiveRef = useRef(false);
  const activeLabRef = useRef(activeLab);
  const whiteboardModeRef = useRef(whiteboardMode);
  const cameraDeviceIdRef = useRef(cameraDeviceId);

  useEffect(() => {
    activeLabRef.current = activeLab;
  }, [activeLab]);

  const refreshVideoDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const rankedVideoInputs = rankVideoInputs(devices);
      const nonPhoneInputs = rankedVideoInputs.filter((device) => !isPhoneOrVirtualCamera(device.label));
      setCameraDevices(nonPhoneInputs);

      const preferred = pickPreferredCameraDevice(nonPhoneInputs);
      if (preferred?.deviceId && !cameraDeviceIdRef.current) {
        setCameraDeviceId(preferred.deviceId);
      }

      if (cameraDeviceIdRef.current && !nonPhoneInputs.some((device) => device.deviceId === cameraDeviceIdRef.current)) {
        setCameraDeviceId(preferred?.deviceId || '');
      }

      return nonPhoneInputs;
    } catch {
      // ignore device enumeration errors silently
      return [];
    }
  };

  useEffect(() => {
    whiteboardModeRef.current = whiteboardMode;
  }, [whiteboardMode]);

  useEffect(() => {
    cameraDeviceIdRef.current = cameraDeviceId;
  }, [cameraDeviceId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeLab !== 'whiteboard') return undefined;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLab]);

  useEffect(() => {
    if (!syllabusAnswer.trim()) {
      setVisualMessage('Upload a syllabus PDF to generate premium mind maps, flowcharts, and concept boards.');
      return undefined;
    }

    setVisualMessage('Syllabus visuals are ready. Switch tabs to preview mind maps, flowcharts, and concept boards.');
    return undefined;
  }, [syllabusAnswer]);

  useEffect(() => {
    if (activeLab === 'whiteboard') {
      refreshVideoDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLab]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visualModel = useMemo(() => {
    if (!syllabusAnswer.trim()) return null;
    return buildSyllabusVisualModel(syllabusAnswer, subject);
  }, [subject, syllabusAnswer]);

  const mindmapSvg = useMemo(() => {
    if (!syllabusAnswer.trim()) return '';
    return generateSyllabusMindmapSVG(syllabusAnswer, subject);
  }, [subject, syllabusAnswer]);

  const flowchartSvg = useMemo(() => {
    if (!syllabusAnswer.trim()) return '';
    return generateSyllabusFlowchartSVG(syllabusAnswer, subject);
  }, [subject, syllabusAnswer]);

  const mindmapPreview = useMemo(() => (mindmapSvg ? svgDataUri(mindmapSvg) : ''), [mindmapSvg]);
  const flowchartPreview = useMemo(() => (flowchartSvg ? svgDataUri(flowchartSvg) : ''), [flowchartSvg]);
  const conceptCards = visualModel?.conceptCards || [];

  const drawBaseCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, '#ffffff');
    background.addColorStop(1, '#f3f6ff');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(123, 112, 232, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(87, 77, 179, 0.05)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    strokesRef.current.forEach((stroke) => {
      if (!stroke.points.length) return;
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        const point = stroke.points[i];
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    });

    textNotesRef.current.forEach((note) => {
      if (!note?.text) return;
      ctx.fillStyle = note.color;
      ctx.font = `${note.size}px 'Segoe UI', sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(note.text, note.x, note.y);
    });
  };

  const redrawCanvas = () => {
    drawBaseCanvas();
  };

  const startStroke = (point) => {
    const stroke = {
      points: [point],
      color: penColor,
      size: penSize,
      createdAt: Date.now(),
    };
    strokesRef.current.push(stroke);
    currentStrokeRef.current = stroke;
  };

  const addTextNote = (point) => {
    const cleanText = String(textToWrite || '').trim();
    if (!cleanText) {
      setWhiteboardMessage('Type text first, then click on canvas to place it.');
      return;
    }

    textNotesRef.current.push({
      text: cleanText,
      x: point.x,
      y: point.y,
      size: textSize,
      color: penColor,
      createdAt: Date.now(),
    });
    redrawCanvas();
    setWhiteboardMessage('Text placed on canvas. Click another spot to place again.');
  };

  const extendStroke = (point) => {
    const stroke = currentStrokeRef.current;
    if (!stroke) {
      startStroke(point);
      return;
    }

    const previous = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const finishStroke = () => {
    currentStrokeRef.current = null;
  };

  const clearWhiteboard = () => {
    strokesRef.current = [];
    textNotesRef.current = [];
    currentStrokeRef.current = null;
    redrawCanvas();
    setWhiteboardMessage('Whiteboard cleared.');
    setTimeout(() => setWhiteboardMessage('Use mouse to draw or switch to air mode and start the camera.'), 1800);
  };

  const undoWhiteboard = () => {
    const lastStroke = strokesRef.current[strokesRef.current.length - 1] || null;
    const lastText = textNotesRef.current[textNotesRef.current.length - 1] || null;

    if (!lastStroke && !lastText) {
      setWhiteboardMessage('Nothing to undo.');
      return;
    }

    if (!lastText || ((lastStroke?.createdAt || 0) >= (lastText?.createdAt || 0))) {
      strokesRef.current.pop();
    } else {
      textNotesRef.current.pop();
    }

    currentStrokeRef.current = null;
    redrawCanvas();
    setWhiteboardMessage('Last stroke removed.');
    setTimeout(() => setWhiteboardMessage('Use mouse to draw or switch to air mode and start the camera.'), 1800);
  };

  const saveWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `visual-lab-whiteboard-${Date.now()}.png`;
    anchor.click();
    setWhiteboardMessage('Whiteboard saved as PNG.');
    setTimeout(() => setWhiteboardMessage('Use mouse to draw or switch to air mode and start the camera.'), 1800);
  };

  const saveWhiteboardPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 22;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const renderWidth = canvas.width * scale;
    const renderHeight = canvas.height * scale;
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    pdf.addImage(imageData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');
    pdf.save(`visual-lab-whiteboard-${Date.now()}.pdf`);
    setWhiteboardMessage('Whiteboard saved as PDF.');
    setTimeout(() => setWhiteboardMessage('Use mouse to draw or switch to air mode and start the camera.'), 1800);
  };

  const openAirDrawBoard = () => {
    const popup = window.open(AIR_DRAW_URL, '_blank', 'noopener,noreferrer');
    if (!popup) {
      setWhiteboardMessage('Popup blocked. Please allow popups and try Open AirDraw again.');
      return;
    }
    setWhiteboardMessage('AirDraw opened in a new tab.');
  };

  const handleCanvasPointerDown = (event) => {
    if (activeLab !== 'whiteboard' || whiteboardMode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPointFromClient(canvas, event.clientX, event.clientY);

    if (whiteboardTool === 'text') {
      addTextNote(point);
      return;
    }

    startStroke(point);
    extendStroke(point);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleCanvasPointerMove = (event) => {
    if (activeLab !== 'whiteboard' || whiteboardMode !== 'draw') return;
    if (whiteboardTool !== 'pen') return;
    if (!currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPointFromClient(canvas, event.clientX, event.clientY);
    extendStroke(point);
  };

  const handleCanvasPointerUp = () => {
    if (activeLab !== 'whiteboard' || whiteboardMode !== 'draw') return;
    if (whiteboardTool !== 'pen') return;
    finishStroke();
  };

  const handleHandResults = (results) => {
    if (activeLabRef.current !== 'whiteboard' || whiteboardModeRef.current !== 'air') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const landmarks = results?.multiHandLandmarks?.[0];
    if (!landmarks) {
      if (airStrokeActiveRef.current) {
        finishStroke();
        airStrokeActiveRef.current = false;
      }
      setWhiteboardMessage('No hand detected. Pinch thumb + index finger to write in air.');
      return;
    }

    const thumb = landmarks[4];
    const index = landmarks[8];
    const mappedX = airMirrorX ? (1 - index.x) : index.x;
    const point = {
      x: mappedX * canvas.width,
      y: index.y * canvas.height,
    };
    const pinchDistance = distance({ x: thumb.x, y: thumb.y }, { x: index.x, y: index.y });
    const pinch = pinchDistance < 0.09 || (airStrokeActiveRef.current && pinchDistance < 0.13);

    if (pinch) {
      if (!airStrokeActiveRef.current) {
        startStroke(point);
        extendStroke(point);
        airStrokeActiveRef.current = true;
      } else {
        const stroke = currentStrokeRef.current;
        const prevPoint = stroke?.points?.[stroke.points.length - 1];
        if (prevPoint) {
          const gap = distance(prevPoint, point);
          const segments = Math.min(6, Math.max(1, Math.floor(gap / 10)));
          for (let i = 1; i <= segments; i += 1) {
            const t = i / segments;
            extendStroke({
              x: prevPoint.x + ((point.x - prevPoint.x) * t),
              y: prevPoint.y + ((point.y - prevPoint.y) * t),
            });
          }
        } else {
          extendStroke(point);
        }
      }
      setWhiteboardMessage('Air writing active. Move your index finger to draw.');
    } else if (airStrokeActiveRef.current) {
      finishStroke();
      airStrokeActiveRef.current = false;
      setWhiteboardMessage('Pinch thumb + index finger to continue writing.');
    } else {
      setWhiteboardMessage('Pinch thumb + index finger to write in air.');
    }
  };

  const startCamera = async () => {
    if (cameraActive) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Camera is not supported in this browser.');
      return;
    }

    if (whiteboardModeRef.current !== 'air') {
      setWhiteboardMode('air');
      setWhiteboardMessage('Air writing mode enabled. Starting camera...');
    }

    try {
      const latestDevices = await refreshVideoDevices();
      const manualDevice = latestDevices.find((device) => device.deviceId === cameraDeviceIdRef.current) || null;

      const orderedCandidates = [];
      if (manualDevice) {
        orderedCandidates.push(manualDevice);
      }
      latestDevices
        .filter((device) => !manualDevice || device.deviceId !== manualDevice.deviceId)
        .forEach((device) => orderedCandidates.push(device));

      const strictCandidates = orderedCandidates.filter((device) => !isPhoneOrVirtualCamera(device.label));
      if (!strictCandidates.length) {
        throw new Error('Only phone/virtual camera found. Disable phone camera and keep laptop webcam enabled.');
      }

      let stream = null;
      let preferredDevice = null;
      let lastCameraError = null;

      for (const candidate of strictCandidates) {
        try {
          const candidateStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: candidate.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          const track = candidateStream.getVideoTracks?.()[0] || null;
          const label = String(track?.label || candidate.label || '').trim();
          if (isPhoneOrVirtualCamera(label)) {
            candidateStream.getTracks().forEach((t) => t.stop());
            lastCameraError = new Error(`Skipped phone camera source: ${label}`);
            continue;
          }

          stream = candidateStream;
          preferredDevice = candidate;
          break;
        } catch (error) {
          lastCameraError = error;
        }
      }

      if (!stream) {
        throw lastCameraError || new Error('Unable to access laptop webcam.');
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        throw new Error('Camera preview is unavailable.');
      }

      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      setCameraStatus(preferredDevice?.label
        ? `Camera active (${preferredDevice.label}). Initializing air writing...`
        : 'Camera active. Initializing air writing...');

      if (stream.getVideoTracks?.()[0]) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeLabel = String(activeTrack.label || '').trim();
        if (activeLabel) {
          if (isPhoneOrVirtualCamera(activeLabel)) {
            stopCamera();
            throw new Error(`Phone camera detected (${activeLabel}). Select laptop webcam in Camera source.`);
          }
          setCameraStatus(`Camera active (${activeLabel}). Initializing air writing...`);
        }
      }

      await loadMediaPipeLibraries();

      const HandsCtor = window.Hands || window?.hands?.Hands;
      const CameraCtor = window.Camera || window?.cameraUtils?.Camera;

      if (!HandsCtor || !CameraCtor) {
        throw new Error('MediaPipe libraries failed to initialize.');
      }

      const hands = new HandsCtor({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
      hands.onResults(handleHandResults);
      handsRef.current = hands;

      const camera = new CameraCtor(video, {
        onFrame: async () => {
          if (!handsRef.current || !videoRef.current) return;
          await handsRef.current.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current = camera;
      await camera.start();
      setCameraStatus('Camera active. Pinch thumb + index finger to write in air.');
      setWhiteboardMessage('Camera started. Pinch thumb + index finger to draw.');
    } catch (error) {
      if (streamRef.current) {
        setCameraStatus('Camera active, but air-writing tracking failed to load. Check network and retry Start Camera.');
        setWhiteboardMessage('Webcam is running. Air writing is unavailable right now, use Mouse Draw or retry camera.');
      } else {
        setCameraStatus(error?.message || 'Unable to start camera.');
        setWhiteboardMessage('Camera access failed. Please allow permission and try again.');
      }
    }
  };

  const stopCamera = () => {
    try {
      cameraRef.current?.stop?.();
    } catch {
      // ignore
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    cameraRef.current = null;
    handsRef.current = null;
    streamRef.current = null;
    airStrokeActiveRef.current = false;
    setCameraActive(false);
    setCameraStatus('Camera is off. Use the camera mode for air writing.');
  };

  useEffect(() => {
    if (activeLab !== 'whiteboard') {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLab]);

  const handleSyllabusUpload = (event) => {
    const file = event.target.files?.[0] || null;
    setSyllabusFile(file);
    setSyllabusInfo(null);
    setSyllabusError('');
    if (file) {
      setVisualMessage(`Selected syllabus: ${file.name}. Now generate visuals.`);
    }
  };

  const runSyllabusAnalyzer = async () => {
    if (!syllabusFile) {
      setSyllabusError('Please upload your syllabus PDF or TXT first.');
      return;
    }

    setSyllabusLoading(true);
    setSyllabusError('');
    try {
      const result = await analyzeSyllabus(syllabusFile, {
        subject,
        level,
        outputLanguage: 'english',
      });

      const answer = String(result.answer || '').trim();
      setSyllabusAnswer(answer);
      setSyllabusInfo({
        fileName: result.fileName,
        extractedChars: result.extractedChars,
      });
      setVisualMessage('Premium syllabus visuals generated. Use the tabs to explore mind maps, flowcharts, and concept boards.');
      setActiveLab('mindmap');
    } catch (error) {
      setSyllabusError(error?.message || 'Unable to analyze syllabus right now.');
    } finally {
      setSyllabusLoading(false);
    }
  };

  const downloadMindMap = () => {
    if (!mindmapSvg) return;
    downloadSvgAsset(mindmapSvg, `${safeFileName(subject)}-mindmap.svg`);
  };

  const downloadFlowchart = () => {
    if (!flowchartSvg) return;
    downloadSvgAsset(flowchartSvg, `${safeFileName(subject)}-flowchart.svg`);
  };

  const downloadConceptBoard = () => {
    if (!visualModel) return;
    const text = [
      `${subject.toUpperCase()} CONCEPT BOARD`,
      '',
      `Snapshot: ${visualModel.snapshot.join(' | ')}`,
      '',
      `High Priority: ${visualModel.priorities.high.join(' | ')}`,
      `Medium Priority: ${visualModel.priorities.medium.join(' | ')}`,
      `Low Priority: ${visualModel.priorities.low.join(' | ')}`,
      '',
      `Roadmap: ${visualModel.weeks.map((week) => week.title).join(' | ')}`,
      '',
      `Revision: ${visualModel.revision.join(' | ')}`,
    ].join('\n');
    downloadTextBlob(text, `${safeFileName(subject)}-concept-board.txt`);
  };

  const downloadWhiteboard = () => {
    saveWhiteboard();
  };

  const currentLab = LABS.find((lab) => lab.id === activeLab) || LABS[0];
  const ActiveLabIcon = currentLab?.icon || IoSparklesOutline;
  const activePreviewTitle = activeLab === 'mindmap'
    ? 'Holographic Mind Map'
    : activeLab === 'flowchart'
      ? 'Detailed Flowchart'
      : activeLab === 'board'
        ? 'Concept Board Canvas'
        : 'Air Whiteboard';

  const previewSubtitle = activeLab === 'mindmap'
    ? 'Connected syllabus branches for quick revision'
    : activeLab === 'flowchart'
      ? 'Step-by-step execution flow with clear sequencing'
      : activeLab === 'board'
        ? 'Priority clusters, revision cards, and topic lanes'
        : 'Mouse drawing and camera-based air writing';

  const previewSvg = activeLab === 'flowchart' ? flowchartPreview : mindmapPreview;
  const quickGuide = [
    '1. Upload syllabus PDF or TXT',
    '2. Pick subject and level',
    '3. Generate visuals',
    '4. Switch lab tabs to study',
  ];
  const whiteboardGuide = [
    'Choose Draw mode for mouse writing',
    'Choose Air Writing mode for camera gestures',
    'Pinch thumb + index finger to draw in air',
    'Save as PNG or PDF when done',
  ];
  const brushSizePresets = [3, 5, 8, 12];
  const selectedCameraLabel = useMemo(() => {
    if (!cameraDevices.length) return 'No webcam detected';
    if (!cameraDeviceId) return 'Auto laptop webcam';
    const picked = cameraDevices.find((device) => device.deviceId === cameraDeviceId);
    return picked?.label || 'Selected webcam';
  }, [cameraDeviceId, cameraDevices]);
  const whiteboardModeHint = whiteboardMode === 'air'
    ? 'Air mode: keep your hand inside camera frame and pinch to draw.'
    : 'Draw mode: use mouse or trackpad directly on canvas.';

  return (
    <div className="module-page visual-labs-page">
      <FloatingParticles />
      <GradientMesh colors={['#0e7490', '#06b6d4', '#a78bfa']} />

      <motion.div
        className="module-hero visual-labs-hero"
        style={{ background: 'linear-gradient(132deg, rgba(9,89,110,0.86), rgba(14,126,149,0.72), rgba(82,158,198,0.58))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Visual Labs</h1>
          <p>Turn syllabus into clean visual maps and flow, then capture ideas on a modern live whiteboard.</p>
        </div>
      </motion.div>

      <div className="visual-lab-tabs">
        {LABS.map((lab) => {
          const LabIcon = lab.icon;
          return (
            <button
              key={lab.id}
              type="button"
              className={`visual-lab-tab ${activeLab === lab.id ? 'active' : ''}`}
              onClick={() => setActiveLab(lab.id)}
            >
              <span className="visual-lab-tab-icon"><LabIcon /></span>
              <span className="visual-lab-tab-content">
                <span className="visual-lab-tab-title">{lab.title}</span>
                <span className="visual-lab-tab-detail">{lab.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="visual-labs-workspace">
        <div className="visual-workspace-banner">
          <div className="visual-workspace-badge">
            <ActiveLabIcon />
            <span>Active Lab</span>
          </div>
          <div className="visual-workspace-copy">
            <h3>{currentLab.title}</h3>
            <p>{currentLab.detail}</p>
          </div>
        </div>

        <div className="visual-guide-strip">
          {quickGuide.map((line) => (
            <div key={line} className="visual-guide-chip">{line}</div>
          ))}
        </div>

        {(activeLab === 'mindmap' || activeLab === 'flowchart') && (
          <div className="visual-lab-two-column">
            <motion.div className="visual-lab-control-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="visual-panel-header">
                <div>
                  <div className="visual-panel-kicker">Syllabus to Visuals</div>
                  <h3>Upload & Generate</h3>
                </div>
                <span className="visual-panel-badge">{subject}</span>
              </div>

              <div className="visual-control-grid">
                <div>
                  <label className="tools-label">Subject</label>
                  <select className="tools-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {SUBJECTS.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="tools-label">Level</label>
                  <select className="tools-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                    {LEVELS.map((entry) => (
                      <option key={entry.value} value={entry.value}>{entry.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="visual-upload-card">
                <label className="tools-label">Upload Syllabus PDF / TXT</label>
                <input
                  className="tools-input"
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleSyllabusUpload}
                />
                {syllabusFile && <div className="visual-file-chip">Selected: {syllabusFile.name}</div>}
              </div>

              <div className="visual-action-row">
                <button className="btn-primary" onClick={runSyllabusAnalyzer} disabled={syllabusLoading}>
                  <IoCloudUploadOutline /> {syllabusLoading ? 'Generating...' : 'Upload & Generate'}
                </button>
                <button className="btn-secondary" onClick={() => setSyllabusAnswer('')}>Reset</button>
              </div>

              {syllabusInfo && (
                <div className="visual-meta-strip">
                  <span>File: {syllabusInfo.fileName}</span>
                  <span>Extracted: {syllabusInfo.extractedChars} chars</span>
                </div>
              )}
              {syllabusError && <div className="upload-message error">{syllabusError}</div>}

              <div className="visual-actions-grid">
                <button className="visual-action-card" onClick={downloadMindMap} disabled={!mindmapSvg}>
                  <IoDownloadOutline />
                  <span>Download Mind Map</span>
                </button>
                <button className="visual-action-card" onClick={downloadFlowchart} disabled={!flowchartSvg}>
                  <IoDownloadOutline />
                  <span>Download Flowchart</span>
                </button>
              </div>

            </motion.div>

            <motion.div className="visual-lab-preview-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="visual-panel-header">
                <div>
                  <div className="visual-panel-kicker">{activePreviewTitle}</div>
                  <h3>{previewSubtitle}</h3>
                </div>
                <span className="visual-panel-badge">{activeLab === 'flowchart' ? 'Flow' : 'Mind Map'}</span>
              </div>

              {!previewSvg ? (
                <div className="visual-empty-state">
                  <IoSparklesOutline />
                  <h4>Upload a syllabus first</h4>
                  <p>The mind map and flowchart will appear here in a premium holographic layout.</p>
                </div>
              ) : (
                <div className="visual-sv-wrapper">
                  <img className="visual-sv-image" src={previewSvg} alt={`${activePreviewTitle} preview`} />
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeLab === 'board' && (
          <div className="visual-board-layout">
            <motion.div className="visual-board-header-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="visual-panel-header">
                <div>
                  <div className="visual-panel-kicker">Concept Board</div>
                  <h3>Visual Syllabus Canvas</h3>
                </div>
                <span className="visual-panel-badge">Best Study View</span>
              </div>

              <div className="visual-board-grid">
                {conceptCards.length ? conceptCards.map((card) => (
                  <div key={card.title} className={`visual-concept-card ${card.tone}`}>
                    <div className="visual-concept-title">{card.title}</div>
                    <div className="visual-concept-list">
                      {card.items.length ? card.items.slice(0, 6).map((line, idx) => (
                        <div key={`${card.title}-${idx}`} className="visual-concept-item">{line}</div>
                      )) : <div className="visual-concept-item muted">No items found</div>}
                    </div>
                  </div>
                )) : (
                  <div className="visual-empty-state visual-empty-board">
                    <IoColorPaletteOutline />
                    <h4>Generate a syllabus first</h4>
                    <p>Your board will show snapshot, priorities, roadmap, and revision cards.</p>
                  </div>
                )}
              </div>

              <div className="visual-board-legend">
                <span className="legend-high">High: revise first</span>
                <span className="legend-medium">Medium: practice next</span>
                <span className="legend-low">Low: final review</span>
              </div>

              <div className="visual-actions-grid compact">
                <button className="visual-action-card" onClick={downloadConceptBoard} disabled={!visualModel}>
                  <IoDownloadOutline />
                  <span>Download Board Notes</span>
                </button>
                <button className="visual-action-card" onClick={() => setActiveLab('mindmap')}>
                  <IoGitNetworkOutline />
                  <span>Open Mind Map</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeLab === 'whiteboard' && (
          <div className={`visual-whiteboard-layout ${whiteboardMode === 'air' ? 'air-focus' : ''}`}>
            <motion.div className="visual-whiteboard-toolbar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="visual-panel-header">
                <div>
                  <div className="visual-panel-kicker">Air Writing Whiteboard</div>
                  <h3>Laptop Camera Only</h3>
                </div>
                <span className="visual-panel-badge">{whiteboardMode === 'air' ? 'Air Mode' : 'Draw Mode'}</span>
              </div>

              <div className="visual-whiteboard-status-row">
                <span className={`visual-status-chip ${cameraActive ? 'ok' : 'warn'}`}>
                  {cameraActive ? 'Camera On' : 'Camera Off'}
                </span>
                <span className="visual-status-chip">Tool: {whiteboardTool === 'text' ? 'Text Pen' : 'Pen'}</span>
                <span className="visual-status-chip">Brush: {penSize}px</span>
                <span className="visual-status-chip">Direction: {airMirrorX ? 'Mirror' : 'Raw'}</span>
              </div>

              <div className="visual-whiteboard-note">{whiteboardModeHint}</div>

              <div className="visual-action-row wrap">
                <button className={`tools-chip ${whiteboardMode === 'draw' ? 'active' : ''}`} onClick={() => {
                  setWhiteboardMode('draw');
                  stopCamera();
                  setWhiteboardMessage('Mouse draw mode enabled. Use the canvas with your cursor.');
                }}>
                  Mouse Draw
                </button>
                <button className={`tools-chip ${whiteboardMode === 'air' ? 'active' : ''}`} onClick={() => {
                  setWhiteboardMode('air');
                  setWhiteboardMessage('Air writing mode enabled. Start the camera to draw with your hand.');
                }}>
                  Air Writing
                </button>
                <button className="btn-primary" onClick={startCamera} disabled={cameraActive}>
                  <IoPlayOutline /> Start Camera
                </button>
                <button className="btn-secondary" onClick={stopCamera} disabled={!cameraActive}>
                  <IoStopOutline /> Stop Camera
                </button>
                <button className="btn-secondary" onClick={undoWhiteboard}><IoRefreshOutline /> Undo</button>
                <button className="btn-secondary" onClick={clearWhiteboard}><IoTrashOutline /> Clear</button>
              </div>

              <div className="visual-action-row compact-tools">
                <button className="btn-secondary" onClick={downloadWhiteboard}><IoDownloadOutline /> Save PNG</button>
                <button className="btn-secondary" onClick={saveWhiteboardPdf}><IoDocumentTextOutline /> Save PDF</button>
                <button className="btn-secondary" onClick={openAirDrawBoard}><IoOpenOutline /> Open AirDraw</button>
              </div>

              <div className="visual-whiteboard-guide">
                {whiteboardGuide.map((line) => (
                  <div key={line} className="visual-guide-chip">{line}</div>
                ))}
              </div>

              <div className="visual-whiteboard-controls">
                <label>
                  <span>Camera source</span>
                  <select
                    className="tools-input"
                    value={cameraDeviceId}
                    onChange={(e) => setCameraDeviceId(e.target.value)}
                    disabled={!cameraDevices.length}
                  >
                    <option value="">Auto (Laptop Webcam Only)</option>
                    {cameraDevices.map((device, index) => (
                      <option key={device.deviceId || `cam-${index}`} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  {!cameraDevices.length && (
                    <span style={{ fontSize: '0.78rem', color: '#b42344' }}>
                      No laptop webcam found. Disable phone/virtual camera and refresh.
                    </span>
                  )}
                  {!!cameraDevices.length && (
                    <span className="visual-control-subtext">Active source: {selectedCameraLabel}</span>
                  )}
                </label>
                <label>
                  <span>Write tool</span>
                  <div className="visual-action-row">
                    <button type="button" className={`tools-chip ${whiteboardTool === 'pen' ? 'active' : ''}`} onClick={() => setWhiteboardTool('pen')}>
                      Pen
                    </button>
                    <button type="button" className={`tools-chip ${whiteboardTool === 'text' ? 'active' : ''}`} onClick={() => setWhiteboardTool('text')}>
                      Text Pen
                    </button>
                  </div>
                </label>
                <label>
                  <span>Air writing direction</span>
                  <div className="visual-action-row">
                    <button
                      type="button"
                      className={`tools-chip ${airMirrorX ? 'active' : ''}`}
                      onClick={() => setAirMirrorX(true)}
                    >
                      Natural (Mirror)
                    </button>
                    <button
                      type="button"
                      className={`tools-chip ${!airMirrorX ? 'active' : ''}`}
                      onClick={() => setAirMirrorX(false)}
                    >
                      Raw Camera
                    </button>
                  </div>
                </label>
                <label>
                  <span>Brush color</span>
                  <div className="visual-color-row">
                    {whiteboardThemes.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`visual-color-chip ${penColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setPenColor(color)}
                        aria-label={`Brush color ${color}`}
                      />
                    ))}
                  </div>
                </label>
                <label>
                  <span>Brush size</span>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={penSize}
                    onChange={(e) => setPenSize(Number(e.target.value))}
                  />
                  <div className="visual-size-presets">
                    {brushSizePresets.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`visual-size-chip ${penSize === size ? 'active' : ''}`}
                        onClick={() => setPenSize(size)}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </label>
                {whiteboardTool === 'text' && (
                  <label>
                    <span>Text to place</span>
                    <input
                      className="tools-input"
                      type="text"
                      value={textToWrite}
                      onChange={(e) => setTextToWrite(e.target.value)}
                      placeholder="Type and click on canvas"
                    />
                    <span>Text size</span>
                    <input
                      type="range"
                      min="14"
                      max="64"
                      step="1"
                      value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>

              <div className="visual-meta-strip">
                <span>{cameraStatus}</span>
                <span>{whiteboardMessage}</span>
              </div>
            </motion.div>

            <motion.div className={`visual-whiteboard-stage ${whiteboardMode === 'air' ? 'air-focus' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className={`visual-whiteboard-canvas-wrap ${whiteboardMode === 'air' ? 'air-focus' : ''}`}>
                <canvas
                  ref={canvasRef}
                  className="visual-whiteboard-canvas"
                  width="1200"
                  height="700"
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerUp}
                />
              </div>

              <div className="visual-whiteboard-side">
                <div className="visual-camera-card">
                  <video ref={videoRef} className={`visual-camera-feed ${cameraActive ? 'active' : ''}`} playsInline muted />
                  <div className="visual-camera-tip">Camera feed for hand tracking. Keep your hand inside the frame.</div>
                </div>
                <div className="visual-tip-card">
                  <IoBrushOutline />
                  <div>
                    <strong>How air writing works</strong>
                    <p>Pinch your thumb and index finger to draw. Move your finger across the camera view and the lines will appear on the whiteboard.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
