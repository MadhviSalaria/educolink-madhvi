import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoChatbubblesOutline, IoCalendarOutline, IoDocumentOutline,
  IoMicOutline, IoChevronForward, IoSparkles, IoBookOutline,
  IoSchoolOutline, IoLanguageOutline, IoSendOutline, IoDownloadOutline, IoChevronDown
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh, IllustrationMind } from '../components/SVGBackgrounds/SVGBackgrounds';
import { askEducoAssist, analyzeSyllabus } from '../services/api';
import { generateMindmapSVG, downloadMindmap, downloadPlanAsHTML, downloadPlanAsText } from '../utils/mindmapGenerator';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

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

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'hindi', label: 'Hindi' },
];

const PROMPT_LIBRARY = {
  Mathematics: {
    chat: 'Teach me integration by parts with one solved example and one practice question.',
    plan: 'Create a 10-day study plan for calculus revision before exam.',
  },
  Physics: {
    chat: 'Explain Kirchhoff laws with a real circuit example.',
    plan: 'Make a 2-week plan for mechanics and modern physics.',
  },
  Chemistry: {
    chat: 'Explain SN1 vs SN2 with comparison table and examples.',
    plan: 'Design a 7-day revision strategy for physical chemistry numericals.',
  },
  Biology: {
    chat: 'Explain photosynthesis in easy language with one memory trick.',
    plan: 'Build a chapter-wise NEET biology plan for 14 days.',
  },
  'Computer Science': {
    chat: 'Explain binary search with dry run and time complexity.',
    plan: 'Create a 2-week DSA + DBMS mixed prep schedule.',
  },
  English: {
    chat: 'Explain active vs passive voice with 5 sentence examples.',
    plan: 'Create a grammar + writing practice plan for 1 week.',
  },
  History: {
    chat: 'Explain causes of World War 1 in structured short points.',
    plan: 'Make a chapter priority plan for modern history in 12 days.',
  },
  Economics: {
    chat: 'Explain inflation types with practical examples from daily life.',
    plan: 'Create a microeconomics revision timetable for 10 days.',
  },
  General: {
    chat: 'Explain binary search with a simple example.',
    plan: 'Build a 2-week study plan for DBMS + OS + DSA.',
  },
};

const MAX_RENDER_CHARS_CHAT = 12000;
const MAX_RENDER_CHARS_PLAN = 14000;
const MAX_RENDER_CHARS_SYLLABUS = 16000;

function sanitizeAiResponse(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+•]\s+/gm, '')
    .replace(/^\s*\d+[.)-]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeAnswerLength(text = '', maxChars = MAX_RENDER_CHARS_CHAT) {
  const clean = sanitizeAiResponse(text);
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars)}\n\n...[Response shortened for smoother app performance]`;
}

function formatPlanOutput(text = '', maxLines = 25) {
  const clean = sanitizeAiResponse(text);
  const normalized = clean
    .replace(/\s+(Day\s*\d+\s*:)/gi, '\n$1')
    .replace(/\s+(Week\s*\d+\s*:)/gi, '\n$1');

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);

  return lines.join('\n');
}

function getRequestedDays(text = '', fallback = 5) {
  const match = String(text).match(/(\d{1,2})\s*-?\s*day/i);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(14, Math.max(1, parsed));
}

function enforcePlanDayCoverage(rawText = '', requestedDays = 5, maxLines = 25) {
  const normalized = formatPlanOutput(rawText, 80);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const dayRegex = /^day\s*(\d+)\s*:/i;
  const presentDays = new Set();

  lines.forEach((line) => {
    const match = line.match(dayRegex);
    if (match) {
      presentDays.add(Number(match[1]));
    }
  });

  for (let day = 1; day <= requestedDays; day += 1) {
    if (!presentDays.has(day)) {
      lines.push(`Day ${day}: Revise key concepts and solve focused practice questions.`);
    }
  }

  const dayLines = lines.filter((line) => dayRegex.test(line));
  const otherLines = lines.filter((line) => !dayRegex.test(line));
  return [...dayLines, ...otherLines].slice(0, maxLines).join('\n');
}

function normalizeLine(line = '') {
  return String(line)
    .replace(/^[-*+•]\s*/, '')
    .replace(/^\d+[\).:-]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function parseSections(text = '') {
  const lines = String(text).split('\n');
  const sections = [];
  let current = null;

  const pushCurrent = () => {
    if (current) sections.push(current);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^\d+\)\s+(.+)/) || line.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      pushCurrent();
      current = { title: normalizeLine(headingMatch[1]), lines: [] };
      continue;
    }

    if (!current) {
      current = { title: 'Syllabus Snapshot', lines: [] };
    }

    current.lines.push(normalizeLine(line));
  }

  pushCurrent();
  return sections;
}

function buildSyllabusVisualModel(answer = '') {
  const sections = parseSections(answer);

  const snapshot = sections.find((s) => /snapshot|overview/i.test(s.title)) || sections[0] || { lines: [] };
  const prioritySection = sections.find((s) => /priority/i.test(s.title)) || { lines: [] };
  const roadmapSection = sections.find((s) => /roadmap|week/i.test(s.title)) || { lines: [] };
  const flowSection = sections.find((s) => /daily|flowchart|flow/i.test(s.title)) || { lines: [] };
  const revisionSection = sections.find((s) => /revision|test/i.test(s.title)) || { lines: [] };

  const priorities = { high: [], medium: [], low: [] };
  let currentBucket = 'medium';
  for (const line of prioritySection.lines) {
    if (/high/i.test(line)) currentBucket = 'high';
    else if (/medium/i.test(line)) currentBucket = 'medium';
    else if (/low/i.test(line)) currentBucket = 'low';
    else if (line) priorities[currentBucket].push(line);
  }

  const weekLines = roadmapSection.lines.filter((line) => line && !/^[-:]+$/.test(line));
  const weeks = [];
  let currentWeek = null;
  for (const line of weekLines) {
    if (/^week\s*\d+/i.test(line)) {
      if (currentWeek) weeks.push(currentWeek);
      currentWeek = { title: line, tasks: [] };
    } else if (currentWeek) {
      currentWeek.tasks.push(line);
    } else {
      weeks.push({ title: `Week ${weeks.length + 1}`, tasks: [line] });
    }
  }
  if (currentWeek) weeks.push(currentWeek);

  const flowSteps = flowSection.lines.slice(0, 8);
  const revision = revisionSection.lines.slice(0, 6);

  return {
    snapshot: snapshot.lines.slice(0, 6),
    priorities,
    weeks: weeks.slice(0, 6),
    flowSteps,
    revision,
  };
}

export default function EducoAssist() {
  const panelRef = useRef(null);
  const downloadRef = useRef(null);
  const recognitionRef = useRef(null);
  const [mode, setMode] = useState('chat');
  const [activeFeature, setActiveFeature] = useState(null);
  const [subject, setSubject] = useState('General');
  const [level, setLevel] = useState('college');
  const [language, setLanguage] = useState('english');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusInfo, setSyllabusInfo] = useState(null);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceReply, setVoiceReply] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Ready to listen');
  const [voiceError, setVoiceError] = useState('');

  const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

  const openMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    };
    
    if (showDownloadMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDownloadMenu]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const fillPromptFromLibrary = () => {
    if (mode === 'syllabus') return;
    const subjectPrompts = PROMPT_LIBRARY[subject] || PROMPT_LIBRARY.General;
    setPrompt(subjectPrompts[mode]);
  };

  const handleSyllabusUpload = (event) => {
    const file = event.target.files?.[0] || null;
    setSyllabusFile(file);
    setSyllabusInfo(null);
  };

  const runSyllabusAnalyzer = async () => {
    if (!syllabusFile) {
      setError('Please upload your syllabus PDF first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await analyzeSyllabus(syllabusFile, {
        subject,
        level,
        outputLanguage: language,
      });

      setAnswer(result.answer || 'No roadmap generated.');
      setAnswer(normalizeAnswerLength(result.answer || 'No roadmap generated.', MAX_RENDER_CHARS_SYLLABUS));
      setSyllabusInfo({
        fileName: result.fileName,
        extractedChars: result.extractedChars,
      });
    } catch (err) {
      setError(err?.message || 'Unable to analyze syllabus right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMindmap = () => {
    if (!answer) return;
    try {
      const svgContent = generateMindmapSVG(answer, subject);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${subject}-study-plan-${timestamp}.svg`;
      downloadMindmap(svgContent, filename);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('Failed to generate mindmap:', err);
      alert('Failed to download mindmap. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!answer) return;
    try {
      downloadPlanAsHTML(answer, subject);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('HTML download error:', err);
      alert('Failed to download document: ' + err.message);
    }
  };

  const handleDownloadText = () => {
    if (!answer) return;
    try {
      downloadPlanAsText(answer, subject);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('Text download error:', err);
      alert('Failed to download text file.');
    }
  };

  const startVoiceChat = () => {
    setVoiceChatOpen(true);
    setVoiceError('');
    setVoiceStatus('Press the microphone and speak your doubt');
  };

  const stopVoiceListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceListening(false);
    setVoiceStatus('Listening stopped');
  };

  const toggleVoiceListening = async () => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setVoiceError('Voice chat is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (voiceListening) {
      stopVoiceListening();
      return;
    }

    setVoiceError('');
    setVoiceStatus('Listening... speak now');
    setVoiceListening(true);

    const recognition = new SpeechRecognition();
    let capturedTranscript = '';
    recognition.lang = language === 'hindi' ? 'hi-IN' : language === 'hinglish' ? 'en-IN' : 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcriptText = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      capturedTranscript = transcriptText;
      setVoiceTranscript(transcriptText);
    };

    recognition.onerror = (event) => {
      setVoiceError(event.error ? `Voice error: ${event.error}` : 'Voice chat failed.');
      setVoiceListening(false);
      setVoiceStatus('Ready to listen');
    };

    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceStatus('Processing your question...');

      const question = capturedTranscript.trim();
      if (!question) {
        setVoiceStatus('No voice input captured');
        return;
      }

      const isPlanRequest = /(study\s*plan|\bplan\b|roadmap|day\s*\d+)/i.test(question);
      const requestedDays = getRequestedDays(question, 5);

      setPrompt(question);
      setMode(isPlanRequest ? 'plan' : 'chat');
      setLoading(true);

      const voicePrompt = isPlanRequest
        ? `${question}\n\nOutput rules: return plain text only, no markdown symbols (#, ##, ###, *, **, -). You must include exactly Day 1 to Day ${requestedDays} with short concise lines and no missing day. Keep total output up to 25 lines.`
        : question;

      askEducoAssist(voicePrompt, {
        mode: isPlanRequest ? 'plan' : 'chat',
        subject,
        level,
        outputLanguage: language,
        responseStyle: 'structured',
        includeExamples: true,
        shortResponse: false,
      })
        .then((result) => {
          const rawReply = result.answer || 'No answer generated.';
          const reply = isPlanRequest
            ? normalizeAnswerLength(enforcePlanDayCoverage(rawReply, requestedDays, 25), MAX_RENDER_CHARS_PLAN)
            : normalizeAnswerLength(rawReply, MAX_RENDER_CHARS_CHAT);
          setAnswer(reply);
          setVoiceReply(reply);
          setVoiceStatus('Answer ready');
        })
        .catch((err) => {
          const message = err?.message || 'Unable to get voice response right now.';
          setError(message);
          setVoiceError(message);
          setVoiceStatus('Voice response failed');
        })
        .finally(() => {
          setLoading(false);
        });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const runAssist = async () => {
    const question = prompt.trim();
    if (!question) {
      setError('Please type your question first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const requestedDays = mode === 'plan' ? getRequestedDays(question, 5) : 5;
      const finalPrompt = mode === 'plan'
        ? `${question}\n\nOutput rules: return plain text only, no markdown symbols (#, ##, ###, *, **, -). You must include exactly Day 1 to Day ${requestedDays} with short concise lines and no missing day. Keep total output up to 25 lines.`
        : question;

      const result = await askEducoAssist(finalPrompt, {
        mode,
        subject,
        level,
        outputLanguage: language,
        responseStyle: 'structured',
        includeExamples: true,
      });
      const rawAnswer = result.answer || 'No answer generated.';
      if (mode === 'plan') {
        const planResponse = enforcePlanDayCoverage(rawAnswer, requestedDays, 25);
        setAnswer(normalizeAnswerLength(planResponse, MAX_RENDER_CHARS_PLAN));
      } else {
        setAnswer(normalizeAnswerLength(rawAnswer, MAX_RENDER_CHARS_CHAT));
      }
    } catch (err) {
      setError(err?.message || 'Unable to get response from Grok.');
    } finally {
      setLoading(false);
    }
  };

  const illustrations = [
    <IllustrationMind key="0" />,
    <IoSparkles key="1" />,
    <IoBookOutline key="2" />,
    <IoCalendarOutline key="3" />
  ];

  const syllabusVisual = mode === 'syllabus' ? buildSyllabusVisualModel(answer) : null;

  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#574db3', '#9c93fe', '#b8b3ff']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(87,77,179,0.7), rgba(156,147,254,0.5), rgba(184,179,255,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-illustration" style={{ position: 'absolute', top: '-40px', right: '40px', opacity: 0.12, width: '300px', height: '300px' }}>
          <IllustrationMind />
        </div>
        <div className="module-hero-content">
          <h1>EducoAssist</h1>
          <p>Your AI-Powered Study Companion. Get answers, plans, and guidance — all powered by intelligence.</p>
        </div>
      </motion.div>

      <motion.div className="feature-grid" variants={container} initial="hidden" animate="show">
        <motion.div
          className={`feature-card holo-card feature-card-popout ${activeFeature === 0 ? 'is-active' : ''}`}
          variants={item}
          role="button"
          tabIndex={0}
          onClick={() => setActiveFeature(activeFeature === 0 ? null : 0)}
          whileHover={{ y: -8, scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
        >
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(-5deg)' }}>
            {illustrations[0]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-ai)', color: '#574db3' }}>
              <IoChatbubblesOutline />
            </div>
            <div>
              <div className="feature-card-title">AI Chatbot (EducoBot)</div>
              <div className="feature-card-subtitle">Trained for academic support</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}>
                <IoSparkles />
              </div>
              Structured answers with examples
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}>
                <IoBookOutline />
              </div>
              Academic doubt solving
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}>
                <IoSchoolOutline />
              </div>
              Subject-wise expertise
            </div>
          </div>
          <div className="feature-card-action">
            <button className="btn-primary" onClick={() => openMode('chat')}>Open EducoBot</button>
            {activeFeature === 0 && <span className="feature-popout-tag">Pop-out view enabled</span>}
          </div>
        </motion.div>

        <motion.div
          className={`feature-card holo-card feature-card-popout ${activeFeature === 1 ? 'is-active' : ''}`}
          variants={item}
          role="button"
          tabIndex={0}
          onClick={() => setActiveFeature(activeFeature === 1 ? null : 1)}
          whileHover={{ y: -8, scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
        >
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(8deg)' }}>
            {illustrations[1]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-notes)', color: '#00685a' }}>
              <IoCalendarOutline />
            </div>
            <div>
              <div className="feature-card-title">AI Study Planner</div>
              <div className="feature-card-subtitle">Personalized study roadmaps</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(0,104,90,0.1)', color: '#00685a' }}>
                <IoCalendarOutline />
              </div>
              Generates study schedules
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(0,104,90,0.1)', color: '#00685a' }}>
                <IoBookOutline />
              </div>
              Suggests prerequisites & resources
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(0,104,90,0.1)', color: '#00685a' }}>
                <IoSparkles />
              </div>
              Step-by-step learning roadmap
            </div>
          </div>
          <div className="feature-card-action">
            <button className="btn-secondary" onClick={() => openMode('plan')}>Generate Plan</button>
            {activeFeature === 1 && <span className="feature-popout-tag">Pop-out view enabled</span>}
          </div>
        </motion.div>

        <motion.div
          className={`feature-card holo-card feature-card-popout ${activeFeature === 2 ? 'is-active' : ''}`}
          variants={item}
          role="button"
          tabIndex={0}
          onClick={() => setActiveFeature(activeFeature === 2 ? null : 2)}
          whileHover={{ y: -8, scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
        >
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(-5deg)' }}>
            {illustrations[2]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-visual)', color: '#e65100' }}>
              <IoDocumentOutline />
            </div>
            <div>
              <div className="feature-card-title">Syllabus Analyzer</div>
              <div className="feature-card-subtitle">Upload & analyze your syllabus</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(230,81,0,0.1)', color: '#e65100' }}>
                <IoDocumentOutline />
              </div>
              Upload syllabus PDF
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(230,81,0,0.1)', color: '#e65100' }}>
                <IoSparkles />
              </div>
              AI-generated study roadmap
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(230,81,0,0.1)', color: '#e65100' }}>
                <IoCalendarOutline />
              </div>
              Priority-based suggestions
            </div>
          </div>
          <div className="feature-card-action">
            <button className="btn-secondary" onClick={() => openMode('syllabus')}>Upload Syllabus</button>
            {activeFeature === 2 && <span className="feature-popout-tag">Pop-out view enabled</span>}
          </div>
        </motion.div>

        <motion.div
          className={`feature-card holo-card feature-card-popout ${activeFeature === 3 ? 'is-active' : ''}`}
          variants={item}
          role="button"
          tabIndex={0}
          onClick={() => setActiveFeature(activeFeature === 3 ? null : 3)}
          whileHover={{ y: -8, scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
        >
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(8deg)' }}>
            {illustrations[3]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-focus)', color: '#6a1b9a' }}>
              <IoMicOutline />
            </div>
            <div>
              <div className="feature-card-title">Voice Chat AI</div>
              <div className="feature-card-subtitle">Talk to your AI tutor</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(106,27,154,0.1)', color: '#6a1b9a' }}>
                <IoMicOutline />
              </div>
              Voice-based doubt solving
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(106,27,154,0.1)', color: '#6a1b9a' }}>
                <IoLanguageOutline />
              </div>
              English, Hindi & Hinglish
            </div>
            <div className="feature-item">
              <div className="feature-item-icon" style={{ background: 'rgba(106,27,154,0.1)', color: '#6a1b9a' }}>
                <IoChatbubblesOutline />
              </div>
              Interactive conversation
            </div>
          </div>
          <div className="feature-card-action">
            <button className="btn-primary" onClick={startVoiceChat}>Start Voice Chat</button>
            {activeFeature === 3 && <span className="feature-popout-tag">Pop-out view enabled</span>}
          </div>
        </motion.div>
      </motion.div>

      {voiceChatOpen && (
        <motion.div
          className="voice-chat-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setVoiceChatOpen(false)}
        >
          <motion.div
            className="voice-chat-modal holo-card"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="voice-chat-header">
              <div>
                <h3>Voice Chat AI</h3>
                <p>Talk to your AI tutor with live speech input and text replies.</p>
              </div>
              <button className="btn-secondary" onClick={() => setVoiceChatOpen(false)}>Close</button>
            </div>

            <div className="voice-chat-status-row">
              <span className="voice-status-pill">{voiceStatus}</span>
              <span className="voice-status-pill">{language.toUpperCase()}</span>
              <span className="voice-status-pill">{subject}</span>
            </div>

            <div className="voice-chat-panels">
              <div className="voice-chat-panel">
                <div className="voice-chat-panel-title">Your Speech</div>
                <div className="voice-chat-output">{voiceTranscript || 'Press mic and speak your question...'}</div>
              </div>
              <div className="voice-chat-panel">
                <div className="voice-chat-panel-title">AI Reply</div>
                <div className="voice-chat-output">{voiceReply || 'Your tutor response will appear here.'}</div>
              </div>
            </div>

            {voiceError && <div className="upload-message error">{voiceError}</div>}

            <div className="voice-chat-actions">
              <button className="btn-primary" onClick={toggleVoiceListening} disabled={loading}>
                <IoMicOutline /> {voiceListening ? 'Listening...' : 'Speak Now'}
              </button>
              <button className="btn-secondary" onClick={() => { setVoiceTranscript(''); setVoiceReply(''); setVoiceError(''); setVoiceStatus('Ready to listen'); }}>
                Clear
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.section
        ref={panelRef}
        className="info-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="tools-workbench-header">
          <h3>{mode === 'plan' ? 'AI Study Planner' : mode === 'syllabus' ? 'Syllabus Analyzer' : 'EducoBot Chat'}</h3>
          <div className="tools-chip-row">
            <button className={`tools-chip ${mode === 'chat' ? 'active' : ''}`} onClick={() => setMode('chat')}>Chat</button>
            <button className={`tools-chip ${mode === 'plan' ? 'active' : ''}`} onClick={() => setMode('plan')}>Plan</button>
            <button className={`tools-chip ${mode === 'syllabus' ? 'active' : ''}`} onClick={() => setMode('syllabus')}>Syllabus</button>
          </div>
        </div>

        <div className={`tools-panel workbench-holo ${mode !== 'syllabus' ? 'workbench-holo-active' : ''}`} style={{ marginTop: 'var(--space-4)' }}>
          <label className="tools-label">{mode === 'syllabus' ? 'Syllabus Analyzer (Grok)' : 'Ask EducoAssist (Grok)'}</label>
          <div className="educoassist-meta-row">
            {mode === 'syllabus' ? (
              <>
                <span className="educoassist-pill">Upload syllabus PDF</span>
                <span className="educoassist-pill">AI study roadmap</span>
                <span className="educoassist-pill">Priority-based suggestions</span>
              </>
            ) : (
              <>
                <span className="educoassist-pill">Structured Answers</span>
                <span className="educoassist-pill">Worked Examples</span>
                <span className="educoassist-pill">Subject Expert Mode</span>
              </>
            )}
          </div>

          <div className="educoassist-control-grid">
            <div className="educoassist-control-field">
              <label className="tools-label">Subject</label>
              <select className="tools-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                {SUBJECTS.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>

            <div className="educoassist-control-field">
              <label className="tools-label">Level</label>
              <select className="tools-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((entry) => (
                  <option key={entry.value} value={entry.value}>{entry.label}</option>
                ))}
              </select>
            </div>

            <div className="educoassist-control-field">
              <label className="tools-label">Language</label>
              <select className="tools-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((entry) => (
                  <option key={entry.value} value={entry.value}>{entry.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tools-action-row">
            {mode !== 'syllabus' && (
              <button className="btn-secondary" type="button" onClick={fillPromptFromLibrary}>
                Use Subject Example
              </button>
            )}
          </div>

          {mode === 'syllabus' ? (
            <>
              <div className="tools-list-item" style={{ marginBottom: '0.8rem' }}>
                <label className="tools-label" style={{ marginBottom: '0.45rem', display: 'block' }}>Upload Syllabus PDF</label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleSyllabusUpload}
                  className="tools-input"
                />
                {syllabusFile && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.9rem', color: '#4b4880' }}>
                    Selected: {syllabusFile.name}
                  </div>
                )}
              </div>
              <div className="tools-action-row">
                <button className="btn-primary" onClick={runSyllabusAnalyzer} disabled={loading}>
                  <IoDocumentOutline /> {loading ? 'Analyzing...' : 'Upload & Analyze Syllabus'}
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                className="tools-textarea"
                placeholder={(PROMPT_LIBRARY[subject] || PROMPT_LIBRARY.General)[mode]}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="tools-action-row">
                <button className="btn-primary" onClick={runAssist} disabled={loading}>
                  <IoSendOutline /> {loading ? 'Thinking...' : 'Ask Grok'}
                </button>
              </div>
            </>
          )}
          {error && <div className="upload-message error">{error}</div>}
          {!!answer && (
            <div className={`educoassist-response ${mode !== 'syllabus' ? 'response-holo' : ''}`}>
              <div className="educoassist-response-header">
                <div>
                  <span>{subject} expert response</span>
                  <span>{mode === 'plan' ? 'Study Plan' : mode === 'syllabus' ? 'Syllabus Roadmap' : 'Doubt Solved'}</span>
                </div>
                {mode === 'plan' && (
                  <div className="download-menu-container" ref={downloadRef}>
                    <button className="btn-secondary" onClick={() => setShowDownloadMenu(!showDownloadMenu)} style={{ padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                      <IoDownloadOutline style={{ fontSize: '1rem' }} /> Download <IoChevronDown style={{ fontSize: '0.8rem' }} />
                    </button>
                    {showDownloadMenu && (
                      <div className="download-menu-dropdown">
                        <button className="download-menu-item" onClick={handleDownloadMindmap}>
                          <span className="download-menu-icon">🗺️</span>
                          <div>
                            <div className="download-menu-title">SVG Mindmap</div>
                            <div className="download-menu-desc">Visual mindmap (scalable)</div>
                          </div>
                        </button>
                        <button className="download-menu-item" onClick={handleDownloadPDF}>
                          <span className="download-menu-icon">📄</span>
                          <div>
                            <div className="download-menu-title">HTML Document</div>
                            <div className="download-menu-desc">Print-friendly document</div>
                          </div>
                        </button>
                        <button className="download-menu-item" onClick={handleDownloadText}>
                          <span className="download-menu-icon">📝</span>
                          <div>
                            <div className="download-menu-title">Text File</div>
                            <div className="download-menu-desc">Plain text format</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {mode === 'syllabus' && syllabusInfo && (
                <div className="tools-list-item" style={{ marginBottom: '0.65rem', background: 'rgba(87,77,179,0.06)' }}>
                  File: {syllabusInfo.fileName} | Extracted text: {syllabusInfo.extractedChars} chars
                </div>
              )}
              {mode === 'syllabus' ? (
                <div className="syllabus-visual-wrap hologram-theme">
                  <div className="syllabus-grid-top">
                    <motion.div
                      className="syllabus-card snapshot holo-card"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.015, rotateX: 2, rotateY: -2, y: -6 }}
                      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                    >
                      <h4>Syllabus Snapshot</h4>
                      {syllabusVisual?.snapshot?.length ? syllabusVisual.snapshot.map((line, idx) => (
                        <div key={`snap-${idx}`} className="syllabus-line">{line}</div>
                      )) : <div className="syllabus-line">No snapshot points found.</div>}
                    </motion.div>

                    <motion.div
                      className="syllabus-card priorities holo-card"
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.015, rotateX: -2, rotateY: 2, y: -6 }}
                      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                    >
                      <h4>Priority Buckets</h4>
                      <div className="priority-lanes">
                        <div className="priority-lane high">
                          <strong>High</strong>
                          {syllabusVisual?.priorities?.high?.length ? syllabusVisual.priorities.high.slice(0, 4).map((line, idx) => (
                            <div key={`high-${idx}`} className="syllabus-chip">{line}</div>
                          )) : <div className="syllabus-chip muted">No items</div>}
                        </div>
                        <div className="priority-lane medium">
                          <strong>Medium</strong>
                          {syllabusVisual?.priorities?.medium?.length ? syllabusVisual.priorities.medium.slice(0, 4).map((line, idx) => (
                            <div key={`med-${idx}`} className="syllabus-chip">{line}</div>
                          )) : <div className="syllabus-chip muted">No items</div>}
                        </div>
                        <div className="priority-lane low">
                          <strong>Low</strong>
                          {syllabusVisual?.priorities?.low?.length ? syllabusVisual.priorities.low.slice(0, 4).map((line, idx) => (
                            <div key={`low-${idx}`} className="syllabus-chip">{line}</div>
                          )) : <div className="syllabus-chip muted">No items</div>}
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    className="syllabus-card roadmap holo-card"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut' }}
                    whileHover={{ scale: 1.01, rotateX: 1.5, rotateY: -1.5, y: -5 }}
                    style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                  >
                    <h4>4-Week Roadmap</h4>
                    <div className="roadmap-row">
                      {syllabusVisual?.weeks?.length ? syllabusVisual.weeks.map((week, idx) => (
                        <div key={`week-${idx}`} className="roadmap-week">
                          <div className="roadmap-week-title">{week.title}</div>
                          {week.tasks.slice(0, 3).map((task, taskIdx) => (
                            <div key={`week-${idx}-task-${taskIdx}`} className="roadmap-task">{task}</div>
                          ))}
                        </div>
                      )) : <div className="roadmap-task">No weekly roadmap lines found.</div>}
                    </div>
                  </motion.div>

                  <div className="syllabus-grid-bottom">
                    <motion.div
                      className="syllabus-card flow holo-card"
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 5.9, repeat: Infinity, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.015, rotateX: 2, rotateY: 1.5, y: -6 }}
                      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                    >
                      <h4>Daily Study Flow</h4>
                      <div className="flow-line-wrap">
                        {syllabusVisual?.flowSteps?.length ? syllabusVisual.flowSteps.map((step, idx) => (
                          <div key={`flow-${idx}`} className="flow-step">
                            <span className="flow-index">{idx + 1}</span>
                            <span>{step}</span>
                          </div>
                        )) : <div className="flow-step"><span className="flow-index">1</span><span>No flowchart steps found.</span></div>}
                      </div>
                    </motion.div>

                    <motion.div
                      className="syllabus-card revision holo-card"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.01, rotateX: -1.5, rotateY: -1.5, y: -6 }}
                      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                    >
                      <h4>Revision + Test Strategy</h4>
                      {syllabusVisual?.revision?.length ? syllabusVisual.revision.map((line, idx) => (
                        <div key={`rev-${idx}`} className="syllabus-line">{line}</div>
                      )) : <div className="syllabus-line">No revision points found.</div>}
                    </motion.div>
                  </div>

                  <details className="syllabus-raw-details">
                    <summary>View raw AI response</summary>
                    <div className="tools-list-item" style={{ whiteSpace: 'pre-wrap' }}>{answer}</div>
                  </details>
                </div>
              ) : (
                <div className="tools-list-item" style={{ whiteSpace: 'pre-wrap' }}>
                  {answer}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
