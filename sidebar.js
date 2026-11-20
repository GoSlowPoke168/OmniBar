/* ─────────────────────────────────────────────
   OmniBar
───────────────────────────────────────────── */

const DEFAULT_APPS = [
  { id: uid(), name: 'Claude', url: 'https://claude.ai/new' },
  { id: uid(), name: 'Gemini', url: 'https://gemini.google.com' },
  { id: uid(), name: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: uid(), name: 'Grok', url: 'https://grok.com' },
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
let dragTargetIdx = null;
let ctxApp = null;
let loadTimer = null;
let spinnerTimer = null;
let windowId = null;
let pageAccess; // true / false once the user answers the page-access notice; undefined until then

// DOM refs
const $ = id => document.getElementById(id);
const $content = $('content-panel');
const $frameWrap = $('frame-wrap');
let $frame = $('app-frame');
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
  chrome.windows.getCurrent().then(win => {
    windowId = win?.id;
    if (windowId) {
      chrome.runtime.sendMessage({ type: 'panel-opened', windowId }).catch(() => { });
      if (panelOpen) refreshPageContext();
    }
  }).catch(() => { });

  const stored = await chrome.storage.local.get(['apps', 'defaultAppId', 'icons', 'pageAccess']);
  apps = Array.isArray(stored.apps) ? stored.apps : DEFAULT_APPS;
  defaultAppId = stored.defaultAppId ?? null;
  iconCache = stored.icons ?? {};
  pageAccess = stored.pageAccess;
  syncDefaultAppId();
  renderStrip();
  bindListeners();

  const defaultApp = apps.find(a => a.id === defaultAppId);
  if (defaultApp) openApp(defaultApp, { startup: true });
  refreshIcons();

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
// App icons: fetched from Google's favicon service once, then kept in local storage
let iconCache = {};
const ICON_MAX_AGE = 7 * 864e5;
function iconHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}
function faviconUrl(host) {
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}
function getFavicon(url) {
  const host = iconHost(url);
  return host ? iconCache[host]?.data ?? faviconUrl(host) : '';
}
function blobToDataUrl(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
async function refreshIcons() {
  const hosts = [...new Set(apps.map(a => iconHost(a.url)).filter(Boolean))];
  let changed = false;
  await Promise.all(hosts.map(async host => {
    if (Date.now() - (iconCache[host]?.at ?? 0) < ICON_MAX_AGE) return;
    try {
      const res = await fetch(faviconUrl(host));
      if (!res.ok) return;
      const data = await blobToDataUrl(await res.blob());
      iconCache[host] = { data, at: Date.now() };
      changed = true;
      $icons.querySelectorAll(`.app-icon[data-host="${CSS.escape(host)}"]`).forEach(el => {
        el.firstElementChild.src = data;
      });
    } catch (_) { /* offline: keep the old icon */ }
  }));
  for (const host of Object.keys(iconCache)) {
    if (!hosts.includes(host)) { delete iconCache[host]; changed = true; }
  }
  if (changed) chrome.storage.local.set({ icons: iconCache });
}
function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}
function activeApp() {
  return apps.find(a => a.id === activeId);
}
// The active tab of this sidebar's own window (not the last-focused window)
function getActiveTab(cb) {
  const query = windowId ? { active: true, windowId } : { active: true, currentWindow: true };
  chrome.tabs.query(query, tabs => { void chrome.runtime.lastError; cb(tabs?.[0]); });
}
function save() {
  chrome.storage.local.set({ apps, defaultAppId });
  refreshIcons();
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
  // Measure from the origin so the old position can't squeeze the width
  $tip.style.left = '0px';
  $tip.style.top = '0px';
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
  const focusedId = document.activeElement?.closest?.('.app-icon')?.dataset.id;
  cleanDrag();
  $icons.innerHTML = '';
  $icons.classList.toggle('edit-mode', editMode);
  $('btn-edit').classList.toggle('is-active', editMode);

  apps.forEach((app, i) => {
    const el = document.createElement('div');
    el.className = 'app-icon' + (panelOpen && app.id === activeId ? ' active' : '');
    el.dataset.id = app.id;
    el.dataset.host = iconHost(app.url);
    el.dataset.idx = i;
    el.dataset.tip = `${app.name} — right-click for more`;
    el.draggable = true;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', app.name);

    const img = document.createElement('img');
    if (!iconCache[el.dataset.host]?.data) img.loading = 'lazy';
    img.src = getFavicon(app.url);
    img.alt = '';

    const fb = document.createElement('span');
    fb.className = 'fallback';
    fb.textContent = (app.name.trim()[0] ?? '?').toUpperCase();

    img.addEventListener('load', () => img.classList.add('loaded'));
    img.addEventListener('error', () => img.classList.remove('loaded'));

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
    el.addEventListener('dragend', cleanDrag);

    $icons.appendChild(el);
  });
  if (focusedId) $icons.querySelector(`[data-id="${focusedId}"]`)?.focus();
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
  $frame.classList.remove('loading');
}

function openApp(app, { startup = false } = {}) {
  const immediateSpinner = panelOpen || startup;
  activeId = app.id;
  panelOpen = true;

  $content.classList.remove('hidden');

  document.title = app.name;
  $panelName.textContent = app.name;
  $panelUrlText.textContent = hostOf(app.url);
  $panelHeader.classList.remove('hidden');
  applyViewMode();
  refreshPageContext();

  clearTimeout(loadTimer);
  $frame.style.display = 'block';
  $blocked.classList.add('hidden');
  $signin.classList.add('hidden');
  hideSpinner();
  $frame.classList.add('loading');
  if (immediateSpinner) $spinner.classList.remove('hidden');
  else spinnerTimer = setTimeout(() => $spinner.classList.remove('hidden'), 150);

  const previousFrame = $frame;
  const loadAppFrame = () => {
    if (!panelOpen || $frame !== previousFrame) return;

    // A new frame reloads even the same URL without navigating through about:blank.
    previousFrame.onload = null;
    $frame = previousFrame.cloneNode(false);
    $frame.onload = () => {
      $frame.onload = null;
      hideSpinner();
      clearTimeout(loadTimer);
    };
    $frame.src = app.url;
    previousFrame.replaceWith($frame);

    // Blocked-site detection: if still loading after 8s, check if it actually loaded.
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
  };

  if (startup) {
    // Chrome waits for the sidebar's first load before revealing its extension content.
    const afterShellLoad = () => setTimeout(loadAppFrame, 0);
    if (document.readyState === 'complete') afterShellLoad();
    else window.addEventListener('load', afterShellLoad, { once: true });
  } else {
    loadAppFrame();
  }

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

// Action bar: shows which page Summarize / Ask will use, once the user allows reading the tab
function setPageAccess(allowed) {
  pageAccess = allowed;
  chrome.storage.local.set({ pageAccess: allowed });
  refreshPageContext();
}
function refreshPageContext() {
  $('action-bar').dataset.access = pageAccess === true ? 'on' : pageAccess === false ? 'off' : 'ask';
  if (panelOpen) applyViewMode();
  if (pageAccess !== true) return;
  getActiveTab(res => {
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
  if (!app || pageAccess !== true) return;
  getActiveTab(res => {
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
  confirmResolve?.(false);
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
function renderPageAccessControl() {
  $('settings-page-access').querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-checked', String((b.dataset.access === 'on') === (pageAccess === true)));
  });
}
function openSettings() {
  renderDefaultPageSelect();
  renderThemeControl();
  renderPageAccessControl();
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
  dragSrcIdx = dragTargetIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  const icon = e.currentTarget;
  setTimeout(() => {
    if (dragSrcIdx === idx && icon.isConnected) icon.classList.add('dragging');
  }, 0);
}
function onDragOver(e) {
  if (dragSrcIdx === null) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const [first, second] = $icons.children;
  if (!second) return;
  const step = second.offsetTop - first.offsetTop;
  const y = e.clientY - $icons.getBoundingClientRect().top + $icons.scrollTop;
  const slot = Math.round((y - first.offsetTop - first.offsetHeight / 2) / step);
  const target = Math.max(0, Math.min(slot, apps.length - 1));
  if (target === dragTargetIdx) return;
  dragTargetIdx = target;

  // Leave the native drag source mounted and measure against the unshifted slots.
  [...$icons.children].forEach((icon, i) => {
    let shift = 0;
    if (i === dragSrcIdx) shift = target - dragSrcIdx;
    else if (dragSrcIdx < i && i <= target) shift = -1;
    else if (target <= i && i < dragSrcIdx) shift = 1;
    icon.style.setProperty('--drag-offset', `${shift * step}px`);
  });
}
function onDrop(e) {
  if (dragSrcIdx === null) return;
  e.preventDefault();
  const from = dragSrcIdx;
  const to = dragTargetIdx;
  cleanDrag();
  if (from === to) return;
  const [moved] = apps.splice(from, 1);
  apps.splice(to, 0, moved);
  save(); renderStrip();
}
function cleanDrag() {
  if (dragSrcIdx === null) return;
  dragSrcIdx = dragTargetIdx = null;
  for (const icon of $icons.children) {
    icon.classList.remove('dragging');
    icon.style.removeProperty('--drag-offset');
  }
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
    getActiveTab(res => {
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
  chrome.tabs.onActivated.addListener(info => {
    if (panelOpen && info.windowId === windowId) refreshPageContext();
  });
  chrome.tabs.onUpdated.addListener((id, info, tab) => {
    if (panelOpen && tab?.active && tab.windowId === windowId && (info.title || info.status === 'complete')) refreshPageContext();
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

  // Page access notice
  $('page-allow').addEventListener('click', () => setPageAccess(true));
  $('page-notnow').addEventListener('click', () => setPageAccess(false));
  $('page-turnon').addEventListener('click', e => { e.preventDefault(); setPageAccess(true); });

  // Settings
  $('settings-page-access').addEventListener('click', e => {
    const access = e.target.closest('[data-access]')?.dataset.access;
    if (!access) return;
    setPageAccess(access === 'on');
    renderPageAccessControl();
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
    openInTab('https://github.com/GoSlowPoke168/OmniBar/blob/main/PRIVACY.md');
  });

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
    if (e.key !== 'Escape' || $defaultPageSelect.matches(':is(:open)')) return;
    if (confirmResolve) return confirmResolve(false);
    if (openSheetId) return closeSheet();
    if (!$ctxMenu.classList.contains('hidden')) return hideCtxMenu();
    if (editMode) return toggleEditMode();
    if (panelOpen) closePanel();
  });
}

// Boot
init();
