
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => { });

// Open/close toggle
const openWindows = new Set();

function togglePanel(windowId) {
  if (openWindows.has(windowId)) {
    openWindows.delete(windowId);
    if (typeof chrome.sidePanel.close === 'function') {
      chrome.sidePanel.close({ windowId }).catch(() => { });
    }
  } else {
    chrome.sidePanel.open({ windowId }).catch(() => { });
  }
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

// Startup
chrome.runtime.onStartup.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => { });
});
