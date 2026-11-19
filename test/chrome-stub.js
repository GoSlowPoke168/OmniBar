// Minimal chrome.* stub so sidebar.html runs in a normal page for UI checks.
(function () {
  window.__errors = [];
  const origError = console.error;
  console.error = (...a) => { window.__errors.push(a.join(' ')); origError(...a); };
  window.addEventListener('error', e => window.__errors.push(e.message));
  document.addEventListener('DOMContentLoaded', () => {
    window.__firstPaint = { theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor };
  });

  const listeners = () => {
    const fns = new Set();
    return { addListener: f => fns.add(f), removeListener: f => fns.delete(f), fire: (...a) => fns.forEach(f => f(...a)) };
  };
  const both = (value, cb) => { if (cb) setTimeout(() => cb(value)); return Promise.resolve(value); };
  const fake = n => `${location.origin}/test/fake-app.html?name=${n}`;

  const stub = {
    activeTab: { url: 'https://en.wikipedia.org/wiki/Garbage', title: 'Garbage – Wikipedia' },
    storage: {
      apps: [
        { id: 'claude', name: 'Claude', url: fake('Claude') },
        { id: 'gemini', name: 'Gemini', url: fake('Gemini') },
        { id: 'chatgpt', name: 'ChatGPT', url: fake('ChatGPT') },
        { id: 'grok', name: 'Grok', url: fake('Grok') },
        { id: 'deepseek', name: 'Deepseek', url: fake('Deepseek') },
        { id: 'images', name: 'Google Image Search', url: fake('Images') }
      ]
    },
    otherWindowTab: { url: 'https://example.com/', title: 'Other window' },
    queries: 0,
    lastFocusedWindow: 1,
    created: [],
    setActiveTab(tab) { this.activeTab = tab; },
    fireTabActivated() { chrome.tabs.onActivated.fire({ tabId: 1, windowId: 1 }); },
    fireTabUpdated(info) { chrome.tabs.onUpdated.fire(1, info, { id: 1, active: true, windowId: 1 }); }
  };
  window.__stub = stub;

  window.chrome = {
    runtime: {
      lastError: undefined,
      getManifest: () => ({ version: '1.0.0' }),
      getURL: p => `${location.origin}/${p}`,
      sendMessage(msg, cb) {
        if (msg.type !== 'get-active-tab-url') return both({ status: 'ok' }, cb);
        // Like background.js: answers for the last-focused window, not necessarily ours
        stub.queries++;
        return both({ ...(stub.lastFocusedWindow === 2 ? stub.otherWindowTab : stub.activeTab) }, cb);
      }
    },
    storage: {
      local: {
        get: keys => Promise.resolve(Object.fromEntries([].concat(keys).filter(k => k in stub.storage).map(k => [k, stub.storage[k]]))),
        set: obj => { Object.assign(stub.storage, obj); return Promise.resolve(); }
      }
    },
    commands: { getAll: cb => both([{ name: 'toggle-sidebar', shortcut: 'Alt+Z' }], cb) },
    tabs: {
      create: (opts, cb) => { stub.created.push(opts.url); return both({ id: 9, ...opts }, cb); },
      query: (qry, cb) => {
        stub.queries++;
        const tab = qry.windowId === 2 ? stub.otherWindowTab : stub.activeTab;
        return both([{ id: 1, windowId: qry.windowId ?? 1, active: true, ...tab }], cb);
      },
      onActivated: listeners(),
      onUpdated: listeners()
    },
    windows: {
      getCurrent: (opts, cb) => both({ id: 1, left: 0, top: 0, width: 1440, height: 900 }, typeof opts === 'function' ? opts : cb),
      create: (opts, cb) => { stub.created.push(opts.url); return both({ id: 7, tabs: [{ id: 70 }] }, cb); },
      remove: () => Promise.resolve(),
      onRemoved: listeners()
    }
  };
})();
