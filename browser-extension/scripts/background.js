/* background.js */

/* ——— Strip framing-prevention headers so sites load in the EducoLink iframe ——— */
const IFRAME_RULE_ID = 1001;

const IFRAME_REQ_RULE_ID = 1002;

const setupIframeRules = () => {
  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [IFRAME_RULE_ID, IFRAME_REQ_RULE_ID],
      addRules: [
        {
          // Strip response headers that prevent framing
          id: IFRAME_RULE_ID,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              { header: 'X-Frame-Options',                    operation: 'remove' },
              { header: 'Content-Security-Policy',            operation: 'remove' },
              { header: 'Content-Security-Policy-Report-Only',operation: 'remove' },
            ],
          },
          condition: {
            resourceTypes: ['sub_frame'],
          },
        },
        {
          // Disguise iframe requests as top-level navigations so servers
          // that reject based on Sec-Fetch-Dest / Sec-Fetch-Site / Referer
          // treat the request like a normal browser visit.
          id: IFRAME_REQ_RULE_ID,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'Sec-Fetch-Dest', operation: 'set', value: 'document' },
              { header: 'Sec-Fetch-Mode', operation: 'set', value: 'navigate' },
              { header: 'Sec-Fetch-Site', operation: 'set', value: 'none'     },
              { header: 'Referer',        operation: 'remove'                  },
            ],
          },
          condition: {
            resourceTypes: ['sub_frame'],
          },
        },
      ],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('EducoLink: iframe rule setup failed:', chrome.runtime.lastError.message);
      }
    },
  );
};

chrome.runtime.onInstalled.addListener(setupIframeRules);
chrome.runtime.onStartup.addListener(setupIframeRules);

// Keep track of active study sessions
let activeSessions = {}; // tabId -> { bookmarkId, startUrl, domain, timeSpent, lastUpdate }

// Extract domain from URL
const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
};

const isDomainAllowed = (candidate, allowed) => {
  if (!candidate || !allowed) return false;
  return (
    candidate === allowed
    || candidate.endsWith(`.${allowed}`)
    || allowed.endsWith(`.${candidate}`)
  );
};

const startTrackedSession = (tabId, bookmarkId, url) => {
  const domain = getDomain(url);
  if (!tabId || !bookmarkId || !domain) {
    return false;
  }

  activeSessions[tabId] = {
    bookmarkId,
    startUrl: url,
    domain,
    timeSpent: 0,
    lastUpdate: Date.now()
  };
  return true;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'OPEN_TRACKED_TAB') {
    return undefined;
  }

  const bookmarkId = message?.payload?.bookmarkId;
  const inputUrl = message?.payload?.url;
  if (!bookmarkId || !inputUrl) {
    sendResponse({ ok: false, error: 'Invalid payload' });
    return undefined;
  }

  let cleanUrl;
  try {
    cleanUrl = new URL(inputUrl).toString();
  } catch {
    sendResponse({ ok: false, error: 'Invalid URL' });
    return undefined;
  }

  chrome.tabs.create({ url: cleanUrl, active: true }, (tab) => {
    if (chrome.runtime.lastError || !tab?.id) {
      sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'Failed to create tab' });
      return;
    }

    const started = startTrackedSession(tab.id, bookmarkId, cleanUrl);
    if (!started) {
      sendResponse({ ok: false, error: 'Unable to start tracked session' });
      return;
    }

    sendResponse({ ok: true, tabId: tab.id, url: cleanUrl });
  });

  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  // New session launched from EducoLink?
  if (tab.url.includes('el_track=')) {
    const urlObj = new URL(tab.url);
    const bookmarkId = urlObj.searchParams.get('el_track');
    
    // Clean URL
    urlObj.searchParams.delete('el_track');
    const cleanUrl = urlObj.toString();
    if (!activeSessions[tabId]) {
      startTrackedSession(tabId, bookmarkId, cleanUrl);
      
      // Remove query param from the URL so it looks clean to the user
      chrome.tabs.update(tabId, { url: cleanUrl });
      return;
    }
  }

  // Prevent Navigation out of domain if tracking
  const session = activeSessions[tabId];
  if (session && changeInfo.url) {
    const newDomain = getDomain(changeInfo.url);
    if (newDomain && !isDomainAllowed(newDomain, session.domain)) {
      // User tried to navigate away to a different site (e.g., youtube.com)
      // Block it by redirecting back to the allowed domain or showing a block page!
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_BLOCK', allowedDomain: session.domain });
      // Redirect back to start
      chrome.tabs.update(tabId, { url: session.startUrl });
    }
  }
});

// Remove session when tab closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSessions[tabId]) {
    delete activeSessions[tabId];
  }
});

// Periodic timer to update analytics
setInterval(() => {
  let hasUpdates = false;
  const now = Date.now();

  chrome.storage.local.get(['educolink_analytics'], (res) => {
    const analytics = res.educolink_analytics || {};

    Object.keys(activeSessions).forEach(tabId => {
      const s = activeSessions[tabId];
      const elapsed = Math.round((now - s.lastUpdate) / 1000);
      s.lastUpdate = now;
      s.timeSpent += elapsed;

      analytics[s.bookmarkId] = (analytics[s.bookmarkId] || 0) + elapsed;
      hasUpdates = true;
    });

    if (hasUpdates) {
      chrome.storage.local.set({ educolink_analytics: analytics });
    }
  });
}, 1000);
