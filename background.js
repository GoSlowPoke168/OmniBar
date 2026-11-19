
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => { });

// Open/close toggle (mirrored to storage.session so it survives service worker restarts)
const OPEN_WINDOWS_KEY = 'openWindows';
const openWindows = new Set();

function hydrateOpenWindows() {
  chrome.storage.session.get(OPEN_WINDOWS_KEY).then((data) => {
    if (Array.isArray(data?.[OPEN_WINDOWS_KEY])) {
      data[OPEN_WINDOWS_KEY].forEach((wid) => openWindows.add(wid));
    }
  }).catch(() => { });
}

function persistOpenWindows() {
  chrome.storage.session.set({ [OPEN_WINDOWS_KEY]: Array.from(openWindows) }).catch(() => { });
}

hydrateOpenWindows();

function togglePanel(windowId) {
  if (openWindows.has(windowId)) {
    openWindows.delete(windowId);
    if (typeof chrome.sidePanel.close === 'function') {
      chrome.sidePanel.close({ windowId }).catch(() => { });
    }
  } else {
    openWindows.add(windowId);
    chrome.sidePanel.open({ windowId }).catch(() => { });
  }
  persistOpenWindows();
}

// Handle toolbar icon clicks
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.windowId) {
    togglePanel(tab.windowId);
  }
});

// Handle keyboard shortcuts (Alt+Z)
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar') {
    const wid = tab?.windowId;
    if (wid) {
      togglePanel(wid);
    } else {
      chrome.windows.getCurrent((win) => {
        if (win && win.id) {
          togglePanel(win.id);
        }
      });
    }
  }
});

// State tracking via messages from sidebar.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Panel open/close tracking
  if (msg.type === 'panel-opened' || msg.type === 'panel-closed') {
    const wid = msg.windowId;
    if (wid) {
      if (msg.type === 'panel-opened') openWindows.add(wid);
      if (msg.type === 'panel-closed') openWindows.delete(wid);
      persistOpenWindows();
    }
    sendResponse({ status: 'ok' });
    return;
  }

  // Get active tab URL (sidebar -> background -> reply)
  if (msg.type === 'get-active-tab-url') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      sendResponse({ url: tab?.url ?? '', title: tab?.title ?? '' });
    });
    return true;
  }

});

chrome.windows.onRemoved.addListener((windowId) => {
  if (openWindows.delete(windowId)) persistOpenWindows();
});

// Startup
chrome.runtime.onStartup.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => { });
});
