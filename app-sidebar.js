// Only native pages launched by OmniBar get the dock controls.
(async () => {
  const marker = /^#omnibar-(\d+)-([a-f\d-]+)$/.exec(location.hash);
  if (!marker || window !== window.top) return;

  const windowId = Number(marker[1]);
  const token = marker[2];
  const send = (action, index) => browser.runtime.sendMessage({ type: 'native-controls', windowId, token, action, index });
  const state = await send('read');
  if (!state) return;
  if (!document.body) {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });
  const shellStyles = new CSSStyleSheet();
  shellStyles.replaceSync(`
    :host {
      all: initial;
      --accent: #2f6fe4;
      --surface: #f3f4f6;
      --text: #1c1c1e;
      --muted: #55565c;
      --border: #d7d8dc;
      --hover: #e1e3e7;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      font: 13px system-ui, sans-serif;
      color: var(--text);
    }
    :host([data-dark]) {
      --accent: #5b9cf6;
      --surface: #272727;
      --text: #ececec;
      --muted: #b4b4b8;
      --border: #3a3a3a;
      --hover: #3a3a3a;
    }
    header, nav {
      box-sizing: border-box;
      position: absolute;
      display: flex;
      align-items: center;
      background: var(--surface);
      pointer-events: auto;
    }
    header {
      inset: 0 48px auto 0;
      justify-content: space-between;
      height: 44px;
      padding: 0 8px 0 12px;
      border-bottom: 1px solid var(--border);
    }
    header strong, header small { display: block; }
    header small { color: var(--muted); }
    header div:last-child { display: flex; }
    nav {
      inset: 0 0 0 auto;
      width: 48px;
      flex-direction: column;
      padding: 6px 4px 4px;
      border-left: 1px solid var(--border);
    }
    .apps { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; }
    .apps, .tools { display: flex; flex-direction: column; gap: 4px; }
    .tools { padding-top: 4px; border-top: 1px solid var(--border); }
    button {
      flex: none;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    header button { width: 30px; height: 30px; }
    button:hover { background: var(--hover); }
    button:focus-visible, button[aria-current] { outline: 2px solid var(--accent); outline-offset: -2px; }
    svg { width: 19px; height: 19px; }
    img { width: 20px; height: 20px; object-fit: contain; }
    .status {
      position: absolute;
      bottom: 8px;
      right: 56px;
      padding: 6px 8px;
      background: var(--surface);
      border-radius: 6px;
    }
    .status:empty { display: none; }
  `);
  shadow.adoptedStyleSheets = [shellStyles];

  const layout = new CSSStyleSheet();
  layout.replaceSync(`
    body {
      box-sizing: border-box !important;
      width: calc(100vw - 48px) !important;
      height: calc(100dvh - 44px) !important;
      margin: 44px 48px 0 0 !important;
      transform: translate(0) !important;
      overflow: auto !important;
    }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, layout];

  const preference = matchMedia('(prefers-color-scheme: dark)');
  const updateTheme = () => host.toggleAttribute('data-dark',
    state.theme === 'dark' || (state.theme === 'system' && preference.matches));
  updateTheme();
  preference.addEventListener('change', updateTheme);

  const paths = {
    direct: 'M15 3h6v6 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
    dock: 'm18 6-12 12 M6 6l12 12',
    add: 'M12 5v14 M5 12h14',
    edit: 'm16 4 4 4 M4 20l4-1L21 6a2 2 0 0 0-3-3L5 16z',
    settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.73l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.73v-.51a2 2 0 0 1 1-1.73l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  };

  const status = document.createElement('span');
  status.className = 'status';
  status.setAttribute('role', 'status');

  function createButton(label, action, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    if (paths[action]) {
      const ns = 'http://www.w3.org/2000/svg';
      const icon = document.createElementNS(ns, 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '1.8');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', paths[action]);
      icon.append(path);
      button.append(icon);
    }
    button.addEventListener('click', event => {
      if (event.isTrusted) send(action, index).catch(() => { status.textContent = 'Could not switch views.'; });
    });
    return button;
  }

  const header = document.createElement('header');
  const title = document.createElement('div');
  const name = document.createElement('strong');
  const address = document.createElement('small');
  name.textContent = state.app.name;
  address.textContent = location.hostname;
  title.append(name, address);
  const actions = document.createElement('div');
  const directLabel = location.hostname === 'claude.ai'
    ? 'Open conversation history in the sidebar'
    : 'Open directly in the sidebar';
  actions.append(createButton(directLabel, 'direct'), createButton('Return to OmniBar', 'dock'));
  header.append(title, actions);

  const rail = document.createElement('nav');
  rail.setAttribute('aria-label', 'OmniBar');
  const appButtons = document.createElement('div');
  appButtons.className = 'apps';
  state.apps.forEach((app, index) => {
    let url;
    try { url = new URL(app.url); } catch (_) { return; }
    const button = createButton(app.name, 'app', index);
    button.textContent = app.name.trim().slice(0, 1).toUpperCase();
    if (app.url === state.app.url) {
      button.setAttribute('aria-current', 'page');
      button.disabled = true;
    }
    const iconData = state.icons[url.hostname]?.data;
    if (typeof iconData === 'string' && /^data:image\//i.test(iconData)) {
      const image = document.createElement('img');
      image.alt = '';
      image.onload = () => button.replaceChildren(image);
      image.src = iconData;
    }
    appButtons.append(button);
  });
  const tools = document.createElement('div');
  tools.className = 'tools';
  tools.append(createButton('Add app', 'add'), createButton('Edit apps', 'edit'), createButton('Settings', 'settings'));
  rail.append(appButtons, tools);
  shadow.append(header, rail, status);
  document.documentElement.append(host);
})().catch(error => console.error('OmniBar sidebar controls:', error));
