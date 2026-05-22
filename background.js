// ── Panel behavior ─────────────────────────────────────────────────────────
// openPanelOnActionClick handles toolbar clicks & the _execute_action hotkey
// (Alt+Z). We override onClicked below for toggle support, but the behavior
// flag must still be set so the shortcut fires onClicked at all.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// ── Open/close toggle ──────────────────────────────────────────────────────
// Tracks which windows currently have the panel open.
const openWindows = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  const wid = tab.windowId;
  if (openWindows.has(wid)) {
    // Panel is open → close it
    openWindows.delete(wid);
    try {
      // chrome.sidePanel.close() requires Chrome 116+ / equivalent Edge
      if (typeof chrome.sidePanel.close === 'function') {
        await chrome.sidePanel.close({ windowId: wid });
      }
    } catch (_) { /* not supported — falls back to open (no-op toggle) */ }
  } else {
    // Panel is closed → open it
    try {
      await chrome.sidePanel.open({ windowId: wid });
      // openWindows entry is added when sidebar.js sends 'panel-opened'
    } catch (_) {}
  }
});

// ── State tracking via messages from sidebar.js ────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Panel open/close tracking
  if (msg.type === 'panel-opened' || msg.type === 'panel-closed') {
    // Side panels don't always have sender.tab, so we ask for the current window
    chrome.windows.getCurrent((win) => {
      if (win && win.id) {
        if (msg.type === 'panel-opened') openWindows.add(win.id);
        if (msg.type === 'panel-closed') openWindows.delete(win.id);
      }
      sendResponse({ status: 'ok' });
    });
    return true; // keep channel open for async reply
  }

  // Get active tab URL (sidebar → background → reply)
  if (msg.type === 'get-active-tab-url') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      sendResponse({ url: tab?.url ?? '', title: tab?.title ?? '' });
    });
    return true; // keep channel open for async reply
  }

});

// ── Startup ────────────────────────────────────────────────────────────────
// Re-assert panel behavior after browser restarts (service worker can die).
chrome.runtime.onStartup.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
