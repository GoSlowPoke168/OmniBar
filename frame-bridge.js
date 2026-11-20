// Lets the OmniBar sidebar type a prompt into the chat box of the app loaded in its frame.
const bridgeOrigin = new URL(chrome.runtime.getURL('')).origin;

// Signs an app needs a sign-in (or a check) in its own tab: an error response (e.g. ChatGPT's 403),
// a Google sign-in page, or one of these messages shown by the app.
const SIGNIN_HOSTS = ['accounts.google.com'];
const SIGNIN_TEXT = /can’t (run|finish) in an embedded view|Max challenge attempts exceeded/i;
// Only alert boxes and short error-style pages are checked, so a chat's message history is never read.
const SHORT_PAGE_CHARS = 1500;

function hasSignInError(doc) {
  if ([...doc.querySelectorAll('[role="alert"]')].some(el => SIGNIN_TEXT.test(el.textContent))) return true;
  const text = doc.body?.innerText ?? '';
  return text.length <= SHORT_PAGE_CHARS && SIGNIN_TEXT.test(text);
}

if (window.top !== window && location.ancestorOrigins?.[0] === bridgeOrigin) {
  const notifySignIn = () => window.parent.postMessage({ type: 'omnibar-signin-needed' }, bridgeOrigin);
  const status = performance.getEntriesByType('navigation')[0]?.responseStatus ?? 0;

  if (status >= 400 || SIGNIN_HOSTS.includes(location.hostname)) {
    notifySignIn();
  } else {
    let pending = false;
    const check = () => {
      pending = false;
      if (!hasSignInError(document)) return;
      observer.disconnect();
      notifySignIn();
    };
    const observer = new MutationObserver(() => {
      if (!pending) { pending = true; setTimeout(check, 500); }
    });
    observer.observe(document, { childList: true, subtree: true, characterData: true });
    check();
    setTimeout(() => observer.disconnect(), 30000);
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
