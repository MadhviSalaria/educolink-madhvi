import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoDocumentOutline, IoCodeSlashOutline, IoEaselOutline,
  IoGridOutline, IoChevronForward, IoDownloadOutline,
  IoResizeOutline, IoCreateOutline, IoStatsChartOutline,
  IoCopyOutline, IoTrashOutline, IoCheckmarkCircleOutline,
  IoCloudUploadOutline
} from 'react-icons/io5';
import * as XLSX from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { FloatingParticles, GradientMesh, IllustrationLaptop } from '../components/SVGBackgrounds/SVGBackgrounds';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const tools = [
  { id: 'pdf', title: 'PDF Tools', tag: 'Docs', bestFor: 'Merges and exports', icon: <IoDocumentOutline />, color: '#b41340', bg: 'var(--accent-lecture)', features: ['Merge Planner', 'Compression Estimator', 'Page Split Helper', 'Export Checklist'] },
  { id: 'word', title: 'Word Tools', tag: 'Writing', bestFor: 'Editing and clarity', icon: <IoCreateOutline />, color: '#574db3', bg: 'var(--accent-ai)', features: ['Text Cleaner', 'Case Converter', 'Word Counter', 'Read Time Estimator'] },
  { id: 'ppt', title: 'PPT Tools', tag: 'Presentations', bestFor: 'Outline and delivery', icon: <IoEaselOutline />, color: '#e65100', bg: 'var(--accent-visual)', features: ['Deck Outline Builder', 'Slide Budget', 'Flow Checker', 'Speaker Notes Tips'] },
  { id: 'excel', title: 'Excel Tools', tag: 'Data', bestFor: 'Quick analysis', icon: <IoGridOutline />, color: '#00685a', bg: 'var(--accent-notes)', features: ['CSV Analyzer', 'Column Inspector', 'Data Density Check', 'Export Assistant'] },
];

const defaultChecklist = [
  { id: 1, label: 'Final naming convention applied', done: false },
  { id: 2, label: 'Remove hidden metadata before export', done: false },
  { id: 3, label: 'Use consistent page/slide numbering', done: false },
  { id: 4, label: 'Verify font compatibility', done: false },
  { id: 5, label: 'Run final quality pass', done: false },
];

const featureGuide = {
  'Merge Planner': 'Upload multiple PDFs and merge them into a single downloadable file.',
  'Compression Estimator': 'Estimate file reduction and download an optimized PDF.',
  'Page Split Helper': 'Split one PDF into smaller downloadable chunks.',
  'Export Checklist': 'Create a simple quality checklist export for final review.',
  'Text Cleaner': 'Clean pasted or uploaded text and normalize spacing.',
  'Case Converter': 'Convert writing into UPPER, lower, or Title Case instantly.',
  'Word Counter': 'Measure the size of your content in words and characters.',
  'Read Time Estimator': 'Adjust reading speed and estimate completion time.',
  'Deck Outline Builder': 'Turn a topic into a presentation-ready outline.',
  'Slide Budget': 'Plan slide allocation by section for a balanced deck.',
  'Flow Checker': 'Detect rough flow issues before presenting.',
  'Speaker Notes Tips': 'Generate practical delivery tips for the talk.',
  'CSV Analyzer': 'Load spreadsheet data and inspect it instantly.',
  'Column Inspector': 'Analyze one column for value patterns and range.',
  'Data Density Check': 'Measure how complete and clean the dataset is.',
  'Export Assistant': 'Export a clean summary report for the current data.',
};

function toTitleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseCsvRows(csv) {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()));
  return rows;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(text, fileName) {
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), fileName);
}

export default function ProductivityTools() {
  const [activeTool, setActiveTool] = useState('word');
  const [activeFeature, setActiveFeature] = useState('Text Cleaner');
  const [clipboardMsg, setClipboardMsg] = useState('');
  const workbenchRef = useRef(null);
  const devicePickerRef = useRef(null);
  const [deviceUploadMsg, setDeviceUploadMsg] = useState('');
  const [uploadedFilesByTool, setUploadedFilesByTool] = useState({
    pdf: [],
    word: [],
    ppt: [],
    excel: [],
  });
  const [uploadedRawFilesByTool, setUploadedRawFilesByTool] = useState({
    pdf: [],
    word: [],
    ppt: [],
    excel: [],
  });

  const [textDraft, setTextDraft] = useState('');

  const [pdfFilesInput, setPdfFilesInput] = useState('');
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [pdfCompressionPercent, setPdfCompressionPercent] = useState(35);
  const [pdfSplitEvery, setPdfSplitEvery] = useState(12);
  const [exportChecklist, setExportChecklist] = useState(defaultChecklist);

  const [deckTopic, setDeckTopic] = useState('');
  const [deckDuration, setDeckDuration] = useState(10);
  const [deckAudience, setDeckAudience] = useState('');
  const [readingSpeed, setReadingSpeed] = useState(200);

  const [csvInput, setCsvInput] = useState('');
  const [selectedColumn, setSelectedColumn] = useState(0);

  const toolAcceptedTypes = {
    pdf: '.pdf',
    word: '.txt,.md,.csv,.doc,.docx',
    ppt: '.txt,.md,.ppt,.pptx',
    excel: '.csv,.txt,.tsv,.xls,.xlsx',
  };

  const uploadedFilesForActiveTool = uploadedFilesByTool[activeTool] || [];
  const currentToolMeta = tools.find((tool) => tool.id === activeTool) || tools[0];
  const currentFeatureDescription = featureGuide[activeFeature] || 'Upload from your device and work on the selected tool instantly.';
  const currentToolCount = currentToolMeta?.features?.length || 0;
  const productivityTips = [
    'Pick one module and finish one file at a time',
    'Use upload + live workbench for fastest flow',
    'Export summary before switching module',
  ];

  useEffect(() => {
    const current = tools.find((tool) => tool.id === activeTool);
    if (!current) {
      return;
    }
    if (!current.features.includes(activeFeature)) {
      setActiveFeature(current.features[0]);
    }
  }, [activeFeature, activeTool]);

  const words = useMemo(() => textDraft.trim().split(/\s+/).filter(Boolean).length, [textDraft]);
  const chars = textDraft.length;
  const lines = useMemo(() => textDraft.split(/\r?\n/).length, [textDraft]);
  const readingMinutes = words > 0 ? Math.ceil(words / readingSpeed) : 0;

  const pdfFiles = useMemo(
    () => pdfFilesInput.split(/\r?\n/).map((v) => v.trim()).filter(Boolean),
    [pdfFilesInput],
  );

  const pdfEstimatedSavedPages = Math.round((pdfPageCount * pdfCompressionPercent) / 100);
  const splitRanges = useMemo(() => {
    const ranges = [];
    let start = 1;
    while (start <= pdfPageCount) {
      const end = Math.min(start + pdfSplitEvery - 1, pdfPageCount);
      ranges.push(`${start}-${end}`);
      start = end + 1;
    }
    return ranges;
  }, [pdfPageCount, pdfSplitEvery]);

  const checklistProgress = Math.round((exportChecklist.filter((item) => item.done).length / exportChecklist.length) * 100);

  const deckSlideTarget = Math.max(4, Math.round(deckDuration * 1.2));
  const deckOutline = useMemo(() => {
    return [
      `1. Why ${deckTopic || 'your topic'}: real-world context`,
      `2. Core concepts for ${deckAudience || 'your audience'}`,
      '3. Demo or visual walkthrough',
      '4. Summary + key takeaways',
      '5. Q&A',
    ];
  }, [deckAudience, deckTopic]);

  const slideBudget = useMemo(() => {
    return {
      intro: Math.max(1, Math.round(deckSlideTarget * 0.2)),
      concept: Math.max(1, Math.round(deckSlideTarget * 0.4)),
      demo: Math.max(1, Math.round(deckSlideTarget * 0.25)),
      recap: Math.max(1, deckSlideTarget - Math.round(deckSlideTarget * 0.2) - Math.round(deckSlideTarget * 0.4) - Math.round(deckSlideTarget * 0.25)),
    };
  }, [deckSlideTarget]);

  const flowChecks = useMemo(() => {
    const issues = [];
    if (deckOutline.length < 4) {
      issues.push('Outline is short. Consider at least 4 sections.');
    }
    const longLines = deckOutline.filter((line) => line.length > 70).length;
    if (longLines > 0) {
      issues.push(`${longLines} outline lines are too long for slide titles.`);
    }
    const repeated = new Set();
    let duplicateCount = 0;
    deckOutline.forEach((line) => {
      const key = line.toLowerCase();
      if (repeated.has(key)) {
        duplicateCount += 1;
      }
      repeated.add(key);
    });
    if (duplicateCount > 0) {
      issues.push(`${duplicateCount} duplicate sections detected.`);
    }
    return issues;
  }, [deckOutline]);

  const speakerTips = useMemo(() => {
    const tips = [
      `Keep each section for ${Math.max(1, Math.round(deckDuration / deckOutline.length))} minute(s).`,
      `Use 1 story tailored for ${deckAudience}.`,
      'Pause every 2 slides for audience check-in.',
      'Close with one concrete action item.',
    ];
    return tips;
  }, [deckAudience, deckDuration, deckOutline.length]);

  const csvRows = useMemo(() => parseCsvRows(csvInput), [csvInput]);
  const csvColumns = csvRows[0]?.length || 0;
  const csvDataRows = Math.max(0, csvRows.length - 1);
  const csvHeaders = csvRows[0] || [];
  const csvBody = csvRows.slice(1);

  const inspectedValues = useMemo(() => {
    if (!csvBody.length || selectedColumn < 0) {
      return [];
    }
    return csvBody.map((row) => row[selectedColumn] ?? '');
  }, [csvBody, selectedColumn]);

  const uniqueCount = useMemo(() => new Set(inspectedValues.filter(Boolean)).size, [inspectedValues]);
  const numericValues = useMemo(() => inspectedValues.map((v) => Number(v)).filter((v) => Number.isFinite(v)), [inspectedValues]);
  const minValue = numericValues.length ? Math.min(...numericValues) : 'N/A';
  const maxValue = numericValues.length ? Math.max(...numericValues) : 'N/A';

  const totalCells = csvRows.reduce((acc, row) => acc + row.length, 0);
  const emptyCells = csvRows.reduce((acc, row) => acc + row.filter((cell) => !cell).length, 0);
  const density = totalCells ? Math.round(((totalCells - emptyCells) / totalCells) * 100) : 0;

  const exportSummary = useMemo(() => {
    return [
      `Dataset: ${csvDataRows} rows x ${csvColumns} columns`,
      `Headers: ${csvHeaders.join(', ') || 'N/A'}`,
      `Density: ${density}% non-empty cells`,
      `Inspected Column: ${csvHeaders[selectedColumn] || 'N/A'}`,
      `Unique Values: ${uniqueCount}`,
      `Range: ${minValue} to ${maxValue}`,
    ].join('\n');
  }, [csvColumns, csvDataRows, csvHeaders, density, maxValue, minValue, selectedColumn, uniqueCount]);

  const handleTextTransform = (mode) => {
    if (mode === 'upper') {
      setTextDraft((prev) => prev.toUpperCase());
      return;
    }
    if (mode === 'lower') {
      setTextDraft((prev) => prev.toLowerCase());
      return;
    }
    if (mode === 'title') {
      setTextDraft((prev) => toTitleCase(prev));
      return;
    }
    if (mode === 'clean') {
      setTextDraft((prev) => prev.replace(/\s+/g, ' ').trim());
    }
  };

  const selectToolAndFeature = (toolId, feature) => {
    setActiveTool(toolId);
    setActiveFeature(feature);
    setTimeout(() => {
      workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const toggleChecklist = (id) => {
    setExportChecklist((prev) => prev.map((item) => (
      item.id === id ? { ...item, done: !item.done } : item
    )));
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setClipboardMsg('Copied to clipboard');
      setTimeout(() => setClipboardMsg(''), 1800);
    } catch {
      setClipboardMsg('Copy not allowed in this browser');
      setTimeout(() => setClipboardMsg(''), 1800);
    }
  };

  const triggerDevicePicker = () => {
    devicePickerRef.current?.click();
  };

  const clearActiveToolUploads = () => {
    setUploadedFilesByTool((prev) => ({
      ...prev,
      [activeTool]: [],
    }));
    setUploadedRawFilesByTool((prev) => ({
      ...prev,
      [activeTool]: [],
    }));
    setDeviceUploadMsg('Cleared uploaded files for active tool');
    setTimeout(() => setDeviceUploadMsg(''), 2000);
  };

  const mergeUploadedPdfs = async () => {
    const sourceFiles = (uploadedRawFilesByTool.pdf || []).filter((file) => file?.name?.toLowerCase().endsWith('.pdf'));

    if (sourceFiles.length < 2) {
      setDeviceUploadMsg('Upload at least 2 PDF files to merge.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
      return;
    }

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of sourceFiles) {
        const bytes = await file.arrayBuffer();
        const srcPdf = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `merged-${Date.now()}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);

      setDeviceUploadMsg(`Merged ${sourceFiles.length} PDF files successfully`);
      setTimeout(() => setDeviceUploadMsg(''), 2400);
    } catch {
      setDeviceUploadMsg('Could not merge PDFs. Please upload valid PDF files.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
    }
  };

  const compressUploadedPdf = async () => {
    const source = (uploadedRawFilesByTool.pdf || []).find((file) => file?.name?.toLowerCase().endsWith('.pdf'));
    if (!source) {
      setDeviceUploadMsg('Upload a PDF first for compression.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
      return;
    }

    try {
      const bytes = await source.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const optimizedBytes = await pdf.save({ useObjectStreams: true });
      downloadBlob(new Blob([optimizedBytes], { type: 'application/pdf' }), `optimized-${source.name}`);
      setDeviceUploadMsg(`Optimized PDF downloaded: ${source.name}`);
      setTimeout(() => setDeviceUploadMsg(''), 2400);
    } catch {
      setDeviceUploadMsg('Could not optimize PDF.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
    }
  };

  const splitUploadedPdf = async () => {
    const source = (uploadedRawFilesByTool.pdf || []).find((file) => file?.name?.toLowerCase().endsWith('.pdf'));
    if (!source) {
      setDeviceUploadMsg('Upload a PDF first for split operation.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
      return;
    }

    try {
      const bytes = await source.arrayBuffer();
      const srcPdf = await PDFDocument.load(bytes);
      const pageIndices = srcPdf.getPageIndices();

      for (let i = 0; i < pageIndices.length; i += pdfSplitEvery) {
        const chunkDoc = await PDFDocument.create();
        const chunkPages = pageIndices.slice(i, i + pdfSplitEvery);
        const copied = await chunkDoc.copyPages(srcPdf, chunkPages);
        copied.forEach((page) => chunkDoc.addPage(page));
        const chunkBytes = await chunkDoc.save();
        downloadBlob(
          new Blob([chunkBytes], { type: 'application/pdf' }),
          `${source.name.replace(/\.pdf$/i, '')}-part-${Math.floor(i / pdfSplitEvery) + 1}.pdf`,
        );
      }

      setDeviceUploadMsg(`Split complete. Downloaded ${Math.ceil(pageIndices.length / pdfSplitEvery)} part(s).`);
      setTimeout(() => setDeviceUploadMsg(''), 2600);
    } catch {
      setDeviceUploadMsg('Could not split PDF.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
    }
  };

  const exportChecklistFile = () => {
    const body = exportChecklist.map((item) => `${item.done ? '[x]' : '[ ]'} ${item.label}`).join('\n');
    downloadTextFile(`Checklist Progress: ${checklistProgress}%\n\n${body}`, `pdf-export-checklist-${Date.now()}.txt`);
    setDeviceUploadMsg('Checklist exported');
    setTimeout(() => setDeviceUploadMsg(''), 2000);
  };

  const exportWordAnalysis = () => {
    const report = [
      'Word Tool Analysis',
      `Words: ${words}`,
      `Characters: ${chars}`,
      `Lines: ${lines}`,
      `Read Time: ${readingMinutes} min`,
      '',
      textDraft,
    ].join('\n');
    downloadTextFile(report, `word-analysis-${Date.now()}.txt`);
    setDeviceUploadMsg('Word analysis exported');
    setTimeout(() => setDeviceUploadMsg(''), 2000);
  };

  const exportPptPlan = () => {
    const plan = [
      `Topic: ${deckTopic}`,
      `Audience: ${deckAudience}`,
      `Duration: ${deckDuration} min`,
      `Slide Target: ${deckSlideTarget}`,
      '',
      'Outline:',
      ...deckOutline,
      '',
      `Budget - Intro: ${slideBudget.intro}, Concept: ${slideBudget.concept}, Demo: ${slideBudget.demo}, Recap: ${slideBudget.recap}`,
      '',
      'Speaker Tips:',
      ...speakerTips,
    ].join('\n');
    downloadTextFile(plan, `ppt-plan-${Date.now()}.txt`);
    setDeviceUploadMsg('PPT plan exported');
    setTimeout(() => setDeviceUploadMsg(''), 2000);
  };

  const downloadCurrentCsv = () => {
    downloadTextFile(csvInput, `csv-analyzer-${Date.now()}.csv`);
    setDeviceUploadMsg('CSV downloaded');
    setTimeout(() => setDeviceUploadMsg(''), 2000);
  };

  const downloadExcelReport = () => {
    downloadTextFile(exportSummary, `excel-report-${Date.now()}.txt`);
    setDeviceUploadMsg('Excel report downloaded');
    setTimeout(() => setDeviceUploadMsg(''), 2000);
  };

  const handleDeviceFileUpload = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) {
      return;
    }

    try {
      setUploadedFilesByTool((prev) => ({
        ...prev,
        [activeTool]: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }));
      setUploadedRawFilesByTool((prev) => ({
        ...prev,
        [activeTool]: files,
      }));

      if (activeTool === 'pdf') {
        setPdfFilesInput(files.map((file) => file.name).join('\n'));
        const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
        const estimatedPages = Math.max(1, Math.ceil(totalSize / 45000));
        setPdfPageCount(estimatedPages);
        setDeviceUploadMsg(`${files.length} PDF file(s) loaded for planning`);
      }

      if (activeTool === 'word') {
        const first = files[0];
        const text = await readFileAsText(first);
        if (text.trim()) {
          setTextDraft(text);
          setDeviceUploadMsg(`Loaded text from ${first.name}`);
        } else {
          setDeviceUploadMsg(`File ${first.name} is empty or unsupported`);
        }
      }

      if (activeTool === 'ppt') {
        const first = files[0];
        const text = await readFileAsText(first);
        const firstLine = text.split(/\r?\n/).find((line) => line.trim());
        if (firstLine) {
          setDeckTopic(firstLine.slice(0, 80));
          setDeviceUploadMsg(`Deck topic auto-filled from ${first.name}`);
        } else {
          setDeviceUploadMsg(`Loaded ${first.name}. You can continue with manual planning.`);
        }
      }

      if (activeTool === 'excel') {
        const first = files[0];
        const ext = first.name.toLowerCase().split('.').pop();

        if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
          const text = await readFileAsText(first);
          const normalized = ext === 'tsv' ? text.replace(/\t/g, ',') : text;
          setCsvInput(normalized);
          setSelectedColumn(0);
          setDeviceUploadMsg(`Loaded ${first.name} into CSV analyzer`);
        } else if (ext === 'xlsx' || ext === 'xls') {
          const buffer = await readFileAsArrayBuffer(first);
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          setCsvInput(csv);
          setSelectedColumn(0);
          setDeviceUploadMsg(`Loaded sheet from ${first.name}`);
        } else {
          setDeviceUploadMsg(`Unsupported spreadsheet format: ${first.name}`);
        }
      }

      setTimeout(() => setDeviceUploadMsg(''), 2400);
    } catch {
      setDeviceUploadMsg('Could not parse uploaded file. Try CSV/TXT/XLSX.');
      setTimeout(() => setDeviceUploadMsg(''), 2400);
    }
  };

  const illustrations = [
    <IoDocumentOutline key="0" />,
    <IoCreateOutline key="1" />,
    <IoEaselOutline key="2" />,
    <IoGridOutline key="3" />
  ];

  return (
    <div className="module-page productivity-page">
      <FloatingParticles />
      <GradientMesh colors={['#b41340', '#e91e63', '#f48fb1']} />
      
      <motion.div
        className="module-hero productivity-hero"
        style={{ background: 'linear-gradient(135deg, rgba(180,19,64,0.7), rgba(233,30,99,0.5), rgba(244,143,177,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-illustration" style={{ position: 'absolute', top: '-40px', right: '40px', opacity: 0.12, width: '300px', height: '300px' }}>
          <IllustrationLaptop />
        </div>
        <div className="module-hero-content">
          <h1>Productivity Tools</h1>
          <p>Workbench mode: practical tools you can use instantly for documents, decks, data, and writing.</p>
          <div className="productivity-hero-strip">
            <span>Fast File Workbench</span>
            <span>4 Tool Modules</span>
            <span>Upload + Edit + Export</span>
          </div>
        </div>
      </motion.div>

      <div className="productivity-tip-strip">
        {productivityTips.map((tip) => (
          <div key={tip} className="productivity-tip-chip">{tip}</div>
        ))}
      </div>

      <motion.div className="feature-grid productivity-tool-grid" variants={container} initial="hidden" animate="show">
        {tools.map((tool, i) => (
          <motion.div key={i} className="feature-card productivity-tool-card" variants={item}>
            <div className="module-card-illustration" style={{ opacity: 0.08, transform: i % 2 === 0 ? 'rotate(-5deg)' : 'rotate(8deg)' }}>
              {illustrations[i]}
            </div>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: tool.bg, color: tool.color }}>
                {tool.icon}
              </div>
              <div>
                <div className="feature-card-title">{tool.title}</div>
                <div className="feature-card-subtitle">{tool.bestFor}</div>
              </div>
              <span className="productivity-card-tag">{tool.tag}</span>
            </div>
            <div className="feature-card-body">
              {tool.features.map((feat, j) => (
                <button
                  key={j}
                  className={`feature-item feature-item-btn ${activeTool === tool.id && activeFeature === feat ? 'active' : ''}`}
                  onClick={() => selectToolAndFeature(tool.id, feat)}
                >
                  <div className="feature-item-icon" style={{ background: `${tool.color}18`, color: tool.color }}>
                    {j === 0 ? <IoResizeOutline /> : j === 1 ? <IoCodeSlashOutline /> : j === 2 ? <IoDownloadOutline /> : <IoStatsChartOutline />}
                  </div>
                  {feat}
                </button>
              ))}
            </div>
            <div className="feature-card-action">
              {activeTool === tool.id && (
                <div className="tools-inline-status">Selected: {activeFeature}</div>
              )}
              <button
                className="btn-secondary"
                onClick={() => selectToolAndFeature(tool.id, tool.features[0])}
              >
                Open {tool.title}
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <section ref={workbenchRef} className="info-section tools-workbench productivity-workbench">
        <div className="tools-workbench-spotlight">
          <div className="tools-spotlight-copy">
            <div className="tools-spotlight-tag">Live Tools Workbench</div>
            <h3>{activeTool.toUpperCase()} / {activeFeature}</h3>
            <p>{currentFeatureDescription}</p>
          </div>
          <div className="tools-kpi-row">
            <div className="tools-kpi">
              <span className="tools-kpi-label">Active Module</span>
              <strong>{currentToolMeta?.title}</strong>
            </div>
            <div className="tools-kpi">
              <span className="tools-kpi-label">Available Actions</span>
              <strong>{currentToolCount}</strong>
            </div>
            <div className="tools-kpi">
              <span className="tools-kpi-label">Device Files</span>
              <strong>{uploadedFilesForActiveTool.length}</strong>
            </div>
          </div>
        </div>

        <div className="tools-workbench-header">
          <h3>Live Tools Workbench</h3>
          <div className="tools-chip-row">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className={`tools-chip ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => selectToolAndFeature(tool.id, tool.features[0])}
              >
                {tool.title}
              </button>
            ))}
          </div>
        </div>

        <div className="tools-feedback">
          <IoCheckmarkCircleOutline /> Active tool: {activeFeature}
        </div>

        <div className="tools-device-upload">
          <div className="tools-device-upload-header">
            <IoCloudUploadOutline />
            <span>Upload From Device For This Tool</span>
          </div>
          <div className="tools-action-row">
            <button className="btn-primary" onClick={triggerDevicePicker}>
              Choose File From Laptop / Mobile
            </button>
            <button className="btn-secondary" onClick={clearActiveToolUploads}>
              <IoTrashOutline /> Clear Uploaded
            </button>
          </div>
          <div className="tools-feedback">
            <IoCheckmarkCircleOutline /> No mock data loaded. Upload files or enter your own data.
          </div>
          <input
            ref={devicePickerRef}
            type="file"
            className="upload-hidden-input"
            accept={toolAcceptedTypes[activeTool]}
            multiple={activeTool === 'pdf'}
            onChange={(e) => handleDeviceFileUpload(e.target.files)}
          />

          {uploadedFilesForActiveTool.length > 0 && (
            <div className="tools-list">
              {uploadedFilesForActiveTool.map((file) => (
                <div key={`${activeTool}-${file.name}`} className="tools-list-item">
                  {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                </div>
              ))}
            </div>
          )}

          {deviceUploadMsg && (
            <div className="tools-feedback">
              <IoCheckmarkCircleOutline /> {deviceUploadMsg}
            </div>
          )}
        </div>

        {activeTool === 'word' && (
          <div className="tools-workbench-grid">
            <div className="tools-panel">
              <label className="tools-label">Text Editor</label>
              <textarea
                className="tools-textarea"
                value={textDraft}
                placeholder="Write or upload text to start processing..."
                onChange={(e) => setTextDraft(e.target.value)}
              />
              <div className="tools-action-row">
                <button className="btn-secondary" onClick={() => handleTextTransform('clean')}><IoResizeOutline /> Clean</button>
                <button className="btn-secondary" onClick={() => handleTextTransform('title')}><IoCreateOutline /> Title Case</button>
                <button className="btn-secondary" onClick={() => handleTextTransform('upper')}><IoCodeSlashOutline /> UPPER</button>
                <button className="btn-secondary" onClick={() => handleTextTransform('lower')}><IoCodeSlashOutline /> lower</button>
                <button className="btn-secondary" onClick={() => copyText(textDraft)}><IoCopyOutline /> Copy</button>
                <button className="btn-secondary" onClick={() => setTextDraft('')}><IoTrashOutline /> Clear</button>
                <button className="btn-secondary" onClick={exportWordAnalysis}><IoDownloadOutline /> Export Analysis</button>
              </div>
              {activeFeature === 'Case Converter' && <div className="tools-feedback">Use UPPER, lower, or Title Case buttons above.</div>}
              {activeFeature === 'Text Cleaner' && <div className="tools-feedback">Click Clean to normalize extra spaces and line breaks.</div>}
              {clipboardMsg && <div className="tools-feedback"><IoCheckmarkCircleOutline /> {clipboardMsg}</div>}
            </div>

            <div className="tools-panel tools-metrics">
              {activeFeature === 'Read Time Estimator' && (
                <div className="tools-slider-row">
                  <span>Reading speed: {readingSpeed} words/min</span>
                  <input type="range" min="120" max="400" value={readingSpeed} onChange={(e) => setReadingSpeed(Number(e.target.value))} />
                </div>
              )}
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Words</div>
                  <div className="info-value">{words}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Characters</div>
                  <div className="info-value">{chars}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Lines</div>
                  <div className="info-value">{lines}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Read Time</div>
                  <div className="info-value">{readingMinutes} min</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'pdf' && (
          <div className="tools-workbench-grid">
            <div className="tools-panel">
              <label className="tools-label">PDF Merge Plan (one file per line)</label>
              <textarea
                className="tools-textarea"
                value={pdfFilesInput}
                placeholder="Uploaded PDF names will appear here..."
                onChange={(e) => setPdfFilesInput(e.target.value)}
              />
              <div className="tools-list">
                {pdfFiles.map((file, idx) => (
                  <div key={`${file}-${idx}`} className="tools-list-item">{idx + 1}. {file}</div>
                ))}
              </div>
              {activeFeature === 'Merge Planner' && (
                <div className="tools-action-row">
                  <button className="btn-secondary" onClick={() => copyText(pdfFiles.map((f, i) => `${i + 1}. ${f}`).join('\n'))}>
                    <IoCopyOutline /> Copy Merge Order
                  </button>
                  <button className="btn-primary" onClick={mergeUploadedPdfs}>
                    <IoDownloadOutline /> Merge PDFs & Download
                  </button>
                </div>
              )}
            </div>

            <div className="tools-panel">
              <label className="tools-label">Compression Estimator</label>
              <div className="tools-slider-row">
                <span>Pages: {pdfPageCount}</span>
                <input type="range" min="1" max="600" value={pdfPageCount} onChange={(e) => setPdfPageCount(Number(e.target.value))} />
              </div>
              <div className="tools-slider-row">
                <span>Compression: {pdfCompressionPercent}%</span>
                <input type="range" min="5" max="80" value={pdfCompressionPercent} onChange={(e) => setPdfCompressionPercent(Number(e.target.value))} />
              </div>
              <div className="tools-feedback">Estimated reduction: {pdfEstimatedSavedPages} pages of equivalent data.</div>

              {activeFeature === 'Compression Estimator' && (
                <button className="btn-secondary" onClick={compressUploadedPdf}>
                  <IoDownloadOutline /> Optimize & Download PDF
                </button>
              )}

              {activeFeature === 'Page Split Helper' && (
                <>
                  <div className="tools-slider-row">
                    <span>Split every {pdfSplitEvery} pages</span>
                    <input type="range" min="2" max="60" value={pdfSplitEvery} onChange={(e) => setPdfSplitEvery(Number(e.target.value))} />
                  </div>
                  <div className="tools-list">
                    {splitRanges.map((range) => (
                      <div key={range} className="tools-list-item">Part: {range}</div>
                    ))}
                  </div>
                  <button className="btn-secondary" onClick={splitUploadedPdf}>
                    <IoDownloadOutline /> Split & Download Parts
                  </button>
                </>
              )}

              {activeFeature === 'Export Checklist' && (
                <>
                  <div className="tools-feedback">Checklist completion: {checklistProgress}%</div>
                  <div className="tools-list">
                    {exportChecklist.map((item) => (
                      <button key={item.id} className="tools-list-item tools-list-item-btn" onClick={() => toggleChecklist(item.id)}>
                        {item.done ? 'Done: ' : 'Todo: '} {item.label}
                      </button>
                    ))}
                  </div>
                  <button className="btn-secondary" onClick={exportChecklistFile}>
                    <IoDownloadOutline /> Export Checklist File
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTool === 'ppt' && (
          <div className="tools-workbench-grid">
            <div className="tools-panel">
              <label className="tools-label">Presentation Planner</label>
              <input className="tools-input" value={deckTopic} onChange={(e) => setDeckTopic(e.target.value)} placeholder="Topic" />
              <input className="tools-input" value={deckAudience} onChange={(e) => setDeckAudience(e.target.value)} placeholder="Audience" />
              <input className="tools-input" type="number" min="3" max="90" value={deckDuration} onChange={(e) => setDeckDuration(Number(e.target.value))} placeholder="Duration" />
              <div className="tools-feedback">Recommended slide count: {deckSlideTarget}</div>
            </div>

            <div className="tools-panel">
              <label className="tools-label">Auto Outline</label>
              <div className="tools-list">
                {deckOutline.map((line) => (
                  <div key={line} className="tools-list-item">{line}</div>
                ))}
              </div>
              <button className="btn-secondary" onClick={() => copyText(deckOutline.join('\n'))}>
                <IoDownloadOutline /> Copy Outline
              </button>
              <button className="btn-secondary" onClick={exportPptPlan}>
                <IoDownloadOutline /> Export PPT Plan
              </button>

              {activeFeature === 'Slide Budget' && (
                <div className="info-grid">
                  <div className="info-item"><div className="info-label">Intro</div><div className="info-value">{slideBudget.intro}</div></div>
                  <div className="info-item"><div className="info-label">Concept</div><div className="info-value">{slideBudget.concept}</div></div>
                  <div className="info-item"><div className="info-label">Demo</div><div className="info-value">{slideBudget.demo}</div></div>
                  <div className="info-item"><div className="info-label">Recap</div><div className="info-value">{slideBudget.recap}</div></div>
                </div>
              )}

              {activeFeature === 'Flow Checker' && (
                <div className="tools-list">
                  {(flowChecks.length ? flowChecks : ['No major flow issues found.']).map((line) => (
                    <div key={line} className="tools-list-item">{line}</div>
                  ))}
                </div>
              )}

              {activeFeature === 'Speaker Notes Tips' && (
                <div className="tools-list">
                  {speakerTips.map((tip) => (
                    <div key={tip} className="tools-list-item">{tip}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'excel' && (
          <div className="tools-workbench-grid">
            <div className="tools-panel">
              <label className="tools-label">CSV Analyzer</label>
              <textarea
                className="tools-textarea"
                value={csvInput}
                placeholder="Upload CSV/XLSX or paste your own data here..."
                onChange={(e) => setCsvInput(e.target.value)}
              />
              <div className="tools-action-row">
                <button className="btn-secondary" onClick={() => copyText(csvInput)}><IoCopyOutline /> Copy CSV</button>
                <button className="btn-secondary" onClick={downloadCurrentCsv}><IoDownloadOutline /> Download CSV</button>
              </div>
            </div>

            <div className="tools-panel tools-metrics">
              {activeFeature === 'Column Inspector' && (
                <div className="tools-slider-row">
                  <span>Inspect column</span>
                  <select className="tools-input" value={selectedColumn} onChange={(e) => setSelectedColumn(Number(e.target.value))}>
                    {csvHeaders.map((header, idx) => (
                      <option key={`${header}-${idx}`} value={idx}>{header || `Column ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Columns</div>
                  <div className="info-value">{csvColumns}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Rows</div>
                  <div className="info-value">{csvDataRows}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Headers</div>
                  <div className="info-value">{csvHeaders.join(', ') || 'N/A'}</div>
                </div>
                {activeFeature === 'Column Inspector' && (
                  <>
                    <div className="info-item">
                      <div className="info-label">Unique</div>
                      <div className="info-value">{uniqueCount}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Min</div>
                      <div className="info-value">{minValue}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Max</div>
                      <div className="info-value">{maxValue}</div>
                    </div>
                  </>
                )}
                {activeFeature === 'Data Density Check' && (
                  <div className="info-item">
                    <div className="info-label">Density</div>
                    <div className="info-value">{density}%</div>
                  </div>
                )}
              </div>

              {activeFeature === 'Export Assistant' && (
                <>
                  <div className="tools-list-item">Export Summary Ready</div>
                  <div className="tools-action-row">
                    <button className="btn-secondary" onClick={() => copyText(exportSummary)}>
                      <IoDownloadOutline /> Copy Report
                    </button>
                    <button className="btn-secondary" onClick={downloadExcelReport}>
                      <IoDownloadOutline /> Download Report
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {clipboardMsg && <div className="tools-feedback"><IoCheckmarkCircleOutline /> {clipboardMsg}</div>}
      </section>
    </div>
  );
}
