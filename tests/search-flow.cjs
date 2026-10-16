// 启动本地预览后运行；可用 PLAYWRIGHT_MODULE、BROWSER_PATH、SITE_URL 指定测试环境。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1382, height: 956 } });
  const errors = [], requested = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://v1.hitokoto.cn/**', route => route.fulfill({ json: { hitokoto: '每一次出发，都有新的可能。', from: '测试' } }));
  await page.route('https://uapis.cn/**', route => route.fulfill({ json: { list: Array.from({ length: 15 }, (_, i) => ({ title: '热点 ' + (i + 1), url: 'https://www.douyin.com/hot' })) } }));
  await page.route(/^https:\/\/(?:api\.bing\.com|suggestion\.baidu\.com|suggestqueries\.google\.com|duckduckgo\.com)\//, async route => {
    const url = new URL(route.request().url()), query = (url.searchParams.get('query') || url.searchParams.get('wd') || url.searchParams.get('q')), callback = (url.searchParams.get('JsonCallback') || url.searchParams.get('cb') || url.searchParams.get('callback')); requested.push(query);
    if (query === '断网') { await route.abort(); return; }
    await new Promise(resolve => setTimeout(resolve, query === '旧词' ? 450 : 20));
    const data = JSON.stringify([query, [query + '推荐', query + '介绍', '<img src=x onerror=alert(1)>']]);
    try { await route.fulfill(callback ? { contentType: 'text/javascript; charset=utf-8', body: callback + '(' + data + ');' } : { contentType: 'application/json', body: data }); } catch {}
  });
  await page.context().route('https://www.baidu.com/s?*', route => route.fulfill({ contentType: 'text/html', body: '<title>Search destination</title>search' }));
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.locator('#settings-open').click(); await page.locator('#settings-tab-search').click(); await page.locator('#setting-newtab').check(); await page.locator('#settings-close').click(); await page.waitForTimeout(260);
  await page.locator('#query').focus(); assert((await page.locator('#search-assist').innerText()).includes('暂无搜索记录')); assert.equal(requested.length, 0);
  await page.locator('#query').fill('天气'); await page.waitForFunction(() => document.querySelector('.assist-choice')?.textContent.includes('天气推荐'));
  assert.equal(await page.locator('#search-assist img').count(), 0); await page.keyboard.press('ArrowDown');
  const popupReady = page.waitForEvent('popup'); await page.keyboard.press('Enter'); const popup = await popupReady; await popup.waitForLoadState();
  assert.equal(new URL(popup.url()).searchParams.get('wd'), '天气推荐'); await popup.close(); await page.bringToFront(); assert.equal(await page.locator('#query').evaluate(e => e === document.activeElement), false); assert.equal(await page.locator('body').evaluate(e => e.classList.contains('search-focused')), false); assert.equal(await page.locator('#search-assist').isVisible(), false);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yql.searchHistory'))[0].query), '天气推荐');
  await page.reload({ waitUntil: 'networkidle' }); await page.locator('#query').focus(); assert((await page.locator('.assist-choice').first().innerText()).includes('天气推荐'));
  await page.locator('.assist-remove').first().click(); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yql.searchHistory')).length), 0);
  await page.evaluate(() => { for (let i = 0; i < 35; i++) QidianSearch.record('历史 ' + i); QidianSearch.record('重复'); QidianSearch.record('重复'); });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yql.searchHistory')).length), 30);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yql.searchHistory')).filter(item => item.query === '重复').length), 1);
  await page.locator('#query').fill('旧词'); await page.waitForTimeout(280); await page.locator('#query').fill('新词'); await page.waitForTimeout(750); assert((await page.locator('#search-assist').innerText()).includes('新词推荐')); assert(!(await page.locator('#search-assist').innerText()).includes('旧词推荐'));
  await page.locator('#query').fill('断网'); await page.waitForFunction(() => document.querySelector('#search-assist-status').textContent.includes('联想暂不可用'));
  const offlineReady = page.waitForEvent('popup'); await page.keyboard.press('Enter'); const offline = await offlineReady; await offline.waitForLoadState(); assert.equal(new URL(offline.url()).searchParams.get('wd'), '断网'); await offline.close(); await page.bringToFront();
  const count = requested.length; await page.locator('#query').fill('https://private.example/path?token=private'); await page.waitForTimeout(350); assert.equal(requested.length, count);
  await page.locator('#query').evaluate(input => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); input.value = '输入法'; input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true })); });
  await page.waitForTimeout(350); assert.equal(requested.length, count);
  await page.locator('#query').evaluate(input => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))); await page.waitForFunction(() => document.querySelector('.assist-choice')?.textContent.includes('输入法推荐'));
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#query').getAttribute('aria-expanded'), 'false'); assert(await page.locator('#query').evaluate(e => e === document.activeElement)); await page.keyboard.press('Escape');
  await page.locator('#settings-open').click(); await page.locator('#settings-tab-search').click(); await page.locator('#setting-suggestions').uncheck(); await page.locator('#setting-search-history').uncheck(); await page.locator('#settings-close').click(); await page.waitForTimeout(260);
  await page.locator('#query').fill(''); await page.locator('#query').focus(); assert.equal(await page.locator('#search-assist').isVisible(), false);
  const offCount = requested.length, historyBefore = await page.evaluate(() => localStorage.getItem('yql.searchHistory'));
  await page.locator('#query').fill('关闭记录测试'); await page.waitForTimeout(350); assert.equal(requested.length, offCount);
  const offPopupReady = page.waitForEvent('popup'); await page.keyboard.press('Enter'); const offPopup = await offPopupReady; await offPopup.waitForLoadState(); await offPopup.close(); assert.equal(await page.evaluate(() => localStorage.getItem('yql.searchHistory')), historyBefore);
  await page.locator('#settings-open').click(); await page.locator('#settings-tab-search').click(); await page.locator('#search-history-clear').click(); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('yql.searchHistory')).length), 0);
  await page.locator('#settings-tab-data').click(); const downloadReady = page.waitForEvent('download'); await page.locator('#preferences-export').click(); const download = await downloadReady; const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8')); assert.equal(exported.app, 'qidian'); assert.equal(exported.preferences.suggestions, false);
  await page.locator('#preferences-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"wrong"}') }); await page.waitForFunction(() => document.querySelector('#settings-status').textContent.includes('设置文件'));
  const importing = { app: 'qidian', version: 1, preferences: { engine: 'google', suggestions: false, sites: [{ name: '迁移示例', url: 'https://example.com/' }] } };
  await page.locator('#preferences-file').setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importing)) }); await page.waitForFunction(() => document.querySelector('.site-name')?.textContent === '迁移示例'); assert(await page.locator('[name=engine][value=google]').isChecked());
  await page.locator('#settings-open').click(); await page.locator('#settings-tab-search').click(); await page.locator('#setting-suggestions').check(); await page.locator('#settings-close').click(); await page.waitForTimeout(260);
  for (const width of [1382, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1000 ? 956 : 844 }); await page.locator('#query').fill('联想'); await page.waitForFunction(() => document.querySelector('.assist-choice')?.textContent.includes('联想推荐'));
    const bounds = await page.locator('#search-assist').boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= width); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/search-assist-' + width + '.png' });
  }
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.locator('#settings-open').click(); await page.locator('#settings-tab-search').click(); await page.locator('#setting-newtab').uncheck(); await page.locator('#setting-engine').selectOption('baidu'); await page.locator('#settings-close').click();
  await page.locator('#query').fill('当前页退出聚焦'); await page.keyboard.press('Enter'); await page.waitForURL('https://www.baidu.com/s?**'); await page.goBack(); await page.waitForSelector('#query'); assert.equal(await page.locator('#query').evaluate(e=>e===document.activeElement),false); assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('search-focused')),false);
  await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await page.locator('#search-assist').evaluate(e => e.getAnimations().length), 0); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, actualSearchNavigation: true, exitFocusAfterNewAndCurrentTabSearch: true, historyPersistenceDeletionAndLimit: true, suggestionsKeyboardAndStaleRequests: true, IMEAndURLPrivacy: true, disableAndClear: true, exportAndImport: true, desktopAndMobile: true, errors }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
