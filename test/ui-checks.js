// UI checks for sidebar.html, run in the harness page (see test/README.md).
(function () {
  const checks = new Map();
  window.uiCheck = (name, fn) => checks.set(name, fn);
  window.runUiChecks = async (names) => {
    const out = [];
    for (const [name, fn] of checks) {
      if (names && !names.includes(name)) continue;
      reset();
      try { await fn(); out.push({ name, ok: true }); }
      catch (e) { out.push({ name, ok: false, detail: e.message }); }
    }
    reset();
    return out;
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q = s => document.querySelector(s);
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const visible = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const wiki = { url: 'https://en.wikipedia.org/wiki/Garbage', title: 'Garbage – Wikipedia' };
  const appIcon = i => q('#app-icons').children[i];

  function reset() {
    if (confirmResolve) confirmResolve(false);
    closeSheet(true);
    hideCtxMenu();
    hideTip();
    if (editMode) toggleEditMode();
    if (panelOpen) closePanel();
    __stub.setActiveTab({ ...wiki });
  }
  async function openFirst() { appIcon(0).click(); await sleep(60); }

  // Task 1
  uiCheck('noConsoleErrors', () => assert(window.__errors.length === 0, window.__errors.join(' | ')));

  // Task 2
  uiCheck('themeBeforePaint', () => {
    const want = { dark: 'rgb(31, 31, 31)', light: 'rgb(255, 255, 255)' }[window.__firstPaint.theme];
    assert(window.__firstPaint.bg === want, `first paint bg ${window.__firstPaint.bg} for theme ${window.__firstPaint.theme}`);
    const stored = localStorage.getItem('omnibar-theme');
    if (stored) assert(window.__firstPaint.theme === stored, `stored ${stored} but painted ${window.__firstPaint.theme}`);
  });
  uiCheck('fontIsGeist', async () => {
    await document.fonts.ready;
    assert(document.fonts.check('13.5px Geist'), 'Geist not loaded');
    assert(getComputedStyle(document.body).fontFamily.startsWith('Geist'), 'body font is not Geist');
  });
  uiCheck('noStrayColors', async () => {
    const css = await (await fetch('sidebar.css')).text();
    const rest = css.replace(/html\[data-theme="(dark|light)"\]\s*\{[^}]*\}/g, '');
    const hits = rest.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g);
    assert(!hits, `color literals outside tokens: ${hits}`);
  });
  uiCheck('focusRingVisible', () => {
    q('#btn-settings').focus({ focusVisible: true });
    const s = getComputedStyle(q('#btn-settings'));
    assert(s.outlineStyle === 'solid' && s.outlineWidth === '2px', `outline ${s.outlineStyle} ${s.outlineWidth}`);
    q('#btn-settings').blur();
  });
  uiCheck('iframePinnedScheme', () => {
    assert(getComputedStyle(q('#app-frame')).colorScheme === 'light dark', getComputedStyle(q('#app-frame')).colorScheme);
  });

  // Task 3
  uiCheck('noGlyphIcons', () => {
    const glyphs = ['↗', '❐', '↺', '✕', '✎', '+', '＋', '⚙', '🔒', '🔑'];
    const els = document.querySelectorAll('#panel-header button, #strip-footer button, #ctx-menu button, .state-panel .state-icon, .remove-badge');
    els.forEach(el => assert(!glyphs.includes(el.textContent.trim()), `${el.id || el.className} uses glyph ${el.textContent.trim()}`));
  });
  uiCheck('headerButtonsOrder', () => {
    const ids = [...document.querySelectorAll('#panel-header-btns button')].map(b => b.id);
    assert(ids.join() === 'hdr-copyurl,hdr-desktop,hdr-newtab,hdr-window,hdr-refresh,hdr-close', ids.join());
    ids.forEach(id => assert(document.querySelector(`#${id} svg use`), `${id} has no icon`));
  });
  uiCheck('gearIsGear', () => assert(q('#btn-settings use').getAttribute('href') === '#i-gear', 'gear icon wrong'));
  uiCheck('pencilActive', () => {
    toggleEditMode();
    assert(q('#btn-edit').classList.contains('is-active'), 'pencil not active in edit mode');
    toggleEditMode();
    assert(!q('#btn-edit').classList.contains('is-active'), 'pencil still active');
  });
  uiCheck('dragPreviewsOrderBeforeDrop', async () => {
    const original = [...apps];
    const transfer = new DataTransfer();
    const drag = (type, element, clientY) => {
      element.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, clientY }));
    };
    const first = appIcon(0);
    const second = appIcon(1);
    const firstSlot = first.getBoundingClientRect().top;
    const target = appIcon(2).getBoundingClientRect();
    const targetY = target.top + target.height / 2;
    try {
      drag('dragstart', first);
      drag('dragover', appIcon(2), targetY);
      await sleep(200);
      assert(Math.abs(second.getBoundingClientRect().top - firstSlot) < 1, 'neighbor did not move into the first slot');
      assert(apps[0] === original[0], 'drag preview changed the saved order');
      drag('dragend', first);
      await sleep(200);
      assert(second.getBoundingClientRect().top > firstSlot, 'cancelled drag did not restore the strip');

      drag('dragstart', first);
      drag('dragover', appIcon(2), targetY);
      drag('drop', appIcon(2), targetY);
      assert(apps[2] === original[0] && __stub.storage.apps[2] === original[0], 'drop did not save the previewed order');
    } finally {
      cleanDrag();
      apps = original;
      save();
      renderStrip();
    }
  });

  // Task 4
  uiCheck('noNativeTitles', () => {
    const titled = [...document.querySelectorAll('#app [title], #ctx-menu [title]')].filter(el => el.id !== 'app-frame');
    assert(titled.length === 0, `native titles on: ${titled.map(e => e.id || e.className).join()}`);
  });
  uiCheck('tooltipShowsAfterDelay', async () => {
    q('#btn-add').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    await sleep(300);
    assert(!q('#tooltip').classList.contains('show'), 'tooltip shown before 400 ms');
    await sleep(200);
    assert(q('#tooltip').classList.contains('show') && q('#tooltip').textContent === 'Add app', `tooltip "${q('#tooltip').textContent}"`);
  });
  uiCheck('tooltipStaysInside', async () => {
    await openFirst();
    for (const el of [q('#hdr-close'), appIcon(q('#app-icons').children.length - 1)]) {
      showTip(el);
      const r = q('#tooltip').getBoundingClientRect();
      assert(r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, `tooltip outside viewport for ${el.id || el.dataset.id}`);
    }
  });

  // Task 5
  uiCheck('actionBarShowsTitle', async () => {
    await openFirst();
    assert(visible(q('#action-bar')), 'action bar hidden');
    assert(q('#action-page').textContent === 'Page: Garbage – Wikipedia', q('#action-page').textContent);
  });
  uiCheck('actionBarNonWeb', async () => {
    await openFirst();
    const frame = $frame;
    __stub.setActiveTab({ url: 'chrome://newtab/', title: 'New Tab' });
    __stub.fireTabActivated();
    await sleep(30);
    assert($frame === frame && !visible(q('#load-spinner')), 'switching browser tabs reloaded the app');
    assert(q('#action-page').textContent === 'Page: none', q('#action-page').textContent);
    assert(q('#act-summarize').disabled && q('#act-ask').disabled, 'buttons not disabled');
    assert(q('#action-btns').dataset.tip === 'Open a regular web page first', 'no disabled tooltip');
    __stub.setActiveTab({ ...wiki });
    __stub.fireTabUpdated({ status: 'complete' });
    await sleep(30);
    assert(!q('#act-summarize').disabled, 'buttons not re-enabled');
  });
  uiCheck('longTextTruncates', async () => {
    await openFirst();
    $panelName.textContent = 'Google Image Search With A Very Long Name';
    $panelUrlText.textContent = 'a-very-long-subdomain.example-application-hosting.com';
    $actionTitle.textContent = 'An extremely long page title '.repeat(5);
    const panel = q('#content-panel').getBoundingClientRect();
    for (const s of ['#panel-app-name', '#panel-url-text', '#action-page']) {
      const el = q(s);
      assert(getComputedStyle(el).textOverflow === 'ellipsis', `${s} no ellipsis`);
      assert(el.getBoundingClientRect().right <= panel.right + 0.5, `${s} overflows panel`);
    }
    assert(q('#panel-header-btns').getBoundingClientRect().right <= panel.right + 0.5, 'header buttons overflow');
  });
  uiCheck('summarizeStillSends', async () => {
    await openFirst();
    await sleep(200);
    let sent = null;
    $frame.contentWindow.postMessage = msg => { sent = msg; };
    q('#act-summarize').click();
    await sleep(30);
    assert(sent?.type === 'omnibar-insert' && sent.send === true && sent.text.includes(wiki.url), 'no insert message');
  });

  // Task 6
  uiCheck('spinnerDelayed', async () => {
    openApp({ id: 'slow', name: 'Slow', url: 'http://10.255.255.1/' });
    await sleep(100);
    assert(!visible(q('#load-spinner')), 'spinner visible before 150 ms');
    assert(!visible(q('#app-frame')), 'unloaded iframe visible before the spinner');
    await sleep(150);
    assert(visible(q('#load-spinner')), 'spinner not visible after 250 ms of loading');
  });
  uiCheck('refreshSpinnerCoversBlankFrame', async () => {
    await openFirst();
    const spinner = q('#load-spinner');
    q('#hdr-refresh').click();
    assert(visible(spinner), 'refresh did not show the spinner immediately');
    assert($frame.getAttribute('src') === activeApp().url, 'refresh navigated to a blank URL first');
    await sleep(100);
    assert($frame.contentDocument?.querySelector('textarea'), 'the app did not reload');
    assert(!visible(spinner), 'spinner still visible after the app reloaded');
  });
  uiCheck('rapidAppSwitchKeepsLoadingCovered', async () => {
    await openFirst();
    appIcon(1).click();
    const oldFrame = $frame;
    appIcon(2).click();
    assert(visible(q('#load-spinner')), 'switch did not show the spinner immediately');
    assert(!visible($frame), 'new app visible before it loaded');
    oldFrame.dispatchEvent(new Event('load'));
    assert(visible(q('#load-spinner')), 'previous app load hid the spinner');
    await sleep(100);
    assert($frame.contentDocument?.querySelector('textarea'), 'the selected app did not load');
    assert(visible($frame) && !visible(q('#load-spinner')), 'loaded app is still covered');
  });
  uiCheck('signinPanelIcon', async () => {
    await openFirst();
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'omnibar-signin-needed' }, source: $frame.contentWindow }));
    const p = q('#signin-msg');
    assert(visible(p), 'sign-in panel hidden');
    assert(p.querySelector('.state-icon use').getAttribute('href') === '#i-login', 'wrong icon');
    assert(p.querySelector('.state-icon').getBoundingClientRect().width === 52, 'icon circle not 52px');
    assert(p.querySelector('h3').textContent === 'Sign in to Claude', p.querySelector('h3').textContent);
  });
  uiCheck('blockedPanelStyled', () => {
    const p = q('#blocked-msg');
    assert(p.querySelector('use').getAttribute('href') === '#i-shield-off', 'wrong icon');
    assert(q('#blocked-newtab').textContent === 'Open in new tab' && q('#blocked-newtab').classList.contains('btn-primary'), 'primary button wrong');
  });
  uiCheck('emptyStateCopy', () => {
    assert(visible(q('#empty-state')) && q('#empty-state').textContent === 'Choose an app on the right to open it here.', q('#empty-state').textContent);
    const saved = apps; apps = []; renderStrip();
    const text = q('#empty-state').textContent;
    apps = saved; renderStrip();
    assert(text === 'Add an app with + to get started.', text);
  });
  uiCheck('editHintShown', async () => {
    await openFirst();
    toggleEditMode();
    assert(visible(q('#edit-hint')) && !visible(q('#empty-state')), 'edit hint not shown');
    assert(q('#edit-hint h3').textContent === 'Editing apps', 'title');
    assert(q('#edit-hint p').textContent.includes('Click the pencil again when finished.'), 'copy');
  });

  // Task 7
  uiCheck('sheetCoversContentOnly', () => {
    q('#btn-settings').click();
    const r = q('#sheet-layer').getBoundingClientRect();
    assert(Math.abs(r.right - (innerWidth - 48)) < 1, `layer right ${r.right}`);
    const hit = document.elementFromPoint(innerWidth - 24, appIcon(0).getBoundingClientRect().top + 10);
    assert(hit.closest('#icon-strip'), 'strip covered');
  });
  uiCheck('openerActive', () => {
    q('#btn-settings').click();
    assert(q('#btn-settings').classList.contains('is-active'), 'gear not active');
    closeSheet(true);
    assert(!q('#btn-settings').classList.contains('is-active'), 'gear still active');
    q('#btn-add').click();
    assert(q('#btn-add').classList.contains('is-active'), 'plus not active');
  });
  uiCheck('sheetClosesOnStripClick', async () => {
    q('#btn-settings').click();
    appIcon(1).click();
    await sleep(150);
    assert(!openSheetId && panelOpen && activeId === apps[1].id, 'app click did not close sheet and open app');
    q('#btn-settings').click();
    q('#btn-edit').click();
    assert(!openSheetId && editMode, 'pencil did not close sheet and enter edit mode');
    toggleEditMode();
    q('#btn-settings').click();
    q('#btn-settings').click();
    assert(!openSheetId, 'gear did not toggle closed');
  });
  uiCheck('escapeOrder', async () => {
    await openFirst();
    q('#btn-settings').click();
    q('#settings-reset').click();
    await sleep(10);
    esc(); await sleep(10);
    assert(!confirmResolve && openSheetId === 'settings', 'Escape did not close confirm only');
    esc();
    assert(!openSheetId && panelOpen, 'Escape did not close settings only');
    showCtxMenu({ clientX: 100, clientY: 100 }, apps[0]);
    esc();
    assert(q('#ctx-menu').classList.contains('hidden') && panelOpen, 'Escape did not close menu only');
    esc();
    assert(!panelOpen, 'Escape did not close app');
    toggleEditMode(); esc();
    assert(!editMode, 'Escape did not leave edit mode');
  });
  uiCheck('appearanceSwitch', () => {
    const before = OmniTheme.get();
    q('#btn-settings').click();
    q('#settings-theme [data-mode="dark"]').click();
    assert(document.documentElement.dataset.theme === 'dark' && localStorage.getItem('omnibar-theme') === 'dark', 'dark not applied');
    assert(q('#settings-theme [data-mode="dark"]').getAttribute('aria-checked') === 'true', 'segment not checked');
    q('#settings-theme [data-mode="light"]').click();
    assert(document.documentElement.dataset.theme === 'light', 'light not applied');
    q('#settings-theme [data-mode="system"]').click();
    const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    assert(document.documentElement.dataset.theme === sys && localStorage.getItem('omnibar-theme') === null, 'system not applied');
    OmniTheme.set(before);
  });
  uiCheck('settingsContent', async () => {
    q('#btn-settings').click();
    await sleep(30);
    const labels = [...document.querySelectorAll('#settings-sheet .label')].map(l => l.textContent);
    assert(labels.join('|') === 'Appearance|Default page|Current page|Apps|Shortcut', labels.join('|'));
    assert(q('#shortcut-keys').innerHTML === '<kbd>Alt</kbd><kbd>Z</kbd>', q('#shortcut-keys').innerHTML);
    assert(q('#settings-version').textContent === 'OmniBar 2.0.0', q('#settings-version').textContent);
    const text = q('#settings-sheet').textContent;
    assert(!/How to use|Web App Sidebar/i.test(text), 'old copy present');
  });
  uiCheck('defaultPagePickerIsInSidebar', () => {
    if (!CSS.supports('appearance', 'base-select')) return;
    const select = q('#settings-default-page');
    assert(getComputedStyle(select).appearance === 'base-select', 'default page uses the system popup');
    assert(getComputedStyle(select).alignItems === 'center', 'default page label is not vertically centered');
    assert(getComputedStyle(select, '::picker(select)').appearance === 'base-select', 'picker is not rendered in the sidebar');
  });
  uiCheck('keyboardDialog', () => {
    q('#btn-add').click();
    assert(q('#modal-title').textContent === 'Add app' && $mSave.textContent === 'Add app' && $mSave.disabled, 'add dialog initial state');
    $mName.value = 'Perplexity'; $mName.dispatchEvent(new Event('input'));
    assert($mSave.disabled, 'enabled with one field');
    $mUrl.value = 'perplexity.ai'; $mUrl.dispatchEvent(new Event('input'));
    assert(!$mSave.disabled, 'not enabled with both fields');
    const n = apps.length;
    $mUrl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    assert(apps.length === n + 1 && apps[n].url === 'https://perplexity.ai', 'Enter did not save');
    removeApp(apps[n].id);
    openModal(apps[0]);
    assert(q('#modal-title').textContent === 'Edit app' && $mSave.textContent === 'Save', 'edit dialog copy');
    esc();
    assert(!openSheetId, 'Escape did not cancel');
  });
  uiCheck('resetUsesDialog', async () => {
    const realConfirm = window.confirm;
    window.confirm = () => { throw new Error('native confirm used'); };
    try {
      const before = apps.map(a => a.id).join();
      q('#btn-settings').click();
      q('#settings-reset').click();
      await sleep(10);
      assert(visible(q('#confirm-overlay')), 'confirm dialog hidden');
      assert(q('#confirm-title').textContent === 'Reset to defaults?', 'title');
      assert(q('#confirm-body').textContent === "Your apps and their order will be replaced with the default list. This can't be undone.", 'body');
      assert(q('#confirm-ok').textContent === 'Reset' && q('#confirm-ok').classList.contains('btn-danger'), 'button');
      q('#confirm-cancel').click();
      await sleep(10);
      assert(apps.map(a => a.id).join() === before, 'cancel changed apps');
    } finally { window.confirm = realConfirm; }
  });

  // Final review fixes
  uiCheck('staleConfirmClosedByStripClick', async () => {
    const before = apps.map(a => a.id).join();
    q('#btn-settings').click();
    q('#settings-reset').click();
    await sleep(10);
    appIcon(0).click();
    await sleep(150);
    assert(!confirmResolve && !visible(q('#confirm-overlay')), 'confirm still pending after strip click');
    q('#btn-add').click();
    assert(!visible(q('#confirm-overlay')), 'stale confirm shown over add dialog');
    assert(apps.map(a => a.id).join() === before, 'apps changed');
  });
  uiCheck('actionLabelsFit', async () => {
    await openFirst();
    document.querySelectorAll('#action-btns .btn span').forEach(s => {
      assert(s.scrollWidth <= s.clientWidth, `"${s.textContent}" cut off at ${innerWidth}px`);
    });
  });
  uiCheck('actionPillsLeftAligned', async () => {
    await openFirst();
    const bar = q('#action-btns').getBoundingClientRect();
    const [a, b] = [...document.querySelectorAll('#action-btns .btn')].map(el => el.getBoundingClientRect());
    assert(Math.abs(a.left - bar.left) < 1, 'first pill not at the left edge');
    document.querySelectorAll('#action-btns .btn').forEach(el => assert(getComputedStyle(el).flexGrow === '0', 'pill grows to fill the bar'));
    assert(b.right < bar.right - 1, 'pills fill the whole bar');
    assert(getComputedStyle(q('#act-summarize')).borderRadius === '999px', 'not a pill');
    assert(Math.abs(a.top - b.top) < 1, `pills wrap onto two rows at ${innerWidth}px`);
  });
  uiCheck('pageContextFollowsOwnWindow', async () => {
    await openFirst();
    __stub.lastFocusedWindow = 2;
    try {
      chrome.tabs.onActivated.fire({ tabId: 5, windowId: 2 });
      await sleep(30);
      assert(q('#action-page').textContent === 'Page: Garbage – Wikipedia', `followed other window: ${q('#action-page').textContent}`);
      let sent = null;
      $frame.contentWindow.postMessage = msg => { sent = msg; };
      q('#act-summarize').click();
      await sleep(30);
      assert(sent?.text.includes(wiki.url), 'Summarize used the other window\'s page');
      const n = __stub.queries;
      chrome.tabs.onUpdated.fire(6, { title: 'Background tab (3)' }, { id: 6, active: false, windowId: 1 });
      await sleep(30);
      assert(__stub.queries === n, 'background-tab title change triggered a refresh');
    } finally { __stub.lastFocusedWindow = 1; }
  });
  uiCheck('focusKeptAfterOpen', async () => {
    appIcon(0).focus();
    appIcon(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(30);
    assert(document.activeElement?.dataset?.id === apps[0].id, `focus on ${document.activeElement?.tagName}`);
  });

  // Page access consent
  async function withPageAccess(value, fn) {
    const saved = pageAccess;
    pageAccess = value;
    try { await fn(); } finally { pageAccess = saved; refreshPageContext(); }
  }
  uiCheck('pageNoticeBeforeConsent', () => withPageAccess(undefined, async () => {
    const n = __stub.queries;
    await openFirst();
    assert(visible(q('#page-notice')), 'notice not shown');
    assert(!visible(q('#action-btns')) && !visible(q('#action-page')), 'actions shown before consent');
    assert(__stub.queries === n, 'tab was read before consent');
  }));
  uiCheck('pageNoticeAllow', () => withPageAccess(undefined, async () => {
    await openFirst();
    q('#page-allow').click();
    await sleep(30);
    assert(__stub.storage.pageAccess === true, 'consent not saved');
    assert(!visible(q('#page-notice')) && visible(q('#action-btns')), 'actions not shown after Allow');
    assert(q('#action-page').textContent === 'Page: Garbage – Wikipedia', q('#action-page').textContent);
  }));
  uiCheck('pageNoticeNotNow', () => withPageAccess(undefined, async () => {
    await openFirst();
    const n = __stub.queries;
    q('#page-notnow').click();
    await sleep(30);
    assert(__stub.storage.pageAccess === false, 'refusal not saved');
    assert(visible(q('#page-off')) && !visible(q('#page-notice')) && !visible(q('#action-btns')), 'off state wrong');
    assert(__stub.queries === n, 'tab read after Not now');
    q('#page-turnon').click();
    await sleep(30);
    assert(__stub.storage.pageAccess === true && visible(q('#action-btns')), 'Turn on did not enable');
  }));
  uiCheck('pageAccessInSettings', () => withPageAccess(true, async () => {
    q('#btn-settings').click();
    q('#settings-page-access [data-access="off"]').click();
    assert(__stub.storage.pageAccess === false, 'Settings Off not saved');
    assert(q('#settings-page-access [data-access="off"]').getAttribute('aria-checked') === 'true', 'segment not checked');
    q('#settings-page-access [data-access="on"]').click();
    assert(__stub.storage.pageAccess === true, 'Settings On not saved');
  }));

  // Icon cache
  async function withFakeFavicons(fn) {
    const realFetch = window.fetch;
    let calls = 0;
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
    window.fetch = (url, opts) => {
      if (String(url).includes('/s2/favicons')) { calls++; return Promise.resolve(new Response(new Blob([png], { type: 'image/png' }))); }
      return realFetch(url, opts);
    };
    try { await fn(() => calls); } finally { window.fetch = realFetch; }
  }
  uiCheck('iconsCachedAndReused', () => withFakeFavicons(async calls => {
    iconCache = {};
    await refreshIcons();
    const host = new URL(apps[0].url).hostname;
    assert(__stub.storage.icons?.[host]?.data?.startsWith('data:image/png'), 'icon not saved to storage');
    renderStrip();
    assert(appIcon(0).querySelector('img').src.startsWith('data:'), 'strip not using cached icon');
    const n = calls();
    await refreshIcons();
    assert(calls() === n, 'fresh icons were fetched again');
  }));
  uiCheck('staleIconsRefetchedAndPruned', () => withFakeFavicons(async calls => {
    const host = new URL(apps[0].url).hostname;
    iconCache = { [host]: { data: 'data:image/png;base64,AA==', at: Date.now() - 8 * 864e5 }, 'gone.example': { data: 'data:,', at: Date.now() } };
    await refreshIcons();
    assert(calls() >= 1 && iconCache[host].at > Date.now() - 60000, 'stale icon not refreshed');
    assert(!('gone.example' in iconCache) && !('gone.example' in __stub.storage.icons), 'removed app icon not pruned');
  }));
  uiCheck('privacyLinkInSettings', () => {
    q('#btn-settings').click();
    const link = q('#settings-privacy');
    assert(link && link.textContent === 'Privacy policy', 'no privacy link');
    __stub.created.length = 0;
    link.click();
    assert(__stub.created[0] === 'https://github.com/GoSlowPoke168/OmniBar/blob/main/PRIVACY.md', `opened ${__stub.created[0]}`);
  });

  // Task 8
  uiCheck('ctxMenuIcons', () => {
    showCtxMenu({ clientX: 50, clientY: 50 }, apps[0]);
    const items = [...document.querySelectorAll('#ctx-menu > *')].map(el => el.classList.contains('ctx-sep') ? '|' : el.textContent.trim());
    assert(items.join(',') === 'Open in new tab,Open in side window,Sign in…,|,Edit,Remove', items.join(','));
    document.querySelectorAll('.ctx-item').forEach(el => assert(el.querySelector('svg use'), `${el.textContent} no icon`));
    const probe = document.body.appendChild(Object.assign(document.createElement('span'), { style: 'color: var(--danger)' }));
    const danger = getComputedStyle(probe).color;
    probe.remove();
    assert(getComputedStyle(q('.ctx-item.danger')).color === danger, 'remove not danger');
  });
  uiCheck('ctxMenuInBounds', () => {
    const r0 = appIcon(apps.length - 1).getBoundingClientRect();
    showCtxMenu({ clientX: r0.left, clientY: innerHeight - 5 }, apps[0]);
    const r = q('#ctx-menu').getBoundingClientRect();
    assert(r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, 'menu outside viewport');
  });
  uiCheck('toastPill', async () => {
    await openFirst();
    showToast('Apps imported', 'success');
    await sleep(250);
    assert(q('#toast .toast-icon use').getAttribute('href') === '#i-check', 'success icon');
    assert(q('#toast').getBoundingClientRect().bottom <= q('#action-bar').getBoundingClientRect().top, 'toast overlaps action bar');
    showToast('Failed', 'error');
    assert(q('#toast .toast-icon use').getAttribute('href') === '#i-xcircle', 'error icon');
    await sleep(2800);
    assert(!q('#toast').classList.contains('show'), 'toast did not hide');
  });
  uiCheck('assetBudget', async () => {
    const font = (await (await fetch('fonts/Geist-Variable.woff2')).arrayBuffer()).byteLength;
    const sprite = q('svg defs').outerHTML.length;
    assert(font + sprite <= 100 * 1024, `assets ${font + sprite} bytes`);
  });
  uiCheck('idleQuiet', async () => {
    await sleep(1000);
    const running = document.getAnimations().filter(a => a.playState === 'running');
    assert(running.length === 0, `${running.length} animations running while idle`);
  });
})();
