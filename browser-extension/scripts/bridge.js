// bridge.js - Relays page events to the extension background on localhost.
(() => {
	const PAGE_ORIGIN = window.location.origin;

	const postToPage = (type, payload = {}) => {
		window.postMessage({ type, payload }, PAGE_ORIGIN);
	};

	const publishAnalytics = () => {
		chrome.storage.local.get(['educolink_analytics'], (res) => {
			if (chrome.runtime.lastError) {
				return;
			}
			postToPage('EDUCOLINK_EXTENSION_ANALYTICS', {
				analytics: res.educolink_analytics || {},
			});
		});
	};

	window.addEventListener('message', (event) => {
		if (event.source !== window || event.origin !== PAGE_ORIGIN) {
			return;
		}

		const { type, payload, correlationId } = event.data || {};
		if (type !== 'EDUCOLINK_OPEN_TRACKED_TAB') {
			return;
		}

		chrome.runtime.sendMessage(
			{
				type: 'OPEN_TRACKED_TAB',
				payload,
			},
			(response) => {
				if (chrome.runtime.lastError || !response?.ok) {
					postToPage('EDUCOLINK_EXTENSION_ERROR', {
						correlationId,
						error: chrome.runtime.lastError?.message || response?.error || 'Extension unavailable',
					});
					return;
				}

				postToPage('EDUCOLINK_EXTENSION_OPENED', {
					correlationId,
					tabId: response.tabId,
					url: response.url,
				});
			},
		);
	});

	publishAnalytics();
	setInterval(publishAnalytics, 1500);
})();
