// Claude's sign-in pages refuse to run in a frame; tell the OmniBar sidebar so it can show sign-in steps.
const extOrigin = new URL(chrome.runtime.getURL('')).origin;

if (window.top !== window && location.ancestorOrigins?.[0] === extOrigin) {
  const BLOCKED_TEXT = /can’t (run|finish) in an embedded view/;
  let pending = false;

  const check = () => {
    pending = false;
    const blocked = [...document.querySelectorAll('[role="alert"], p')].some(el => BLOCKED_TEXT.test(el.textContent));
    if (!blocked) return;
    observer.disconnect();
    window.parent.postMessage({ type: 'omnibar-signin-needed' }, extOrigin);
  };

  const observer = new MutationObserver(() => {
    if (!pending) { pending = true; setTimeout(check, 300); }
  });
  observer.observe(document, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 30000);
}
