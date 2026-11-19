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

// DOM refs
const $content = document.getElementById('content-panel');
const $frame = document.getElementById('app-frame');
const $spinner = document.getElementById('load-spinner');
const $blocked = document.getElementById('blocked-msg');
const $signin = document.getElementById('signin-msg');
const $icons = document.getElementById('app-icons');
const $overlay = document.getElementById('modal-overlay');
const $mTitle = document.getElementById('modal-title');
const $mName = document.getElementById('modal-name');
const $mUrl = document.getElementById('modal-url');
const $ctxMenu = document.getElementById('ctx-menu');
const $settingsOverlay = document.getElementById('settings-overlay');
const $settingsFile = document.getElementById('settings-import-file');
const $defaultPageSelect = document.getElementById('settings-default-page');
// Header
const $panelHeader = document.getElementById('panel-header');
const $panelName = document.getElementById('panel-app-name');
const $panelUrlText = document.getElementById('panel-url-text');

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
function save() {
  chrome.storage.local.set({ apps, defaultAppId });
}
function syncDefaultAppId() {
  if (!apps.some(a => a.id === defaultAppId)) defaultAppId = null;
}

// Render app icons
function renderStrip() {
  $icons.innerHTML = '';
  if (editMode) $icons.classList.add('edit-mode');
  else $icons.classList.remove('edit-mode');

  document.getElementById('btn-edit').classList.toggle('active', editMode);

  apps.forEach((app, i) => {
    const el = document.createElement('div');
    el.className = 'app-icon' + (panelOpen && app.id === activeId ? ' active' : '');
    el.dataset.id = app.id;
    el.dataset.idx = i;
    el.dataset.tooltip = app.name;
    el.draggable = true;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    // Favicon
    const img = document.createElement('img');
    img.src = getFavicon(app.url);
    img.alt = app.name;

    // Letter fallback
    const fb = document.createElement('span');
    fb.className = 'fallback';
    fb.textContent = (app.name.trim()[0] ?? '?').toUpperCase();

    img.addEventListener('error', () => {
      img.style.display = 'none';
      fb.style.display = 'flex';
    });

    el.appendChild(img);
    el.appendChild(fb);

    // Remove icon (edit mode)
    if (editMode) {
      const badge = document.createElement('button');
      badge.className = 'remove-badge';
      badge.textContent = '✕';
      badge.title = 'Remove';
      badge.addEventListener('click', e => { e.stopPropagation(); removeApp(app.id); });
      el.appendChild(badge);
    }

    // Click: open or close
    el.addEventListener('click', () => { if (!editMode) toggleApp(app); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && !editMode) toggleApp(app); });
    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showCtxMenu(e, app); });
    el.addEventListener('dragstart', e => onDragStart(e, i));
    el.addEventListener('dragover', e => onDragOver(e, el));
    el.addEventListener('drop', e => onDrop(e, i));
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('dragend', () => cleanDrag());

    $icons.appendChild(el);
  });
}

// Open / toggle app
function toggleApp(app) {
  if (panelOpen && activeId === app.id) { closePanel(); return; }
  openApp(app);
}

function openApp(app) {
  activeId = app.id;
  panelOpen = true;

  // Show content panel
  $content.classList.remove('hidden');

  // Update browser title bar & top header
  document.title = app.name;
  $panelName.textContent = app.name;
  try { $panelUrlText.textContent = new URL(app.url).hostname; } catch { $panelUrlText.textContent = app.url; }
  $panelHeader.classList.remove('hidden');
  applyViewMode();

  // Reset state
  clearTimeout(loadTimer);
  $frame.style.display = 'block';
  $blocked.classList.add('hidden');
  $signin.classList.add('hidden');
  $spinner.classList.remove('hidden');

  // Skip the onload that fires for src='' (about:blank), only handle the real URL load
  let realLoad = false;
  $frame.onload = () => {
    if (!realLoad) return;
    $spinner.classList.add('hidden');
    clearTimeout(loadTimer);
  };

  $frame.src = '';
  requestAnimationFrame(() => {
    realLoad = true;
    $frame.src = app.url;

    // Blocked-site detection: if still loading after 8s, check if it actually loaded
    loadTimer = setTimeout(() => {
      $spinner.classList.add('hidden');
      try {
        const doc = $frame.contentDocument;
        // If we can read location and it's still blank, the navigation likely failed
        if (!doc || doc.location.href === 'about:blank') {
          $frame.style.display = 'none';
          $blocked.classList.remove('hidden');
        }
        // If we get here without an error, it's same-origin and loaded fine
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
  const app = apps.find(a => a.id === activeId);
  const $btn = document.getElementById('hdr-desktop');
  $btn.classList.toggle('active', !!app?.desktop);
  $btn.title = app?.desktop ? 'Desktop view (click for mobile)' : 'Mobile view (click for desktop)';
  const w = $content.clientWidth;
  const h = $content.clientHeight - $panelHeader.offsetHeight;
  const scale = app?.desktop ? Math.min(1, w / DESKTOP_WIDTH) : 1;
  const on = scale < 1;
  $content.classList.toggle('desktop-view', on);
  $frame.classList.toggle('desktop', on);
  $frame.style.width = on ? `${w / scale}px` : '';
  $frame.style.height = on ? `${h / scale}px` : '';
  $frame.style.transform = on ? `scale(${scale})` : '';
}

function closePanel() {
  panelOpen = false;
  activeId = null;

  // Notify background so hotkey toggle state stays accurate
  chrome.runtime.sendMessage({ type: 'panel-closed' }).catch(() => { });

  clearTimeout(loadTimer);
  $frame.onload = null;
  $spinner.classList.add('hidden');
  $blocked.classList.add('hidden');
  $signin.classList.add('hidden');
  $frame.style.display = 'block';
  $panelHeader.classList.add('hidden');

  // Hide content but keep as flex spacer (so strip stays right)
  $content.classList.add('hidden');

  // Reset title
  document.title = 'OmniBar';

  $frame.src = '';
  renderStrip();
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
  const app = apps.find(a => a.id === activeId);
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
  ctxApp = app;
  const menuW = 170, menuH = 140;
  $ctxMenu.style.left = `${Math.min(e.clientX, window.innerWidth - menuW)}px`;
  $ctxMenu.style.top = `${Math.min(e.clientY, window.innerHeight - menuH)}px`;
  $ctxMenu.classList.remove('hidden');
}
function hideCtxMenu() { $ctxMenu.classList.add('hidden'); ctxApp = null; }

// Modal
function openModal(app = null) {
  editingId = app?.id ?? null;
  $mTitle.textContent = app ? 'Edit App' : 'Add Web App';
  $mName.value = app?.name ?? '';
  $mUrl.value = app?.url ?? '';
  $overlay.classList.remove('hidden');
  setTimeout(() => $mName.focus(), 50);
}
function closeModal() { $overlay.classList.add('hidden'); editingId = null; }
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
        try { $panelUrlText.textContent = new URL(a.url).hostname; } catch { $panelUrlText.textContent = a.url; }
        if (urlChanged) {
          openApp(a); // Reload iframe with new URL
        }
      }
    }
  } else {
    apps.push({ id: uid(), name, url });
  }
  save(); closeModal(); renderStrip();
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
function openSettings() {
  renderDefaultPageSelect();
  $settingsOverlay.classList.remove('hidden');
}
function closeSettings() { $settingsOverlay.classList.add('hidden'); }

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
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast'; // Reset classes
  if (type === 'success') {
    toast.style.background = '#2e7d32';
  } else if (type === 'error') {
    toast.style.background = 'var(--danger)';
  } else {
    toast.style.background = 'var(--accent)';
  }
  toast.classList.add('show');

  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
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
      renderStrip(); closeSettings();
      showToast('Apps imported successfully!', 'success');
    } catch (_) {
      showToast('Failed to import: Invalid JSON format.', 'error');
    }
  };
  reader.readAsText(file);
}

function resetToDefaults() {
  if (!confirm('Reset all apps to defaults? This cannot be undone.')) return;
  apps = DEFAULT_APPS.map(a => ({ ...a, id: uid() }));
  defaultAppId = null;
  save();
  if (panelOpen) closePanel();
  renderStrip();
  closeSettings();
  showToast('Reset to defaults successfully!', 'success');
}

// Drag & drop
function onDragStart(e, idx) {
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
  // Blocked-site fallbacks
  document.getElementById('blocked-newtab').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (a) openInTab(a.url);
  });
  document.getElementById('blocked-window').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (a) openInWindow(a.url);
  });

  window.addEventListener('message', e => {
    if (e.source !== $frame.contentWindow) return;
    if (e.data?.type === 'omnibar-signin-needed') {
      const a = apps.find(a => a.id === activeId); if (!a) return;
      document.querySelectorAll('.signin-app').forEach(el => { el.textContent = a.name; });
      $spinner.classList.add('hidden');
      $signin.classList.remove('hidden');
    }
    if (e.data?.type === 'omnibar-insert-result') {
      clearTimeout(insertTimer);
      if (!e.data.ok) showToast("Couldn't find the chat box in this app.", 'error');
    }
  });
  document.getElementById('signin-open').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (a) signInViaWindow(a);
  });
  document.getElementById('signin-newtab').addEventListener('click', e => {
    e.preventDefault();
    const a = apps.find(a => a.id === activeId); if (a) openInTab(a.url);
  });
  document.getElementById('signin-refresh').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (a) openApp(a);
  });

  // Strip footer
  document.getElementById('btn-add').addEventListener('click', () => openModal());
  document.getElementById('btn-edit').addEventListener('click', toggleEditMode);
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  // Header buttons (top prototype)
  document.getElementById('hdr-close').addEventListener('click', closePanel);
  document.getElementById('hdr-newtab').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (a) openInTab(a.url);
  });
  document.getElementById('hdr-window').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (a) openInWindow(a.url);
  });
  // Page context buttons (URL & Selection)
  const flashBtn = (btn, success = true) => {
    btn.classList.add(success ? 'success' : 'danger');
    setTimeout(() => btn.classList.remove(success ? 'success' : 'danger'), 1000);
  };

  document.getElementById('hdr-copyurl').addEventListener('click', () => {
    const btn = document.getElementById('hdr-copyurl');
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

  document.getElementById('hdr-summarize').addEventListener('click', () => {
    sendPageToApp(url => `Please summarize the webpage at <pageUrl>${url}</pageUrl> using precise and concise language. Use headers and bulleted lists in the summary, to make it scannable. Maintain the meaning and factual accuracy.`, true);
  });
  document.getElementById('hdr-ask').addEventListener('click', () => {
    sendPageToApp(url => `Use the webpage at <pageUrl>${url}</pageUrl> as context for my question: `, false);
  });

  document.getElementById('hdr-desktop').addEventListener('click', () => {
    const a = apps.find(a => a.id === activeId); if (!a) return;
    a.desktop = !a.desktop;
    save(); applyViewMode();
  });
  window.addEventListener('resize', applyViewMode);

  document.getElementById('hdr-refresh').addEventListener('click', () => {
    if ($frame.src) {
      const s = $frame.src;
      $spinner.classList.remove('hidden');
      $frame.src = ''; requestAnimationFrame(() => { $frame.src = s; });
    }
  });


  // URL chip — click to copy full URL
  const $urlChip = document.getElementById('panel-app-url');
  $urlChip.addEventListener('click', async () => {
    const a = apps.find(a => a.id === activeId);
    if (!a) return;
    try {
      await navigator.clipboard.writeText(a.url);
      $panelUrlText.textContent = 'Copied!';
      $urlChip.classList.add('copied');
      $urlChip.title = a.url;
      setTimeout(() => {
        const cur = apps.find(a => a.id === activeId);
        if (cur) {
          try { $panelUrlText.textContent = new URL(cur.url).hostname; } catch { $panelUrlText.textContent = cur.url; }
        }
        $urlChip.classList.remove('copied');
        $urlChip.title = 'Click to copy URL';
      }, 1500);
    } catch (_) { /* clipboard access denied */ }
  });

  // Modal
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveModal);
  $overlay.addEventListener('click', e => { if (e.target === $overlay) closeModal(); });
  document.getElementById('modal-url').addEventListener('keydown', e => { if (e.key === 'Enter') saveModal(); });

  // Context menu
  $ctxMenu.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action || !ctxApp) return;
    if (action === 'open-tab') openInTab(ctxApp.url);
    if (action === 'open-win') openInWindow(ctxApp.url);
    if (action === 'signin') signInViaWindow(ctxApp);
    if (action === 'edit') openModal(ctxApp);
    if (action === 'remove') removeApp(ctxApp.id);
    hideCtxMenu();
  });
  document.addEventListener('click', hideCtxMenu);
  document.addEventListener('contextmenu', hideCtxMenu);

  // Settings modal
  $defaultPageSelect.addEventListener('change', e => { defaultAppId = e.target.value || null; save(); });
  document.getElementById('settings-close').addEventListener('click', closeSettings);
  $settingsOverlay.addEventListener('click', e => { if (e.target === $settingsOverlay) closeSettings(); });
  document.getElementById('settings-export').addEventListener('click', exportApps);
  document.getElementById('settings-import').addEventListener('click', () => $settingsFile.click());
  $settingsFile.addEventListener('change', e => {
    if (e.target.files[0]) importApps(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('settings-reset').addEventListener('click', resetToDefaults);

  // Open shortcut page URL
  document.getElementById('settings-shortcut-open').addEventListener('click', () => {
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

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$settingsOverlay.classList.contains('hidden')) { closeSettings(); return; }
      if (!$overlay.classList.contains('hidden')) { closeModal(); return; }
      if (editMode) { toggleEditMode(); return; }
      if (panelOpen) closePanel();
    }
  });
}

// Boot
init();
