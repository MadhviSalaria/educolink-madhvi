// content.js - Runs on all URLs

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_BLOCK') {
    if (document.getElementById('educolink-blocker')) return;

    const blocker = document.createElement('div');
    blocker.id = 'educolink-blocker';
    blocker.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: linear-gradient(135deg, #1b164a, #2f277a);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 2rem;
    `;

    blocker.innerHTML = `
      <h1 style="font-size: 3rem; margin-bottom: 1rem; color: #ff8e8e;">Blocked by EducoLink</h1>
      <p style="font-size: 1.25rem; font-weight: 500;">
        You are in a Focus Session. Navigation outside of <strong>${msg.allowedDomain}</strong> is temporarily restricted.
      </p>
      <button id="edu-close-btn" style="margin-top: 2rem; padding: 0.75rem 2rem; border-radius: 99px; border: none; background: white; color: #1b164a; font-weight: bold; cursor: pointer; font-size: 1rem;">
        Return to Study
      </button>
    `;

    document.documentElement.appendChild(blocker);

    document.getElementById('edu-close-btn').addEventListener('click', () => {
      blocker.remove();
    });
  }
});
