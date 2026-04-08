/**
 * Convert study plan text to SVG mindmap format
 */
export function generateMindmapSVG(planText, subject = 'Study Plan') {
  const structure = parsePlanStructure(planText, subject);
  return renderMindmapSVG(structure);
}

/**
 * Generate study plan as formatted text document (for PDF)
 */
export function generatePlanDocument(planText, subject = 'Study Plan') {
  const timestamp = new Date().toLocaleString();
  const structure = parsePlanStructure(planText, subject);
  
  let document = `STUDY PLAN - ${subject.toUpperCase()}\n`;
  document += `Generated on: ${timestamp}\n`;
  document += `${'='.repeat(60)}\n\n`;

  document += `FLOWCHART VIEW\n`;
  document += `${'-'.repeat(60)}\n`;
  document += `[${subject}]\n`;

  structure.branches.forEach((branch) => {
    document += `  |\n`;
    document += `  +--> [${branch.title}]\n`;

    if (!branch.items.length) {
      document += `        +--> (No items)\n`;
      return;
    }

    branch.items.forEach((step) => {
      document += `        +--> ${step}\n`;
    });
  });

  document += `\n`;
  document += `${'='.repeat(60)}\n`;
  document += `ORIGINAL PLAN\n`;
  document += `${'-'.repeat(60)}\n`;
  for (const line of planText.split('\n')) {
    document += `${line}\n`;
  }

  
  return document;
}

function parsePlanStructure(planText, subject) {
  const lines = planText.split('\n').map((line) => line.trim()).filter(Boolean);
  const structure = {
    title: subject,
    branches: [],
  };

  const headerPattern = /^(\d+[\)\.:-]\s+.+|day\s+\d+\b.*|week\s+\d+\b.*)$/i;
  const bulletPattern = /^(?:[\*\-\+•]\s+).+/;
  let currentBranch = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    const tableColumns = trimmed.split('|').map((part) => part.trim()).filter(Boolean);
    const isTableRow = trimmed.includes('|') && tableColumns.length >= 2 && !/^[-:]+$/.test(tableColumns[0]);
    const isHeaderLike = headerPattern.test(trimmed) || (/^[A-Z][A-Za-z0-9\s]{3,40}:$/.test(trimmed));

    if (isHeaderLike) {
      currentBranch = {
        title: trimmed.replace(/^\d+[\)\.:-]\s*/, '').replace(/:$/, ''),
        items: [],
      };
      structure.branches.push(currentBranch);
      continue;
    }

    if (isTableRow) {
      if (!currentBranch) {
        currentBranch = { title: 'Plan Steps', items: [] };
        structure.branches.push(currentBranch);
      }
      currentBranch.items.push(tableColumns.join(' - '));
      continue;
    }

    if (bulletPattern.test(trimmed)) {
      if (!currentBranch) {
        currentBranch = { title: 'Key Tasks', items: [] };
        structure.branches.push(currentBranch);
      }
      currentBranch.items.push(trimmed.replace(/^[\*\-\+•]\s*/, ''));
      continue;
    }

    if (!currentBranch) {
      currentBranch = { title: 'Overview', items: [] };
      structure.branches.push(currentBranch);
    }

    if (currentBranch.items.length && currentBranch.items[currentBranch.items.length - 1].length < 80) {
      currentBranch.items[currentBranch.items.length - 1] += ` ${trimmed}`;
    } else {
      currentBranch.items.push(trimmed);
    }
  }

  if (!structure.branches.length) {
    structure.branches.push({
      title: 'Plan Steps',
      items: lines.slice(0, 8),
    });
  }

  return structure;
}

function renderMindmapSVG(structure) {
  const branches = structure.branches.slice(0, 8).map((branch) => {
    const limitedItems = branch.items.slice(0, 6);
    const hiddenCount = Math.max(0, branch.items.length - limitedItems.length);
    if (hiddenCount > 0) {
      limitedItems.push(`+${hiddenCount} more tasks`);
    }
    return {
      title: branch.title,
      items: limitedItems,
    };
  });

  const startX = 80;
  const branchX = 360;
  const itemX = 700;
  const titleW = 190;
  const titleH = 56;
  const itemW = 410;
  const itemH = 50;
  const branchGap = 42;
  const itemGap = 16;
  const topPadding = 70;
  const rootY = 85;

  let totalHeight = topPadding + 80;
  branches.forEach((branch) => {
    const count = Math.max(1, branch.items.length);
    totalHeight += titleH + (count * (itemH + itemGap)) + branchGap;
  });

  const svgWidth = 1180;
  const svgHeight = Math.max(900, totalHeight + 30);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background:#f7f7fb">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,3 L0,6 z" fill="#7a70e8" />
    </marker>
    <style>
      .root-box { fill: #574db3; rx: 14; }
      .root-text { font-size: 22px; font-weight: 700; fill: #fff; }
      .branch-box { fill: #e9e7ff; stroke: #9c93fe; stroke-width: 2; rx: 12; }
      .branch-text { font-size: 15px; font-weight: 700; fill: #3f3696; }
      .item-box { fill: #ffffff; stroke: #b8b2ff; stroke-width: 1.5; rx: 10; }
      .item-text { font-size: 13px; fill: #2f2f45; }
      .flow-line { stroke: #8a80f0; stroke-width: 2; fill: none; marker-end: url(#arrow); }
    </style>
  </defs>
`;

  svg += `
  <rect x="${startX}" y="${rootY - 35}" width="220" height="70" class="root-box" />
  <text x="${startX + 110}" y="${rootY + 8}" text-anchor="middle" class="root-text">${escapeXml(structure.title)}</text>
`;

  let cursorY = topPadding;
  branches.forEach((branch) => {
    const itemCount = Math.max(1, branch.items.length);
    const sectionHeight = titleH + itemCount * (itemH + itemGap);
    const branchY = cursorY;
    const branchMidY = branchY + titleH / 2;

    svg += `
  <path d="M ${startX + 220} ${rootY} L ${branchX - 20} ${rootY} L ${branchX - 20} ${branchMidY} L ${branchX} ${branchMidY}" class="flow-line" />
  <rect x="${branchX}" y="${branchY}" width="${titleW}" height="${titleH}" class="branch-box" />
`;

    const titleLines = wrapText(branch.title, 22).slice(0, 2);
    titleLines.forEach((line, idx) => {
      const y = branchY + 22 + idx * 18;
      svg += `  <text x="${branchX + titleW / 2}" y="${y}" text-anchor="middle" class="branch-text">${escapeXml(line)}</text>\n`;
    });

    branch.items.forEach((item, itemIdx) => {
      const itemY = branchY + titleH + 10 + itemIdx * (itemH + itemGap);
      const itemMidY = itemY + itemH / 2;
      const elbowX = branchX + titleW + 24;

      svg += `
  <path d="M ${branchX + titleW} ${branchMidY} L ${elbowX} ${branchMidY} L ${elbowX} ${itemMidY} L ${itemX} ${itemMidY}" class="flow-line" />
  <rect x="${itemX}" y="${itemY}" width="${itemW}" height="${itemH}" class="item-box" />
`;

      const itemLines = wrapText(item, 52).slice(0, 2);
      itemLines.forEach((line, idx) => {
        const textY = itemY + 20 + idx * 17;
        svg += `  <text x="${itemX + 12}" y="${textY}" class="item-text">${escapeXml(line)}</text>\n`;
      });
    });

    cursorY += sectionHeight + branchGap;
  });

  svg += `\n</svg>`;
  return svg;
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Trigger download of SVG mindmap
 */
export function downloadMindmap(svgContent, filename = 'study-plan-mindmap.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate and download study plan as HTML file (print-friendly as PDF)
 */
export function downloadPlanAsHTML(planText, subject = 'Study Plan') {
  const timestamp = new Date().toLocaleString();
  const lines = planText.split('\n');
  
  let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)} - Study Plan</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #574db3;
      margin-bottom: 10px;
      font-size: 28px;
      border-bottom: 3px solid #9c93fe;
      padding-bottom: 15px;
    }
    .meta {
      color: #666;
      font-size: 12px;
      margin-bottom: 30px;
      font-style: italic;
    }
    h2 {
      color: #3f3696;
      margin-top: 25px;
      margin-bottom: 12px;
      font-size: 18px;
      border-left: 4px solid #9c93fe;
      padding-left: 12px;
    }
    p {
      margin-bottom: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      h1 { page-break-after: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(subject.toUpperCase())} - STUDY PLAN</h1>
    <div class="meta">Generated: ${timestamp}</div>
    
    <div class="content">`;

  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      htmlContent += '<br>';
      continue;
    }
    
    if (/^\d+\)/.test(trimmed)) {
      if (inSection) htmlContent += '</section>';
      htmlContent += `<h2>${escapeHtml(trimmed)}</h2>`;
      htmlContent += '<section>';
      inSection = true;
    } else if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('+')) {
      htmlContent += `<li>${escapeHtml(trimmed.replace(/^[\*\-\+]\s*/, ''))}</li>`;
    } else {
      htmlContent += `<p>${escapeHtml(line)}</p>`;
    }
  }
  
  htmlContent += `
    </div>
    ${inSection ? '</section>' : ''}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const timestamp_file = new Date().toISOString().slice(0, 10);
  link.download = `${subject}-study-plan-${timestamp_file}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Download study plan as text file
 */
export function downloadPlanAsText(planText, subject = 'Study Plan') {
  try {
    if (!planText) {
      console.error('No plan text provided');
      throw new Error('No plan text provided');
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    // Sanitize subject for filename - remove problematic characters
    const safeName = String(subject).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
    const filename = `${safeName}-study-plan-${timestamp}.txt`;
    
    const docText = generatePlanDocument(planText, subject);
    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (err) {
    console.error('Text download error:', err);
    throw err;
  }
}

function normalizeVisualLine(line = '') {
  return String(line)
    .replace(/^[-*+•]	?\s*/, '')
    .replace(/^\d+[\).:-]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function parseVisualSections(text = '') {
  const lines = String(text).split(/\r?\n/);
  const sections = [];
  let current = null;

  const pushCurrent = () => {
    if (current && (current.title || current.lines.length)) {
      sections.push(current);
    }
  };

  for (const rawLine of lines) {
    const line = normalizeVisualLine(rawLine);
    if (!line) continue;

    const headingMatch = line.match(/^([A-Z][A-Za-z0-9\s&-]{3,60})(?:\:)?$/) || line.match(/^\d+[\).:-]\s+(.+)/);
    if (headingMatch && !/^day\s+\d+/i.test(line) && !/^week\s+\d+/i.test(line)) {
      pushCurrent();
      current = { title: normalizeVisualLine(headingMatch[1]), lines: [] };
      continue;
    }

    if (!current) {
      current = { title: 'Overview', lines: [] };
    }

    current.lines.push(line);
  }

  pushCurrent();
  return sections;
}

function bucketLines(lines = []) {
  const buckets = {
    snapshot: [],
    priorities: { high: [], medium: [], low: [] },
    roadmap: [],
    flow: [],
    revision: [],
  };

  let activePriority = 'medium';

  lines.forEach((line) => {
    if (!line) return;
    if (/high/i.test(line) && /priority|important|must/i.test(line)) {
      activePriority = 'high';
      buckets.priorities.high.push(line);
      return;
    }
    if (/medium/i.test(line) && /priority|important|must/i.test(line)) {
      activePriority = 'medium';
      buckets.priorities.medium.push(line);
      return;
    }
    if (/low/i.test(line) && /priority|important|must/i.test(line)) {
      activePriority = 'low';
      buckets.priorities.low.push(line);
      return;
    }

    if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i.test(line)) {
      buckets.flow.push(line);
      return;
    }

    if (/week\s*\d+|day\s*\d+|module\s*\d+|chapter\s*\d+/i.test(line)) {
      buckets.roadmap.push(line);
      return;
    }

    if (/revise|revision|practice|test|mock|quiz|recap/i.test(line)) {
      buckets.revision.push(line);
      return;
    }

    if (/step|follow|do this|first|then|next|finally|process|flow/i.test(line)) {
      buckets.flow.push(line);
      return;
    }

    if (/overview|summary|snapshot|goal|objective|focus|key|topic|important/i.test(line)) {
      buckets.snapshot.push(line);
      return;
    }

    buckets.priorities[activePriority].push(line);
  });

  return buckets;
}

function uniqueNonEmpty(lines = []) {
  const seen = new Set();
  const output = [];

  lines.forEach((line) => {
    const clean = String(line || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(clean);
  });

  return output;
}

function extractFlowchartStepPool(sections = [], buckets = {}) {
  const flowSections = sections
    .filter((section) => /flowchart|daily study flow|study flow|execution flow/i.test(section.title || ''))
    .flatMap((section) => section.lines || []);

  const roadmapSections = sections
    .filter((section) => /roadmap|week|plan/i.test(section.title || ''))
    .flatMap((section) => section.lines || []);

  const weekdayLines = sections
    .flatMap((section) => section.lines || [])
    .filter((line) => /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i.test(line));

  const directSteps = sections
    .flatMap((section) => section.lines || [])
    .filter((line) => /^step\s*\d+|^first\b|^then\b|^next\b|^finally\b/i.test(line));

  const primary = uniqueNonEmpty([
    ...flowSections,
    ...weekdayLines,
    ...directSteps,
    ...(buckets.flow || []),
  ]).slice(0, 10);

  const detailPool = uniqueNonEmpty([
    ...roadmapSections,
    ...(buckets.roadmap || []),
    ...(buckets.revision || []),
    ...(buckets.snapshot || []),
    ...(buckets.priorities?.high || []),
    ...(buckets.priorities?.medium || []),
  ]);

  const fallbackPrimary = uniqueNonEmpty([
    ...detailPool,
    ...(buckets.flow || []),
  ]).slice(0, 10);

  return {
    steps: primary.length ? primary : fallbackPrimary,
    details: detailPool,
  };
}

export function buildSyllabusVisualModel(answer = '', subject = 'Syllabus') {
  const sections = parseVisualSections(answer);
  const joined = sections.flatMap((section) => section.lines);
  const buckets = bucketLines(joined);
  const flowPool = extractFlowchartStepPool(sections, buckets);

  const weeks = sections
    .flatMap((section) => section.lines)
    .filter((line) => /week\s*\d+|day\s*\d+|module\s*\d+/i.test(line))
    .slice(0, 8)
    .map((line) => ({
      title: line,
      tasks: sections.flatMap((section) => section.lines).filter((item) => item !== line).slice(0, 3),
    }));

  const flowSteps = flowPool.steps.slice(0, 10);

  const branches = [
    { title: 'Snapshot', items: buckets.snapshot.slice(0, 6) },
    { title: 'High Priority', items: buckets.priorities.high.slice(0, 6) },
    { title: 'Medium Priority', items: buckets.priorities.medium.slice(0, 6) },
    { title: 'Low Priority', items: buckets.priorities.low.slice(0, 6) },
    { title: 'Roadmap', items: buckets.roadmap.slice(0, 6) },
    { title: 'Flow', items: flowSteps.slice(0, 6) },
    { title: 'Revision', items: buckets.revision.slice(0, 6) },
  ].filter((branch) => branch.items.length);

  const conceptCards = [
    { title: 'Snapshot', tone: 'cyan', items: buckets.snapshot.slice(0, 5) },
    { title: 'Priorities', tone: 'violet', items: [...buckets.priorities.high, ...buckets.priorities.medium, ...buckets.priorities.low].slice(0, 7) },
    { title: 'Roadmap', tone: 'amber', items: buckets.roadmap.slice(0, 6) },
    { title: 'Revision', tone: 'green', items: buckets.revision.slice(0, 6) },
  ];

  return {
    title: subject,
    sections,
    snapshot: buckets.snapshot.slice(0, 6),
    priorities: buckets.priorities,
    weeks,
    flowSteps,
    flowDetails: flowPool.details,
    branches,
    conceptCards,
  };
}

function svgWrapText(text, maxChars) {
  const words = String(text).split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if ((`${current} ${word}`).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current += ` ${word}`;
    }
  });

  if (current.trim()) lines.push(current.trim());
  return lines;
}

export function generateSyllabusMindmapSVG(answer = '', subject = 'Syllabus') {
  const model = buildSyllabusVisualModel(answer, subject);
  const branchWidth = 220;
  const itemWidth = 430;
  const rootX = 90;
  const branchX = 390;
  const itemX = 700;
  const rootY = 120;
  const branchGap = 96;
  const rowHeight = 44;

  const sectionHeights = model.branches.map((branch) => 90 + (branch.items.length * rowHeight));
  const svgHeight = Math.max(960, 220 + sectionHeights.reduce((acc, value) => acc + value + branchGap, 0));

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${svgHeight}" viewBox="0 0 1280 ${svgHeight}">
  <defs>
    <linearGradient id="mindBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09162e"/>
      <stop offset="50%" stop-color="#2d215d"/>
      <stop offset="100%" stop-color="#0b2f4d"/>
    </linearGradient>
    <linearGradient id="glassCard" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.30)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.10)"/>
    </linearGradient>
    <linearGradient id="accentGlow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6de4ff"/>
      <stop offset="50%" stop-color="#a991ff"/>
      <stop offset="100%" stop-color="#ff72b3"/>
    </linearGradient>
    <filter id="blurGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
    <marker id="mindArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,4 L0,8 z" fill="#9fe8ff" />
    </marker>
    <style>
      .root-text { font: 700 24px 'Segoe UI', sans-serif; fill: #ffffff; }
      .branch-title { font: 700 16px 'Segoe UI', sans-serif; fill: #eefbff; }
      .item-text { font: 500 13px 'Segoe UI', sans-serif; fill: #e8f3ff; }
      .branch-box { rx: 18; ry: 18; fill: rgba(255,255,255,0.12); stroke: rgba(155,230,255,0.24); stroke-width: 1.5; }
      .item-box { rx: 14; ry: 14; fill: rgba(255,255,255,0.09); stroke: rgba(180,170,255,0.22); stroke-width: 1.3; }
      .connector { stroke: url(#accentGlow); stroke-width: 2.2; fill: none; marker-end: url(#mindArrow); opacity: 0.92; }
      .panel-backdrop { fill: rgba(255,255,255,0.05); }
    </style>
  </defs>
  <rect width="1280" height="${svgHeight}" fill="url(#mindBg)"/>
  <circle cx="180" cy="170" r="120" fill="#6de4ff" opacity="0.16" filter="url(#blurGlow)"/>
  <circle cx="1050" cy="240" r="180" fill="#a991ff" opacity="0.14" filter="url(#blurGlow)"/>
  <circle cx="980" cy="680" r="220" fill="#ff72b3" opacity="0.09" filter="url(#blurGlow)"/>
`;

  svg += `
  <rect x="${rootX}" y="${rootY - 42}" width="250" height="84" rx="22" fill="rgba(255,255,255,0.17)" stroke="rgba(255,255,255,0.18)"/>
  <text x="${rootX + 18}" y="${rootY - 8}" class="root-text">${escapeXml(model.title)}</text>
  <text x="${rootX + 18}" y="${rootY + 20}" class="item-text">Holographic syllabus mind map</text>
`;

  let cursorY = 85;
  model.branches.forEach((branch, index) => {
    const branchHeight = Math.max(90, 70 + branch.items.length * rowHeight);
    const branchMidY = cursorY + 40;
    const cardY = cursorY;

    svg += `
  <path d="M ${rootX + 250} ${rootY} C ${rootX + 330} ${rootY}, ${branchX - 80} ${branchMidY}, ${branchX} ${branchMidY}" class="connector"/>
  <rect x="${branchX}" y="${cardY}" width="${branchWidth}" height="${branchHeight}" class="branch-box"/>
  <rect x="${branchX + 10}" y="${cardY + 10}" width="${branchWidth - 20}" height="30" rx="12" fill="rgba(110, 228, 255, 0.14)"/>
  <text x="${branchX + 22}" y="${cardY + 31}" class="branch-title">${escapeXml(branch.title)}</text>
`;

    branch.items.forEach((item, itemIndex) => {
      const itemY = cardY + 48 + itemIndex * rowHeight;
      const itemMidY = itemY + 18;
      const textLines = svgWrapText(item, 52).slice(0, 2);

      svg += `
  <path d="M ${branchX + branchWidth} ${branchMidY} C ${branchX + branchWidth + 30} ${branchMidY}, ${itemX - 60} ${itemMidY}, ${itemX} ${itemMidY}" class="connector"/>
  <rect x="${itemX}" y="${itemY}" width="${itemWidth}" height="34" class="item-box"/>
`;

      textLines.forEach((line, lineIndex) => {
        svg += `  <text x="${itemX + 14}" y="${itemY + 15 + (lineIndex * 14)}" class="item-text">${escapeXml(line)}</text>
`;
      });
    });

    cursorY += branchHeight + branchGap;
  });

  svg += `
</svg>`;
  return svg;
}

export function generateSyllabusFlowchartSVG(answer = '', subject = 'Syllabus') {
  const model = buildSyllabusVisualModel(answer, subject);
  const steps = model.flowSteps.length ? model.flowSteps : [...model.snapshot, ...model.revision].slice(0, 6);
  const detailPool = model.flowDetails?.length
    ? model.flowDetails
    : [...model.roadmap || [], ...model.revision || [], ...model.snapshot || []];
  const width = 1240;
  const height = Math.max(760, 180 + steps.length * 110);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="flowBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111d"/>
      <stop offset="100%" stop-color="#182851"/>
    </linearGradient>
    <linearGradient id="flowCard" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.24)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.08)"/>
    </linearGradient>
    <linearGradient id="flowGlow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6de4ff"/>
      <stop offset="100%" stop-color="#a991ff"/>
    </linearGradient>
    <marker id="flowArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,4 L0,8 z" fill="#6de4ff" />
    </marker>
    <style>
      .title { font: 800 26px 'Segoe UI', sans-serif; fill: #fff; }
      .sub { font: 500 13px 'Segoe UI', sans-serif; fill: rgba(255,255,255,0.76); }
      .step-title { font: 700 15px 'Segoe UI', sans-serif; fill: #f6fbff; }
      .step-desc { font: 500 12px 'Segoe UI', sans-serif; fill: rgba(255,255,255,0.84); }
      .step-box { rx: 18; ry: 18; fill: url(#flowCard); stroke: rgba(109,228,255,0.22); stroke-width: 1.4; }
      .arrow { stroke: url(#flowGlow); stroke-width: 3; fill: none; marker-end: url(#flowArrow); }
      .index { fill: rgba(109,228,255,0.18); stroke: rgba(109,228,255,0.32); stroke-width: 1; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="url(#flowBg)"/>
`;

  svg += `
  <text x="70" y="58" class="title">${escapeXml(`${model.title} - Detailed Flowchart`)}</text>
  <text x="70" y="84" class="sub">How to study, what to do, and in what sequence</text>
`;

  const x = 70;
  const yStart = 130;
  const boxWidth = 1100;
  const boxHeight = 72;

  steps.forEach((step, idx) => {
    const y = yStart + idx * 110;
    svg += `
  <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" class="step-box"/>
  <circle cx="${x + 42}" cy="${y + 36}" r="18" class="index"/>
  <text x="${x + 42}" y="${y + 41}" text-anchor="middle" class="step-title">${idx + 1}</text>
  <text x="${x + 82}" y="${y + 28}" class="step-title">${escapeXml(step)}</text>
`;

    const desc = detailPool[idx]
      || detailPool[(idx + 1) % Math.max(detailPool.length, 1)]
      || 'Follow this step and complete one focused task before moving ahead.';
    svg += `
  <text x="${x + 82}" y="${y + 50}" class="step-desc">${escapeXml(desc)}</text>
`;

    if (idx < steps.length - 1) {
      svg += `
  <path d="M ${x + boxWidth / 2} ${y + boxHeight} L ${x + boxWidth / 2} ${y + boxHeight + 28}" class="arrow"/>
`;
    }
  });

  svg += `
</svg>`;
  return svg;
}

export function downloadSvgAsset(svgContent, filename = 'visual-lab.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

