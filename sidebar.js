const extensionApi = browser;

/* ─────────────────────────────────────────────
   OmniBar
───────────────────────────────────────────── */

const DEFAULT_APPS = [
  { id: uid(), name: 'Claude', url: 'https://claude.ai/recents' },
  { id: uid(), name: 'Gemini', url: 'https://gemini.google.com' },
  { id: uid(), name: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: uid(), name: 'Grok', url: 'https://grok.com' },
  { id: uid(), name: 'Google Image Search', url: 'https://images.google.com/' }
];

// States
let windowId = null;
let pageAccess;
let pageContextRequest = 0;
let appLocation = 'embedded';

// DOM refs
const $empty = $('empty-state');
const $editHint = $('edit-hint');
const $settingsFile = $('settings-import-file');
const $appLocation = $('settings-app-location');
const $actionTitle = $('action-page-title');
const $actionBtns = $('action-btns');
// Init
async function init() {
  const win = await browser.windows.getCurrent();
  windowId = win.id;
  const stored = await browser.storage.local.get(['apps', 'defaultAppId', 'icons', 'pageAccess', 'appLocation']);
  apps = Array.isArray(stored.apps) ? stored.apps : DEFAULT_APPS;
  defaultAppId = stored.defaultAppId ?? null;
  iconCache = Object.assign(Object.create(null), stored.icons);
  pageAccess = stored.pageAccess;
  appLocation = stored.appLocation === 'sidebar' ? 'sidebar' : 'embedded';
  $appLocation.value = appLocation;
  if (pageAccess === true && !await browser.permissions.contains({ permissions: ['tabs'] })) {
    pageAccess = false;
  }
  syncDefaultAppId();
  renderStrip();
  bindListeners();
  refreshPageContext();
  refreshIcons();

  const pending = await browser.runtime.sendMessage({ type: 'dock-ready', windowId });
  if (pending) {
    if (pending.type === 'settings') openSettings();
    if (pending.type === 'add') openModal();
    if (pending.type === 'edit') toggleEditMode();
    const selected = pending.type === 'app' && apps.find(app => app.url === pending.url);
    if (selected) launchApp(selected, false, false);
    return;
  }
  const defaultApp = apps.find(a => a.id === defaultAppId);
  if (defaultApp) launchApp(defaultApp, true, false);
}

function webUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch (_) {
    return null;
  }
}
async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, windowId });
  return tab;
}

function syncContentState() {
  $editHint.classList.toggle('hidden', !editMode);
  $empty.classList.toggle('hidden', editMode);
  $empty.textContent = apps.length ? 'Choose an app on the right to open it here.' : 'Add an app with + to get started.';
}

// Sites that require a top-level page can take over the native sidebar.
async function openAppDirectly(app, startup = false) {
  try {
    let url = app.url;
    if (url && hostOf(url) === 'claude.ai' && new URL(url).pathname === '/new') {
      url = new URL('/recents', url).href;
    }
    await browser.runtime.sendMessage({ type: 'open-app', windowId, url, startup });
  } catch (_) {
    showToast("Couldn't open this app in the sidebar.", 'error');
  }
}

async function setPageAccess(allowed) {
  pageAccess = allowed && await browser.permissions.request({ permissions: ['tabs'] });
  await browser.storage.local.set({ pageAccess });
  refreshPageContext();
  renderPageAccessControl();
}

async function refreshPageContext() {
  const request = ++pageContextRequest;
  $('action-bar').dataset.access = pageAccess === true ? 'on' : pageAccess === false ? 'off' : 'ask';
  if (pageAccess !== true) return;
  const tab = await getActiveTab();
  if (request !== pageContextRequest) return;
  const url = tab?.url ?? '';
  const isWeb = /^https?:\/\//.test(url);
  $actionTitle.textContent = isWeb ? (tab.title || hostOf(url)) : 'none';
  $actionBtns.querySelectorAll('.btn').forEach(button => { button.disabled = !isWeb; });
  if (isWeb) delete $actionBtns.dataset.tip;
  else $actionBtns.dataset.tip = 'Open a regular web page first';
}

function openInTab(url) {
  browser.tabs.create({ url });
}
async function openInWindow(url) {
  const win = await browser.windows.get(windowId);
  const width = 430;
  const left = (win.left ?? 0) + (win.width ?? 1440) - width - 8;
  await browser.windows.create({ url, type: 'popup', width, height: win.height || 900, left, top: win.top ?? 0 });
}

async function copyPagePrompt(buildPrompt) {
  if (pageAccess !== true) return;
  try {
    const tab = await getActiveTab();
    if (pageAccess !== true) return;
    if (!/^https?:\/\//.test(tab?.url ?? '')) {
      showToast('Open a regular web page first.', 'error');
      return;
    }
    await navigator.clipboard.writeText(buildPrompt(tab.url));
    showToast('Copied. Paste into your app.', 'success');
  } catch (_) {
    showToast("Couldn't copy the prompt.", 'error');
  }
}

// Add / edit dialog
function saveModal() {
  const name = $mName.value.trim();
  const text = $mUrl.value.trim();
  const url = webUrl(/^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : 'https://' + text);
  if (!name || !url) {
    showToast('Enter a valid HTTP or HTTPS address.', 'error');
    return;
  }
  if (editingId) {
    const a = apps.find(a => a.id === editingId);
    if (a) {
      a.name = name;
      a.url = url;
    }
  } else {
    apps.push({ id: uid(), name, url });
  }
  save(); closeSheet(); renderStrip();
}

// Remove
function removeApp(id) {
  apps = apps.filter(a => a.id !== id);
  syncDefaultAppId();
  save(); renderStrip();
}

// Edit mode
function toggleEditMode() {
  editMode = !editMode;
  renderStrip();
}

// Settings

function importApps(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported) || !imported.every(a => typeof a?.name === 'string' && a.name.trim() && webUrl(a.url)))
        throw new Error('Invalid format');
      const ids = new Set();
      apps = imported.map(a => {
        const id = typeof a.id === 'string' && a.id && !ids.has(a.id) ? a.id : uid();
        ids.add(id);
        return { id, name: a.name, url: webUrl(a.url), ...(a.desktop === true && { desktop: true }) };
      });
      syncDefaultAppId();
      save();
      renderStrip(); closeSheet();
      showToast('Apps imported', 'success');
    } catch (_) {
      showToast("Couldn't import: that file isn't an OmniBar export.", 'error');
    }
  };
  reader.readAsText(file);
}

async function resetToDefaults() {
  const ok = await confirmDialog({
    title: 'Reset to defaults?',
    body: "Your apps and their order will be replaced with the default list. This can't be undone.",
    confirmLabel: 'Reset'
  });
  if (!ok) return;
  apps = DEFAULT_APPS.map(a => ({ ...a, id: uid() }));
  defaultAppId = null;
  save();
  renderStrip();
  closeSheet();
  showToast('Apps reset to defaults', 'success');
}

// All listeners
function bindListeners() {
  $icons.addEventListener('dragover', onDragOver);
  $icons.addEventListener('drop', onDrop);

  // Tooltips
  document.addEventListener('pointerover', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el === tipEl) return;
    hideTip();
    if (!el) return;
    tipEl = el;
    tipTimer = setTimeout(() => showTip(el), 400);
  });
  document.documentElement.addEventListener('pointerleave', hideTip);
  ['pointerdown', 'keydown', 'wheel'].forEach(t => document.addEventListener(t, hideTip, true));

  // Strip footer
  $('btn-add').addEventListener('click', () => {
    if (openSheetId === 'modal' && !editingId) closeSheet();
    else openModal();
  });
  $('btn-edit').addEventListener('click', () => { closeSheet(); toggleEditMode(); });
  $('btn-settings').addEventListener('click', () => {
    if (openSheetId === 'settings') closeSheet();
    else openSettings();
  });

  // Page tools run in the dock before opening a web app.
  $('act-summarize').addEventListener('click', () => {
    copyPagePrompt(url => `Please summarize the webpage at <pageUrl>${url}</pageUrl> using precise and concise language. Use headers and bulleted lists in the summary, to make it scannable. Maintain the meaning and factual accuracy.`);
  });
  $('act-ask').addEventListener('click', () => {
    copyPagePrompt(url => `Use the webpage at <pageUrl>${url}</pageUrl> as context for my question: `);
  });
  $('act-copy').addEventListener('click', () => copyPagePrompt(url => url));
  browser.tabs.onActivated.addListener(info => {
    if (info.windowId === windowId) refreshPageContext();
  });
  browser.tabs.onUpdated.addListener((id, info, tab) => {
    if (tab.active && tab.windowId === windowId && (info.url || info.title)) refreshPageContext();
  });
  browser.permissions.onRemoved.addListener(({ permissions }) => {
    if (!permissions?.includes('tabs')) return;
    pageAccess = false;
    browser.storage.local.set({ pageAccess });
    refreshPageContext();
    renderPageAccessControl();
  });

  // Sheets
  $sheetLayer.addEventListener('click', e => { if (e.target === $sheetLayer) closeSheet(); });
  $confirmOverlay.addEventListener('click', e => { if (e.target === $confirmOverlay) confirmResolve?.(false); });
  $('confirm-cancel').addEventListener('click', () => confirmResolve?.(false));
  $('confirm-ok').addEventListener('click', () => confirmResolve?.(true));

  // Add / edit dialog
  $('modal-close').addEventListener('click', () => closeSheet());
  $('modal-cancel').addEventListener('click', () => closeSheet());
  $mSave.addEventListener('click', saveModal);
  [$mName, $mUrl].forEach(input => {
    input.addEventListener('input', validateModal);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !$mSave.disabled) saveModal(); });
  });

  // Context menu
  $ctxMenu.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action || !ctxApp) return;
    if (action === 'open-tab') openInTab(ctxApp.url);
    if (action === 'open-win') openInWindow(ctxApp.url);
    if (action === 'signin') {
      const url = ctxApp.url;
      openInWindow(iconHost(url) === 'claude.ai' ? 'https://claude.ai/login' : url);
    }
    if (action === 'edit') openModal(ctxApp);
    if (action === 'remove') removeApp(ctxApp.id);
    hideCtxMenu();
  });
  document.addEventListener('click', e => { if (!$ctxMenu.contains(e.target)) hideCtxMenu(); });
  document.addEventListener('contextmenu', hideCtxMenu);
  document.addEventListener('scroll', hideCtxMenu, true);

  // Page access notice
  $('page-allow').addEventListener('click', () => setPageAccess(true));
  $('page-notnow').addEventListener('click', () => setPageAccess(false));
  $('page-turnon').addEventListener('click', e => { e.preventDefault(); setPageAccess(true); });

  // Settings
  $appLocation.addEventListener('change', () => {
    appLocation = $appLocation.value;
    browser.storage.local.set({ appLocation });
    syncContentState();
  });
  $('settings-page-access').addEventListener('click', e => {
    const access = e.target.closest('[data-access]')?.dataset.access;
    if (!access) return;
    setPageAccess(access === 'on');
  });
  $('settings-theme').addEventListener('click', e => {
    const mode = e.target.closest('[data-mode]')?.dataset.mode;
    if (!mode) return;
    OmniTheme.set(mode);
    renderThemeControl();
  });
  $defaultPageSelect.addEventListener('change', e => { defaultAppId = e.target.value || null; save(); });
  $('settings-close').addEventListener('click', () => closeSheet());
  $('settings-export').addEventListener('click', exportApps);
  $('settings-import').addEventListener('click', () => $settingsFile.click());
  $settingsFile.addEventListener('change', e => {
    if (e.target.files[0]) importApps(e.target.files[0]);
    e.target.value = '';
  });
  $('settings-reset').addEventListener('click', resetToDefaults);

  $('settings-privacy').addEventListener('click', e => {
    e.preventDefault();
    openInTab(browser.runtime.getURL('privacy.html'));
  });

  $('settings-shortcut-open').addEventListener('click', e => {
    e.preventDefault();
    browser.commands.openShortcutSettings();
  });

  // Escape closes the topmost layer first
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || $defaultPageSelect.matches(':is(:open)')) return;
    if (confirmResolve) return confirmResolve(false);
    if (openSheetId) return closeSheet();
    if (!$ctxMenu.classList.contains('hidden')) return hideCtxMenu();
    if (editMode) return toggleEditMode();
    });
}

function isActiveApp() {
  return false;
}

async function allowDockOn(url, interactive) {
  const match = `${url.protocol}//${url.hostname}/*`;
  const builtin = browser.runtime.getManifest().content_scripts.some(script => script.matches.includes(match));
  const permission = { origins: [match] };
  const granted = interactive
    ? await browser.permissions.request(permission)
    : await browser.permissions.contains(permission);
  if (!granted || builtin) return granted;

  const id = `omnibar-site-${encodeURIComponent(match)}`;
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [id] });
  if (!existing.length) {
    await browser.scripting.registerContentScripts([
      { id, matches: [match], js: ['app-sidebar.js'], runAt: 'document_start' },
    ]);
  }
  return true;
}

async function launchApp(app, startup = false, interactive = true) {
  const url = webUrl(app.url);
  if (!url) {
    showToast('Enter a valid HTTP or HTTPS address.', 'error');
    return;
  }
  try {
    const entry = new URL(url);
    if (appLocation === 'sidebar' || entry.hash || !await allowDockOn(entry, interactive)) {
      await openAppDirectly(app, startup);
      return;
    }
    await browser.runtime.sendMessage({
      type: 'open-native-dock', windowId, startup, app: { ...app, url }, apps, theme: OmniTheme.get(),
    });
  } catch (_) {
    await openAppDirectly(app, startup);
  }
}

// Boot
init();
