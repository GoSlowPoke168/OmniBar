// Firefox owns the current panel URL. Cache it for toolbar and shortcut
// handlers, which must invoke open/toggle during the user's input event.
const dockUrl = browser.runtime.getURL('sidebar.html');
const siteWindows = new Set();
const dockActionKey = windowId => `dockAction:${windowId}`;
const nativeDockKey = windowId => `nativeDock:${windowId}`;
let restored = false;

async function restoreSiteWindows() {
  const windows = await browser.windows.getAll();
  await Promise.all(windows.map(async ({ id }) => {
    if (await browser.sidebarAction.getPanel({ windowId: id }) !== dockUrl) siteWindows.add(id);
  }));
  restored = true;
}
restoreSiteWindows().catch(console.error);

function toggle(windowId) {
  if (siteWindows.has(windowId)) {
    browser.sidebarAction.open().catch(console.error);
    returnToDock(windowId).catch(console.error);
    return;
  }

  // A shortcut can wake the event page before its panel cache is ready.
  // Reset a site panel even if the native toggle has already closed it.
  if (!restored) {
    browser.sidebarAction.getPanel({ windowId }).then(url => {
      if (url !== dockUrl) return returnToDock(windowId);
    }).catch(console.error);
  }
  browser.sidebarAction.toggle().catch(console.error);
}

async function setSitePanel(windowId, panel) {
  await browser.sidebarAction.setPanel({ windowId, panel });
  siteWindows.add(windowId);
}

async function returnToDock(windowId, action = { type: 'dock' }) {
  const key = dockActionKey(windowId);
  await browser.storage.session.set({ [key]: action });
  try {
    await browser.sidebarAction.setPanel({ windowId, panel: null });
    siteWindows.delete(windowId);
    await browser.storage.session.remove(nativeDockKey(windowId));
  } catch (error) {
    await browser.storage.session.remove(key);
    throw error;
  }
}

browser.action.onClicked.addListener(tab => toggle(tab.windowId));

browser.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar') toggle(tab?.windowId ?? browser.windows.WINDOW_ID_CURRENT);
});

browser.runtime.onMessage.addListener((message, sender) => {
  const { type, windowId } = message;
  if (!Number.isInteger(windowId)) return;
  if (type === 'native-controls') return handleNativeControls(message, sender);
  if (sender.url !== dockUrl || sender.tab) return;
  if (type === 'dock-ready') return takeDockAction(windowId);
  if (type === 'open-native-dock') return openNativeDock(message);
  if (type === 'open-app') return openSite(message);
});

async function takeDockAction(windowId) {
  const key = dockActionKey(windowId);
  const { [key]: action } = await browser.storage.session.get(key);
  if (action) await browser.storage.session.remove(key);
  return action ?? null;
}

async function openSite({ windowId, url, startup }) {
  const panel = new URL(url);
  if (!['http:', 'https:'].includes(panel.protocol)) throw new Error('Invalid app URL');
  if (startup && !await browser.sidebarAction.isOpen({ windowId })) return;
  await setSitePanel(windowId, panel.href);
}

async function openNativeDock({ windowId, startup, app, apps, theme }) {
  const entry = new URL(app.url);
  if (!['http:', 'https:'].includes(entry.protocol)) throw new Error('Invalid app URL');
  if (startup && !await browser.sidebarAction.isOpen({ windowId })) return;
  const claude = entry.hostname === 'claude.ai';
  const direct = claude ? new URL('/recents', entry) : entry;
  const panel = claude ? new URL('/new', entry) : new URL(entry);
  const origins = [panel.origin];
  if (panel.hostname === 'images.google.com') origins.push('https://www.google.com');
  const token = crypto.randomUUID();
  panel.hash = `omnibar-${windowId}-${token}`;
  await browser.storage.session.set({
    [nativeDockKey(windowId)]: {
      token, panel: panel.href, direct: direct.href, origins, app, apps, theme,
    },
  });
  await setSitePanel(windowId, panel.href);
}

async function handleNativeControls({ windowId, token, action, index }, sender) {
  // Gecko omits the frame ID for native sidebar documents.
  if (sender.tab || (sender.frameId != null && sender.frameId !== 0) || !sender.url) return;
  const { [nativeDockKey(windowId)]: state } = await browser.storage.session.get(nativeDockKey(windowId));
  if (!state || state.token !== token || !state.origins.includes(new URL(sender.url).origin) ||
      await browser.sidebarAction.getPanel({ windowId }) !== state.panel) return;
  if (action === 'read') {
    const { icons = {} } = await browser.storage.local.get('icons');
    return { app: state.app, apps: state.apps, icons, theme: state.theme };
  }
  if (action === 'direct') {
    await setSitePanel(windowId, state.direct);
    await browser.storage.session.remove(nativeDockKey(windowId));
  } else if (action === 'app' && Number.isInteger(index) && state.apps[index]) {
    await returnToDock(windowId, { type: 'app', url: state.apps[index].url });
  } else if (['dock', 'settings', 'add', 'edit'].includes(action)) {
    await returnToDock(windowId, { type: action });
  }
}

browser.windows.onRemoved.addListener(windowId => {
  siteWindows.delete(windowId);
  browser.storage.session.remove([dockActionKey(windowId), nativeDockKey(windowId)]).catch(console.error);
});
