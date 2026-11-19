// Lets the OmniBar sidebar type a prompt into the chat box of the app loaded in its frame.
const bridgeOrigin = new URL(chrome.runtime.getURL('')).origin;

// An error response (e.g. ChatGPT's 403) or a Google sign-in page usually means the app needs a sign-in.
const SIGNIN_HOSTS = ['accounts.google.com'];

if (window.top !== window && location.ancestorOrigins?.[0] === bridgeOrigin) {
  const status = performance.getEntriesByType('navigation')[0]?.responseStatus ?? 0;
  if (status >= 400 || SIGNIN_HOSTS.includes(location.hostname)) {
    window.parent.postMessage({ type: 'omnibar-signin-needed' }, bridgeOrigin);
  }

  window.addEventListener('message', e => {
    if (e.origin !== bridgeOrigin || e.data?.type !== 'omnibar-insert') return;
    insertPrompt(e.data.text, e.data.send).then(ok => {
      window.parent.postMessage({ type: 'omnibar-insert-result', ok }, bridgeOrigin);
    });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function findInput() {
  const visible = el => el.offsetParent !== null && !el.disabled && !el.readOnly;
  const active = document.activeElement;
  if (active?.matches('textarea, [contenteditable="true"]') && visible(active)) return active;
  const area = el => el.offsetWidth * el.offsetHeight;
  return [...document.querySelectorAll('textarea, [contenteditable="true"]')]
    .filter(visible)
    .sort((a, b) => area(b) - area(a))[0];
}

function findSendButton(input) {
  let node = input;
  for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
    const btn = node.querySelector('button[aria-label*="send" i], button[data-testid*="send" i]');
    if (btn && !btn.disabled) return btn;
  }
  return null;
}

async function insertPrompt(text, send) {
  let input;
  for (let i = 0; i < 20 && !(input = findInput()); i++) await sleep(250);
  if (!input) return false;

  input.focus();
  if (input.tagName === 'TEXTAREA') input.select();
  else document.execCommand('selectAll');
  document.execCommand('insertText', false, text);

  if (send) {
    await sleep(300);
    const btn = findSendButton(input);
    if (btn) btn.click();
    else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
  }
  return true;
}
