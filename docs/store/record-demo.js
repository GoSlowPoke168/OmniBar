// Records docs/store/omnibar-demo.webm. Run with the Playwright MCP tool (browser_run_code_unsafe, filename=this file)
// while `python -m http.server 8765` serves the repo root.
async (page) => {
  const root = 'C:/Users/jhou2/Documents/Projects and Programs/OmniBar';
  const base = 'http://127.0.0.1:8765';
  const size = { width: 1600, height: 1000 };
  const mock = await (await fetch(base + '/docs/store/chat-mock.html', { cache: 'no-store' })).text();

  const ctx = await page.context().browser().newContext({ colorScheme: 'dark', viewport: size, recordVideo: { dir: root + '/dist/video', size } });
  await ctx.route(/https:\/\/(claude\.ai|chatgpt\.com|gemini\.google\.com|grok\.com|chat\.deepseek\.com|images\.google\.com)\//, route => {
    const variant = route.request().url().includes('chatgpt.com') ? 'live' : 'install';
    route.fulfill({ contentType: 'text/html', body: mock.replace('|| chats.install', `|| chats.${variant}`) });
  });
  await ctx.addInitScript({ path: root + '/test/chrome-stub.js' });
  await ctx.addInitScript(() => {
    localStorage.removeItem('omnibar-theme');
    if (!window.__stub) return;
    __stub.activeTab = { url: 'https://github.com/GoSlowPoke168/OmniBar', title: 'GoSlowPoke168/OmniBar: A customizable sidebar extension' };
    __stub.storage.apps = [
      { id: 'claude', name: 'Claude', url: 'https://claude.ai/new' },
      { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/' },
      { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/' },
      { id: 'grok', name: 'Grok', url: 'https://grok.com/' },
      { id: 'deepseek', name: 'Deepseek', url: 'https://chat.deepseek.com/' },
      { id: 'images', name: 'Google Image Search', url: 'https://images.google.com/' }
    ];
  });

  const p = await ctx.newPage();
  await p.goto(base + '/docs/store/compose.html');
  const f = p.frame({ url: /sidebar\.html/ });
  await f.waitForFunction(() => typeof apps !== 'undefined' && apps.length === 6);
  await p.evaluate(() => document.fonts.ready);

  const wait = ms => p.waitForTimeout(ms);
  const centerOf = async selector => {
    const box = await f.locator(selector).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const moveTo = async ({ x, y }) => {
    await p.evaluate(([cx, cy]) => demo.move(cx, cy), [x, y]);
    await p.mouse.move(x, y, { steps: 20 });
    await wait(650);
  };
  const click = async (selector, button = 'left') => {
    const c = await centerOf(selector);
    await moveTo(c);
    await p.evaluate(() => demo.press());
    await p.mouse.click(c.x, c.y, { button });
  };
  const icon = n => `#app-icons > :nth-child(${n})`;

  await moveTo({ x: 600, y: 500 });
  await wait(900);
  await click(icon(1));                 // Open Claude
  await wait(2600);
  await click(icon(3));                 // Switch to ChatGPT
  await wait(1200);
  await click('#act-summarize');        // Summarize the GitHub page
  await wait(4200);
  await click(icon(2), 'right');        // Right-click menu
  await wait(1800);
  await p.keyboard.press('Escape');
  await wait(500);
  await click('#btn-settings');         // Settings
  await wait(2400);
  await click('#settings-close');
  await wait(700);
  await click('#btn-edit');             // Edit mode
  await wait(2200);
  await click('#btn-edit');
  await wait(700);
  await click('#btn-add');              // Add an app
  await wait(500);
  await p.keyboard.type('GitHub', { delay: 90 });
  await click('#modal-url');
  await p.keyboard.type('github.com', { delay: 90 });
  await wait(400);
  await click('#modal-save');
  await wait(1200);
  await moveTo(await centerOf(icon(7)));  // Hover the new app
  await wait(1600);
  await p.evaluate(() => demo.end());   // Title card
  await wait(3000);

  const video = p.video();
  await ctx.close();
  await video.saveAs(root + '/docs/store/omnibar-demo.webm');
  return 'saved docs/store/omnibar-demo.webm';
}
