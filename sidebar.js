/* ─────────────────────────────────────────────
   OmniBar
───────────────────────────────────────────── */

const DEFAULT_APPS = [
  { id: uid(), name: 'Claude', url: 'https://claude.ai/new' },
  { id: uid(), name: 'Gemini', url: 'https://gemini.google.com' },
  { id: uid(), name: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: uid(), name: 'Grok', url: 'https://grok.com' },
  { id: uid(), name: 'Deepseek', url: 'https://chat.deepseek.com/' },
  { id: uid(), name: 'Google Image Search', url: 'https://images.google.com/' }
];

// States
let apps = [];
let defaultAppId = null;
let activeId = null;
let panelOpen = false;
let editMode = false;
let editingId = null;
let dragSrcIdx = null;
let ctxApp = null;
let loadTimer = null;
let spinnerTimer = null;

// DOM refs
const $ = id => document.getElementById(id);
const $content = $('content-panel');
const $frameWrap = $('frame-wrap');
const $frame = $('app-frame');
const $spinner = $('load-spinner');
const $blocked = $('blocked-msg');
const $signin = $('signin-msg');
const $icons = $('app-icons');
const $idle = $('idle-panel');
const $empty = $('empty-state');
const $editHint = $('edit-hint');
const $ctxMenu = $('ctx-menu');
const $sheetLayer = $('sheet-layer');
const $mTitle = $('modal-title');
const $mName = $('modal-name');
const $mUrl = $('modal-url');
const $mSave = $('modal-save');
const $confirmOverlay = $('confirm-overlay');
const $settingsFile = $('settings-import-file');
const $defaultPageSelect = $('settings-default-page');
const $actionTitle = $('action-page-title');
const $actionBtns = $('action-btns');
const $tip = $('tooltip');
// Header
const $panelHeader = $('panel-header');
const $panelName = $('panel-app-name');
const $panelUrlText = $('panel-url-text');

// Init
async function init() {
  let windowId = null;
  try {
    const win = await chrome.windows.getCurrent();
    windowId = win?.id;
  } catch (_) { }

  if (windowId) {
    chrome.runtime.sendMessage({ type: 'panel-opened', windowId }).catch(() => { });
  }

  const stored = await chrome.storage.local.get(['apps', 'defaultAppId']);
  apps = Array.isArray(stored.apps) ? stored.apps : DEFAULT_APPS;
  defaultAppId = stored.defaultAppId ?? null;
  syncDefaultAppId();
  renderStrip();
  bindListeners();

  const defaultApp = apps.find(a => a.id === defaultAppId);
  if (defaultApp) openApp(defaultApp);

  // When the user closes the panel via the browser's own X button,
  // notify background.js so the hotkey toggle state stays accurate.
  window.addEventListener('pagehide', () => {
    if (windowId) {
      chrome.runtime.sendMessage({ type: 'panel-closed', windowId }).catch(() => { });
    }
  });
}

// Utilities
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function getFavicon(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`;
  } catch { return ''; }
}
function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}
function activeApp() {
  return apps.find(a => a.id === activeId);
}
function save() {
  chrome.storage.local.set({ apps, defaultAppId });
}
function syncDefaultAppId() {
  if (!apps.some(a => a.id === defaultAppId)) defaultAppId = null;
}

// Tooltips
let tipTimer = null;
let tipEl = null;
function setTip(el, text) {
  el.dataset.tip = text;
  if (tipEl === el && $tip.classList.contains('show')) $tip.textContent = text;
}
function showTip(el) {
  $tip.textContent = el.dataset.tip;
  const r = el.getBoundingClientRect();
  const w = $tip.offsetWidth, h = $tip.offsetHeight, m = 6;
  let x, y;
  if (el.closest('#icon-strip')) {
    x = r.left - w - 8;
    y = r.top + r.height / 2 - h / 2;
  } else {
    x = r.left + r.width / 2 - w / 2;
    y = r.bottom + m;
    if (y + h > innerHeight - m) y = r.top - h - m;
  }
  $tip.style.left = `${Math.max(m, Math.min(x, innerWidth - w - m))}px`;
  $tip.style.top = `${Math.max(m, Math.min(y, innerHeight - h - m))}px`;
  $tip.classList.add('show');
}
function hideTip() {
  clearTimeout(tipTimer);
  tipEl = null;
  $tip.classList.remove('show');
}

// Content area: app, empty hint or edit-mode hint
function showContentState(state) {
  $idle.classList.toggle('hidden', state === 'app');
  $editHint.classList.toggle('hidden', state !== 'edit');
  $empty.classList.toggle('hidden', state !== 'empty');
  $empty.textContent = apps.length ? 'Choose an app on the right to open it here.' : 'Add an app with + to get started.';
}
function syncContentState() {
  showContentState(panelOpen ? 'app' : editMode ? 'edit' : 'empty');
}

// Render app icons
function renderStrip() {
  $icons.innerHTML = '';
  $icons.classList.toggle('edit-mode', editMode);
  $('btn-edit').classList.toggle('is-active', editMode);

  apps.forEach((app, i) => {
    const el = document.createElement('div');
    el.className = 'app-icon' + (panelOpen && app.id === activeId ? ' active' : '');
    el.dataset.id = app.id;
    el.dataset.idx = i;
    el.dataset.tip = `${app.name} — right-click for more`;
    el.draggable = true;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', app.name);

    const img = document.createElement('img');
    img.src = getFavicon(app.url);
    img.alt = '';

    const fb = document.createElement('span');
    fb.className = 'fallback';
    fb.textContent = (app.name.trim()[0] ?? '?').toUpperCase();

    img.addEventListener('error', () => {
      img.style.display = 'none';
      fb.style.display = 'flex';
    });

    el.appendChild(img);
    el.appendChild(fb);

    if (editMode) {
      const badge = document.createElement('button');
      badge.className = 'remove-badge';
      badge.setAttribute('aria-label', `Remove ${app.name}`);
      badge.innerHTML = '<svg class="icon"><use href="#i-x"/></svg>';
      badge.addEventListener('click', e => { e.stopPropagation(); removeApp(app.id); });
      el.appendChild(badge);
    }

    const activate = () => {
      if (editMode) return;
      closeSheet();
      toggleApp(app);
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showCtxMenu(e, app); });
    el.addEventListener('dragstart', e => onDragStart(e, i));
    el.addEventListener('dragover', e => onDragOver(e, el));
    el.addEventListener('drop', e => onDrop(e, i));
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('dragend', () => cleanDrag());

    $icons.appendChild(el);
  });
  syncContentState();
}

// Open / toggle app
function toggleApp(app) {
  if (panelOpen && activeId === app.id) { closePanel(); return; }
  openApp(app);
}

function hideSpinner() {
  clearTimeout(spinnerTimer);
  $spinner.classList.add('hidden');
}

function openApp(app) {
  activeId = app.id;
  panelOpen = true;

  $content.classList.remove('hidden');

  document.title = app.name;
  $panelName.textContent = app.name;
  $panelUrlText.textContent = hostOf(app.url);
  $panelHeader.classList.remove('hidden');
  applyViewMode();
  refreshPageContext();

  // Reset state; the spinner only appears if loading takes longer than 150 ms
  clearTimeout(loadTimer);
  $frame.style.display = 'block';
  $blocked.classList.add('hidden');
  $signin.classList.add('hidden');
  hideSpinner();
  spinnerTimer = setTimeout(() => $spinner.classList.remove('hidden'), 150);

  // Skip the onload that fires for src='' (about:blank), only handle the real URL load
  let realLoad = false;
  $frame.onload = () => {
    if (!realLoad) return;
    hideSpinner();
    clearTimeout(loadTimer);
  };

  $frame.src = '';
  requestAnimationFrame(() => {
    realLoad = true;
    $frame.src = app.url;

    // Blocked-site detection: if still loading after 8s, check if it actually loaded
    loadTimer = setTimeout(() => {
      hideSpinner();
      try {
        const doc = $frame.contentDocument;
        if (!doc || doc.location.href === 'about:blank') {
          $frame.style.display = 'none';
          $blocked.classList.remove('hidden');
        }
      } catch (_) {
        // SecurityError = cross-origin page loaded successfully — this is normal
      }
    }, 8000);
  });

  renderStrip();
}

// Desktop view: give the frame a desktop-sized viewport and scale it to fit the sidebar.
const DESKTOP_WIDTH = 1024;
function applyViewMode() {
  const app = activeApp();
  const $btn = $('hdr-desktop');
  $btn.classList.toggle('active', !!app?.desktop);
  setTip($btn, app?.desktop ? 'Desktop view (click for mobile)' : 'Mobile view (click for desktop)');
  const w = $frameWrap.clientWidth;
  const h = $frameWrap.clientHeight;
  const scale = app?.desktop ? Math.min(1, w / DESKTOP_WIDTH) : 1;
  const on = scale < 1;
  $frame.classList.toggle('desktop', on);
  $frame.style.width = on ? `${w / scale}px` : '';
  $frame.style.height = on ? `${h / scale}px` : '';
  $frame.style.transform = on ? `scale(${scale})` : '';
}

function closePanel() {
  panelOpen = false;
  activeId = null;

  clearTimeout(loadTimer);
  $frame.onload = null;
  hideSpinner();
  $blocked.classList.add('hidden');
  $signin.classList.add('hidden');
  $frame.style.display = 'block';
  $panelHeader.classList.add('hidden');

  // Hide content but keep as flex spacer (so strip stays right)
  $content.classList.add('hidden');
  document.title = 'OmniBar';

  $frame.src = '';
  renderStrip();
}

// Action bar: shows which page Summarize / Ask will use
function refreshPageContext() {
  chrome.runtime.sendMessage({ type: 'get-active-tab-url' }, res => {
    void chrome.runtime.lastError;
    const url = res?.url ?? '';
    const isWeb = /^https?:\/\//.test(url);
    $actionTitle.textContent = isWeb ? (res.title || hostOf(url)) : 'none';
    $actionBtns.querySelectorAll('.btn').forEach(b => { b.disabled = !isWeb; });
    if (isWeb) delete $actionBtns.dataset.tip;
    else $actionBtns.dataset.tip = 'Open a regular web page first';
  });
}

// Open helpers
function openInTab(url) {
  chrome.tabs.create({ url });
}
function openInWindow(url, onCreated) {
  chrome.windows.getCurrent({}, win => {
    const w = 430, h = win.height || 900;
    const x = (win.left || 0) + (win.width || 1440) - w - 8;
    chrome.windows.create({ url, type: 'popup', width: w, height: h, left: x, top: win.top || 0 }, onCreated);
  });
}

// Sign in via a popup window; reload the app in the sidebar when that window closes.
// Claude's window closes itself once its chat page is reached.
let signInWinId = null;
function signInViaWindow(app) {
  if (signInWinId !== null) return;
  signInWinId = -1;
  const isClaude = new URL(app.url).hostname === 'claude.ai';
  openInWindow(isClaude ? 'https://claude.ai/login' : app.url, win => {
    if (!win) { signInWinId = null; return; }
    signInWinId = win.id;
    const tabId = win.tabs[0].id;
    const onUpdated = (id, info) => {
      if (!isClaude || id !== tabId || !info.url) return;
      const { hostname, pathname } = new URL(info.url);
      if (hostname === 'claude.ai' && (pathname === '/new' || pathname.startsWith('/chat'))) {
        chrome.windows.remove(win.id);
      }
    };
    const onRemoved = id => {
      if (id !== win.id) return;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.windows.onRemoved.removeListener(onRemoved);
      signInWinId = null;
      if (panelOpen && activeId === app.id) openApp(app);
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.windows.onRemoved.addListener(onRemoved);
  });
}

// Page prompts (typed into the app's chat box by frame-bridge.js)
let insertTimer = null;
function sendPageToApp(buildPrompt, send) {
  const app = activeApp();
  if (!app) return;
  chrome.runtime.sendMessage({ type: 'get-active-tab-url' }, res => {
    const url = res?.url ?? '';
    if (!/^https?:\/\//.test(url)) {
      showToast('Open a regular web page first.', 'error');
      return;
    }
    clearTimeout(insertTimer);
    insertTimer = setTimeout(() => showToast("Couldn't reach this app. Try Refresh.", 'error'), 8000);
    $frame.contentWindow.postMessage({ type: 'omnibar-insert', text: buildPrompt(url), send }, new URL(app.url).origin);
  });
}

// Context menu
function showCtxMenu(e, app) {
  hideTip();
  ctxApp = app;
  $ctxMenu.classList.remove('hidden');
  const w = $ctxMenu.offsetWidth, h = $ctxMenu.offsetHeight, m = 6;
  $ctxMenu.style.left = `${Math.max(m, Math.min(e.clientX, innerWidth - w - m))}px`;
  $ctxMenu.style.top = `${Math.max(m, Math.min(e.clientY, innerHeight - h - m))}px`;
}
function hideCtxMenu() { $ctxMenu.classList.add('hidden'); ctxApp = null; }

// Sheets: Settings and add/edit cover the content area; the strip stays usable
let openSheetId = null;
let sheetOpener = null;
const sheetEl = id => $(id === 'settings' ? 'settings-sheet' : 'modal-sheet');
function openSheet(id, opener = null) {
  hideCtxMenu();
  hideTip();
  if (openSheetId) closeSheet(true);
  openSheetId = id;
  sheetOpener = opener;
  $sheetLayer.classList.remove('hidden', 'closing');
  sheetEl(id).classList.add('open');
  opener?.classList.add('is-active');
}
function closeSheet(immediate = false) {
  if (!openSheetId) return;
  const id = openSheetId;
  sheetOpener?.classList.remove('is-active');
  openSheetId = null;
  sheetOpener = null;
  editingId = null;
  const finish = () => {
    if (openSheetId !== id) sheetEl(id).classList.remove('open');
    if (!openSheetId) $sheetLayer.classList.add('hidden');
    $sheetLayer.classList.remove('closing');
  };
  if (immediate) return finish();
  $sheetLayer.classList.add('closing');
  setTimeout(finish, 120);
}

// Confirmation dialog (replaces the browser's confirm())
let confirmResolve = null;
function confirmDialog({ title, body, confirmLabel, danger = true }) {
  $('confirm-title').textContent = title;
  $('confirm-body').textContent = body;
  const $ok = $('confirm-ok');
  $ok.textContent = confirmLabel;
  $ok.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  const layerWasHidden = $sheetLayer.classList.contains('hidden');
  $sheetLayer.classList.remove('hidden', 'closing');
  $confirmOverlay.classList.remove('hidden');
  setTimeout(() => $('confirm-cancel').focus(), 0);
  return new Promise(resolve => {
    confirmResolve = ok => {
      confirmResolve = null;
      $confirmOverlay.classList.add('hidden');
      if (layerWasHidden && !openSheetId) $sheetLayer.classList.add('hidden');
      resolve(ok);
    };
  });
}

// Add / edit dialog
function validateModal() {
  $mSave.disabled = !($mName.value.trim() && $mUrl.value.trim());
}
function openModal(app = null) {
  openSheet('modal', app ? null : $('btn-add'));
  editingId = app?.id ?? null;
  $mTitle.textContent = app ? 'Edit app' : 'Add app';
  $mSave.textContent = app ? 'Save' : 'Add app';
  $mName.value = app?.name ?? '';
  $mUrl.value = app?.url ?? '';
  validateModal();
  setTimeout(() => $mName.focus(), 50);
}
function saveModal() {
  const name = $mName.value.trim();
  let url = $mUrl.value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (editingId) {
    const a = apps.find(a => a.id === editingId);
    if (a) {
      const urlChanged = a.url !== url;
      a.name = name;
      a.url = url;
      if (activeId === a.id) {
        document.title = a.name;
        $panelName.textContent = a.name;
        $panelUrlText.textContent = hostOf(a.url);
        if (urlChanged) openApp(a);
      }
    }
  } else {
    apps.push({ id: uid(), name, url });
  }
  save(); closeSheet(); renderStrip();
}

// Remove
function removeApp(id) {
  if (activeId === id) closePanel();
  apps = apps.filter(a => a.id !== id);
  syncDefaultAppId();
  save(); renderStrip();
}

// Edit mode
function toggleEditMode() {
  editMode = !editMode;
  if (editMode && panelOpen) closePanel();
  renderStrip();
}

// Settings
function renderDefaultPageSelect() {
  $defaultPageSelect.innerHTML = '';
  $defaultPageSelect.appendChild(new Option('None', ''));
  apps.forEach(a => $defaultPageSelect.appendChild(new Option(a.name, a.id)));
  $defaultPageSelect.value = defaultAppId ?? '';
}
function renderThemeControl() {
  const mode = OmniTheme.get();
  $('settings-theme').querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-checked', String(b.dataset.mode === mode));
  });
}
function renderShortcut() {
  const $keys = $('shortcut-keys');
  chrome.commands.getAll(cmds => {
    const shortcut = cmds?.find(c => c.name === 'toggle-sidebar')?.shortcut;
    $keys.innerHTML = '';
    if (!shortcut) { $keys.textContent = 'Not set'; return; }
    shortcut.split('+').forEach(k => {
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      $keys.appendChild(kbd);
    });
  });
}
function openSettings() {
  renderDefaultPageSelect();
  renderThemeControl();
  renderShortcut();
  $('settings-version').textContent = `OmniBar ${chrome.runtime.getManifest().version}`;
  openSheet('settings', $('btn-settings'));
}

function exportApps() {
  const json = JSON.stringify(apps, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'omnibar-apps.json'
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

let toastTimeoutId = null;
function showToast(message, type = 'info') {
  const toast = $('toast');
  $('toast-text').textContent = message;
  const icon = toast.querySelector('.toast-icon');
  icon.style.display = type === 'info' ? 'none' : '';
  icon.querySelector('use').setAttribute('href', type === 'error' ? '#i-xcircle' : '#i-check');
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');

  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => toast.classList.remove('show'), 2500);
}

function importApps(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported) || !imported.every(a => a.name && a.url))
        throw new Error('Invalid format');
      apps = imported.map(a => ({ id: a.id || uid(), name: String(a.name), url: String(a.url), desktop: a.desktop === true }));
      syncDefaultAppId();
      save();
      if (panelOpen) closePanel();
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
  if (panelOpen) closePanel();
  renderStrip();
  closeSheet();
  showToast('Apps reset to defaults', 'success');
}

// Drag & drop
function onDragStart(e, idx) {
  hideTip();
  dragSrcIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => $icons.children[idx]?.classList.add('dragging'), 0);
}
function onDragOver(e, el) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.app-icon.drag-over').forEach(x => x.classList.remove('drag-over'));
  el.classList.add('drag-over');
}
function onDrop(e, toIdx) {
  e.preventDefault();
  if (dragSrcIdx === null || dragSrcIdx === toIdx) return;
  const [moved] = apps.splice(dragSrcIdx, 1);
  apps.splice(toIdx, 0, moved);
  save(); renderStrip();
}
function cleanDrag() {
  dragSrcIdx = null;
  document.querySelectorAll('.app-icon.dragging, .app-icon.drag-over')
    .forEach(el => el.classList.remove('dragging', 'drag-over'));
}

// All listeners
function bindListeners() {
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

  // Blocked-site fallbacks
  $('blocked-newtab').addEventListener('click', () => { const a = activeApp(); if (a) openInTab(a.url); });
  $('blocked-window').addEventListener('click', () => { const a = activeApp(); if (a) openInWindow(a.url); });

  window.addEventListener('message', e => {
    if (e.source !== $frame.contentWindow) return;
    if (e.data?.type === 'omnibar-signin-needed') {
      const a = activeApp(); if (!a) return;
      document.querySelectorAll('.signin-app').forEach(el => { el.textContent = a.name; });
      hideSpinner();
      $signin.classList.remove('hidden');
    }
    if (e.data?.type === 'omnibar-insert-result') {
      clearTimeout(insertTimer);
      if (!e.data.ok) showToast("Couldn't find the chat box in this app.", 'error');
    }
  });
  $('signin-open').addEventListener('click', () => { const a = activeApp(); if (a) signInViaWindow(a); });
  $('signin-newtab').addEventListener('click', e => {
    e.preventDefault();
    const a = activeApp(); if (a) openInTab(a.url);
  });
  $('signin-refresh').addEventListener('click', () => { const a = activeApp(); if (a) openApp(a); });

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

  // Header buttons
  $('hdr-close').addEventListener('click', closePanel);
  $('hdr-newtab').addEventListener('click', () => { const a = activeApp(); if (a) openInTab(a.url); });
  $('hdr-window').addEventListener('click', () => { const a = activeApp(); if (a) openInWindow(a.url); });

  const flashBtn = (btn, success = true) => {
    btn.classList.add(success ? 'success' : 'danger');
    setTimeout(() => btn.classList.remove(success ? 'success' : 'danger'), 1000);
  };
  $('hdr-copyurl').addEventListener('click', () => {
    const btn = $('hdr-copyurl');
    chrome.runtime.sendMessage({ type: 'get-active-tab-url' }, (res) => {
      if (res && res.url) {
        const text = `Here is the link to the page I am on:\n${res.url}`;
        navigator.clipboard.writeText(text)
          .then(() => flashBtn(btn, true))
          .catch(() => flashBtn(btn, false));
      } else {
        flashBtn(btn, false);
      }
    });
  });

  $('hdr-desktop').addEventListener('click', () => {
    const a = activeApp(); if (!a) return;
    a.desktop = !a.desktop;
    save(); applyViewMode();
  });
  window.addEventListener('resize', applyViewMode);

  $('hdr-refresh').addEventListener('click', () => { const a = activeApp(); if (a) openApp(a); });

  // URL chip — click to copy the app's full address
  const $urlChip = $('panel-app-url');
  $urlChip.addEventListener('click', async () => {
    const a = activeApp();
    if (!a) return;
    try {
      await navigator.clipboard.writeText(a.url);
      $panelUrlText.textContent = 'Copied';
      $urlChip.classList.add('copied');
      setTimeout(() => {
        const cur = activeApp();
        if (cur) $panelUrlText.textContent = hostOf(cur.url);
        $urlChip.classList.remove('copied');
      }, 1500);
    } catch (_) { /* clipboard access denied */ }
  });

  // Action bar
  $('act-summarize').addEventListener('click', () => {
    sendPageToApp(url => `Please summarize the webpage at <pageUrl>${url}</pageUrl> using precise and concise language. Use headers and bulleted lists in the summary, to make it scannable. Maintain the meaning and factual accuracy.`, true);
  });
  $('act-ask').addEventListener('click', () => {
    sendPageToApp(url => `Use the webpage at <pageUrl>${url}</pageUrl> as context for my question: `, false);
  });
  chrome.tabs.onActivated.addListener(() => { if (panelOpen) refreshPageContext(); });
  chrome.tabs.onUpdated.addListener((id, info) => {
    if (panelOpen && (info.title || info.status === 'complete')) refreshPageContext();
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
    if (action === 'signin') signInViaWindow(ctxApp);
    if (action === 'edit') openModal(ctxApp);
    if (action === 'remove') removeApp(ctxApp.id);
    hideCtxMenu();
  });
  document.addEventListener('click', e => { if (!$ctxMenu.contains(e.target)) hideCtxMenu(); });
  document.addEventListener('contextmenu', hideCtxMenu);
  document.addEventListener('scroll', hideCtxMenu, true);

  // Settings
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

  $('settings-shortcut-open').addEventListener('click', e => {
    e.preventDefault();
    let targetUrl = 'chrome://extensions/shortcuts';
    if (navigator.userAgent.includes('Edg/')) {
      targetUrl = 'edge://extensions/shortcuts';
    } else if (navigator.userAgent.includes('OPR/')) {
      targetUrl = 'opera://extensions/shortcuts';
    } else if (navigator.brave) {
      targetUrl = 'brave://extensions/shortcuts';
    }
    chrome.tabs.create({ url: targetUrl });
  });

  // Escape closes the topmost layer first
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (confirmResolve) return confirmResolve(false);
    if (openSheetId) return closeSheet();
    if (!$ctxMenu.classList.contains('hidden')) return hideCtxMenu();
    if (editMode) return toggleEditMode();
    if (panelOpen) closePanel();
  });
}

// Boot
init();
