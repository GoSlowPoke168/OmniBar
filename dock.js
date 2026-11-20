// Shared dock, settings, and app list for both sidebar implementations.

let apps = [];
let defaultAppId = null;
let editMode = false;
let editingId = null;
let dragSrcIdx = null;
let dragTargetIdx = null;
let ctxApp = null;
let iconCache = Object.create(null);
let tipTimer = null;
let tipEl = null;
let openSheetId = null;
let sheetOpener = null;
let confirmResolve = null;
let toastTimeoutId = null;

const $ = id => document.getElementById(id);
const $icons = $('app-icons');
const $ctxMenu = $('ctx-menu');
const $sheetLayer = $('sheet-layer');
const $mTitle = $('modal-title');
const $mName = $('modal-name');
const $mUrl = $('modal-url');
const $mSave = $('modal-save');
const $confirmOverlay = $('confirm-overlay');
const $defaultPageSelect = $('settings-default-page');
const $tip = $('tooltip');
const ICON_MAX_AGE = 7 * 864e5;
const sheetEl = id => $(id === 'settings' ? 'settings-sheet' : 'modal-sheet');

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function iconHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function faviconUrl(host) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

function getFavicon(url) {
  const host = iconHost(url);
  return host ? iconCache[host]?.data ?? faviconUrl(host) : '';
}

function blobToDataUrl(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
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
      if (!data || !apps.some(a => iconHost(a.url) === host)) return;
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
  if (changed) extensionApi.storage.local.set({ icons: iconCache });
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function save() {
  extensionApi.storage.local.set({ apps, defaultAppId });
  refreshIcons();
}

function syncDefaultAppId() {
  if (!apps.some(a => a.id === defaultAppId)) defaultAppId = null;
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

function renderStrip() {
  const focusedId = document.activeElement?.closest?.('.app-icon')?.dataset.id;
  cleanDrag();
  $icons.innerHTML = '';
  $icons.classList.toggle('edit-mode', editMode);
  $('btn-edit').classList.toggle('is-active', editMode);

  apps.forEach((app, i) => {
    const el = document.createElement('div');
    el.className = isActiveApp(app) ? 'app-icon active' : 'app-icon';
    el.dataset.id = app.id;
    el.dataset.host = iconHost(app.url);
    el.dataset.idx = i;
    el.dataset.tip = `${app.name} — right-click for more`;
    el.draggable = editMode;
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
      launchApp(app);
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showCtxMenu(e, app); });
    el.addEventListener('dragstart', e => onDragStart(e, i));
    el.addEventListener('dragend', cleanDrag);

    $icons.appendChild(el);
  });
  if (focusedId) $icons.querySelector(`[data-id="${CSS.escape(focusedId)}"]`)?.focus();
  syncContentState();
}

function showCtxMenu(e, app) {
  hideTip();
  ctxApp = app;
  $ctxMenu.classList.remove('hidden');
  const w = $ctxMenu.offsetWidth, h = $ctxMenu.offsetHeight, m = 6;
  $ctxMenu.style.left = `${Math.max(m, Math.min(e.clientX, innerWidth - w - m))}px`;
  $ctxMenu.style.top = `${Math.max(m, Math.min(e.clientY, innerHeight - h - m))}px`;
}

function hideCtxMenu() { $ctxMenu.classList.add('hidden'); ctxApp = null; }

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
  extensionApi.commands.getAll().then(cmds => {
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
  $('settings-version').textContent = `OmniBar ${extensionApi.runtime.getManifest().version}`;
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

function onDragStart(e, idx) {
  hideTip();
  dragSrcIdx = dragTargetIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
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
