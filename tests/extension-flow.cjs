// 先 python scripts/build-extension.py；测试只使用新建的独立浏览器配置。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
(async () => {
  const extension = path.resolve(__dirname, '../browser-extension');
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json')));
  const id = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest().subarray(0, 16).toString('hex').replace(/[0-9a-f]/g, c => String.fromCharCode(97 + parseInt(c, 16)));
  const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'qidian-extension-test-')), {
    headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
    ignoreDefaultArgs: ['--disable-extensions'], args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension, '--enable-features=FileSystemAccessAPI']
  });
  const page = await context.newPage(), errors = [], csp = [], lookups = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/i.test(message.text())) csp.push(message.text()); });
  await context.route('https://v1.hitokoto.cn/**', route => route.fulfill({ json: { hitokoto: '每一次出发，都有新的可能。', from: '测试' } }));
  await context.route('https://uapis.cn/**', route => route.fulfill({ json: { list: Array.from({ length: 15 }, (_, i) => ({ title: '热点 ' + (i + 1), url: 'https://www.douyin.com/hot' })) } }));
  await context.route('https://api.bing.com/**', route => { const url = new URL(route.request().url()); lookups.push(url); return route.fulfill({ json: [url.searchParams.get('query'), ['天气预报', '天气地图']] }); });
  await context.route('https://www.baidu.com/s?*', route => route.fulfill({ contentType: 'text/html', body: '<title>Search destination</title>search' }));
  await page.goto('chrome://newtab', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#query'); assert.equal(page.url(), 'chrome-extension://' + id + '/index.html');
  assert.equal(await page.locator('script[src^="https:"]').count(), 0);
  await page.evaluate(() => chrome.bookmarks.create({ title: '扩展测试书签', url: 'https://example.com/' }));
  await page.locator('#settings-open').click(); await page.locator('#settings-tab-sites').click(); await page.locator('#bookmarks-connect').click();
  await page.waitForFunction(() => document.querySelector('#bookmarks-status').textContent.includes('已连接'));
  await page.locator('.bookmark-row').filter({ hasText: '扩展测试书签' }).locator('input').check(); await page.locator('#bookmarks-add').click();
  await page.locator('#settings-tab-search').click(); await page.locator('#setting-newtab').check(); await page.locator('#settings-close').click(); await page.waitForTimeout(260);
  assert.equal(await page.locator('.site-name').filter({ hasText: '扩展测试书签' }).count(), 1);
  await page.locator('#query').fill('天气'); await page.waitForFunction(() => document.querySelector('.assist-choice')?.textContent.includes('天气预报')); assert.equal(lookups.length, 1); assert.equal(lookups[0].searchParams.get('JsonCallback'), null);
  const popupReady = page.waitForEvent('popup'); await page.locator('.assist-choice').first().click(); const popup = await popupReady; await popup.waitForLoadState(); assert.equal(new URL(popup.url()).searchParams.get('wd'), '天气预报'); await popup.close(); await page.bringToFront();
  const image = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 180; const ctx = c.getContext('2d'); ctx.fillStyle = '#7b8a83'; ctx.fillRect(0, 0, 320, 180); return c.toDataURL().split(',')[1]; });
  await page.locator('#background-file').setInputFiles({ name: 'wallpaper.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }); await page.waitForFunction(() => document.body.classList.contains('has-background') && !document.querySelector('#background-choose').disabled);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => document.body.classList.contains('has-background')); await page.locator('#query').focus(); assert((await page.locator('.assist-choice').first().innerText()).includes('天气预报'));
  assert.equal(await page.locator('.site-name').filter({ hasText: '扩展测试书签' }).count(), 1);
  await page.waitForTimeout(300);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/extension-search-history.png' });
  const next = await context.newPage(); await next.goto('chrome://newtab', { waitUntil: 'domcontentloaded' }); await next.waitForSelector('#query'); assert(next.url().startsWith('chrome-extension://' + id)); await next.locator('#query').focus(); assert((await next.locator('.assist-choice').first().innerText()).includes('天气预报'));
  assert.deepEqual(errors, []); assert.deepEqual(csp, []);
  console.log(JSON.stringify({ passed: true, actualNewTabOverride: true, localCodeAndCSP: true, directBookmarksAndAdd: true, JSONSuggestionsAndSearchNavigation: true, settingsSitesHistoryWallpaperPersist: true, sharedAcrossNewTabs: true, errors, csp })); await context.close();
})().catch(error => { console.error(error); process.exit(1); });
