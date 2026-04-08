export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

function getStoredToken() {
  return localStorage.getItem('token') || '';
}

function withAuthorization(headers = {}, token) {
  const resolvedToken = token || getStoredToken();
  if (!resolvedToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${resolvedToken}`,
  };
}

export async function requestJson(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const serverMessage = data?.message || `Request failed with status ${response.status}`;
      throw new Error(serverMessage);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to connect to server. Start backend on http://localhost:5001 and try again.');
    }
    throw error;
  }
}

export async function authorizedJson(path, token, options = {}) {
  return requestJson(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function listUploadedFiles() {
  const data = await requestJson('/api/files');
  return Array.isArray(data?.files) ? data.files : [];
}

export async function uploadFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid file.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Upload failed.');
  }

  return data?.file;
}

export async function askEducoAssist(prompt, options = 'chat') {
  const payload = typeof options === 'string' ? { mode: options } : { ...(options || {}) };
  const token = payload.token;
  delete payload.token;

  const data = await requestJson('/api/ai/ask', {
    method: 'POST',
    headers: withAuthorization({
      'Content-Type': 'application/json',
    }, token),
    body: JSON.stringify({ prompt, ...payload }),
  });

  return {
    answer: data?.answer || '',
    model: data?.model || 'grok',
  };
}

export async function analyzeSyllabus(file, options = {}) {
  if (!(file instanceof File)) {
    throw new Error('Please upload a valid syllabus file.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject', options.subject || 'General');
  formData.append('level', options.level || 'college');
  formData.append('outputLanguage', options.outputLanguage || 'english');
  const token = options.token;

  const response = await fetch(`${API_BASE_URL}/api/ai/syllabus-analyze`, {
    method: 'POST',
    headers: withAuthorization({}, token),
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Syllabus analysis failed.');
  }

  return {
    answer: data?.answer || '',
    model: data?.model || 'grok',
    provider: data?.provider || 'grok',
    extractedChars: data?.extractedChars || 0,
    fileName: data?.fileName || file.name,
  };
}

export async function getCurrentUser(token) {
  return authorizedJson('/api/user/me', token);
}

export async function getLearnerDashboard(token) {
  return authorizedJson('/api/learner/dashboard', token);
}

export async function ensureLearnerCode(token) {
  return authorizedJson('/api/learner/ensure-code', token, {
    method: 'POST',
  });
}

export async function syncLearnerFocusState(token, payload) {
  return authorizedJson('/api/learner/focus-state', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function submitLearnerSos(token, payload) {
  return authorizedJson('/api/learner/sos', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function submitLearnerTaskSubmission(token, taskId, payload) {
  return authorizedJson(`/api/learner/tasks/${taskId}/submissions`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function getWellwisherDashboard(token) {
  return authorizedJson('/api/wellwisher/dashboard', token);
}

export async function linkLearnerAccount(token, payload) {
  // payload: { learnerEmail } or { inviteCode }
  return authorizedJson('/api/wellwisher/link-learner', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function assignLearnerTask(token, payload) {
  return authorizedJson('/api/wellwisher/tasks', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function updateLearnerFocusControl(token, payload) {
  return authorizedJson('/api/wellwisher/focus-control', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function reviewLearnerTask(token, taskId, status) {
  return authorizedJson(`/api/wellwisher/tasks/${taskId}`, token, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
}

export async function getMessages(token, partnerId) {
  return authorizedJson(`/api/messages/${encodeURIComponent(partnerId)}`, token);
}

export async function sendMessage(token, payload) {
  return authorizedJson('/api/messages', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export async function clearMessages(token, partnerId) {
  return authorizedJson(`/api/messages/${encodeURIComponent(partnerId)}`, token, {
    method: 'DELETE',
  });
}

export async function initiateCall(token, payload) {
  return authorizedJson('/api/calls/initiate', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export async function checkCallStatus(token, executionSid) {
  return authorizedJson(`/api/calls/status/${encodeURIComponent(executionSid)}`, token);
}

export async function fetchLectureTranscript(url) {
  const token = getStoredToken();
  const data = await requestJson('/api/lectures/transcript', {
    method: 'POST',
    headers: withAuthorization({
      'Content-Type': 'application/json',
    }, token),
    body: JSON.stringify({ url }),
  });

  return {
    transcript: data?.transcript || '',
    parts: Array.isArray(data?.parts) ? data.parts : [],
    videoId: data?.videoId || '',
  };
}

export async function verifyLectureVideo(url) {
  const data = await requestJson('/api/lectures/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  return {
    ok: data?.ok === true,
    videoId: data?.videoId || '',
    watchUrl: data?.watchUrl || '',
    embedUrl: data?.embedUrl || '',
    title: data?.title || '',
    authorName: data?.authorName || '',
  };
}

export async function getBillingPlans() {
  return requestJson('/api/billing/plans');
}

export async function getBillingStatus(token) {
  return authorizedJson('/api/billing/status', token);
}

export async function createBillingOrder(token, planKey) {
  return authorizedJson('/api/billing/order', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planKey }),
  });
}

export async function verifyBillingPayment(token, payload) {
  return authorizedJson('/api/billing/verify', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export async function syncBillingSubscription(token) {
  return authorizedJson('/api/billing/sync', token, {
    method: 'POST',
  });
}
