/* 所有偏好仅在本浏览器中保存。页面不会请求搜索建议或上传关键词。 */
const ENGINES = Object.freeze({
  baidu: { name: '百度', url: 'https://www.baidu.com/s', key: 'wd' },
  bing: { name: '必应', url: 'https://www.bing.com/search', key: 'q' },
  google: { name: 'Google', url: 'https://www.google.com/search', key: 'q' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/', key: 'q' }
});
const DEFAULT_SITES = [
  { name: 'GitHub', url: 'https://github.com', badge: 'G' },
  { name: '哔哩哔哩', url: 'https://www.bilibili.com', badge: '哔' },
  { name: '知乎', url: 'https://www.zhihu.com', badge: '知' },
  { name: '小红书', url: 'https://www.xiaohongshu.com', badge: '红' },
  { name: '网易云音乐', url: 'https://music.163.com', badge: '云' },
  { name: '豆瓣', url: 'https://www.douban.com', badge: '豆' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', badge: 'C' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', badge: 'D' }
];
const SITE_ICONS = Object.freeze({
  'github.com': 'github.ico', 'bilibili.com': 'bilibili.ico',
  'zhihu.com': 'zhihu.ico', 'xiaohongshu.com': 'xiaohongshu.ico',
  'music.163.com': 'netease.ico', 'douban.com': 'douban.ico',
  'chatgpt.com': 'chatgpt.ico', 'chat.deepseek.com': 'deepseek.svg'
});
const $ = (selector) => document.querySelector(selector);
function read(key, fallback) {
  try { const v = localStorage.getItem('yql.' + key); return v === null ? fallback : JSON.parse(v); }
  catch { return fallback; }
}
let noticeTimer;
function notify(message) {
  $('#notice').textContent = message; $('#notice').hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 4000);
}
function save(key, value) {
  try { localStorage.setItem('yql.' + key, JSON.stringify(value)); $('#settings-status').textContent = '已自动保存'; }
  catch { $('#settings-status').textContent = '当前会话有效，无法保存'; notify('浏览器暂时无法保存设置，本次会话仍可使用。'); }
}
function websiteUrl(value) {
  const text = value.trim();
  if (!text || /\s/.test(text)) return null;
  let url;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text); }
  catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (!url.hostname.includes('.') && url.hostname !== 'localhost' && !url.hostname.startsWith('[')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text) && !/^[^/:]+:\d+(?:\/|$)/.test(text)) return null;
  return url;
}
function destination(value, engine) {
  const text = value.trim();
  if (!text) return null;
  if (/^(javascript|data|file|vbscript):/i.test(text)) throw new Error('仅支持 http 或 https 网站地址。');
  const direct = websiteUrl(text);
  if (direct) return { url: direct.href, direct: true };
  const provider = ENGINES[engine] || ENGINES.baidu;
  const target = new URL(provider.url); target.searchParams.set(provider.key, text);
  return { url: target.href, direct: false };
}
let selectedEngine = read('engine', 'baidu');
if (!Object.hasOwn(ENGINES, selectedEngine)) selectedEngine = 'baidu';
document.querySelectorAll('[name=engine]').forEach(input => {
  input.checked = input.value === selectedEngine;
  input.addEventListener('change', () => setEngine(input.value));
});
function setEngine(value) {
  selectedEngine = value;
  document.querySelectorAll('[name=engine]').forEach(input => { input.checked = input.value === value; });
  $('#setting-engine').value = value;
  save('engine', value); updateSearchHint(); moveEngineIndicator();
}
function moveEngineIndicator() {
  const label = $('[name=engine]:checked').parentElement;
  const indicator = $('.engine-indicator');
  indicator.style.width = label.offsetWidth + 'px';
  indicator.style.height = label.offsetHeight + 'px';
  indicator.style.transform = `translate(${label.offsetLeft}px, ${label.offsetTop}px)`;
  $('.engines').classList.add('has-indicator');
}
new ResizeObserver(moveEngineIndicator).observe($('.engines'));
document.fonts.ready.then(moveEngineIndicator);
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let themePreference = read('theme', 'light');
if (!['light','dark','system'].includes(themePreference)) themePreference = 'light';
let theme = themePreference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : themePreference;
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'light' ? '切换到深色模式' : '切换到浅色模式';
  $('#theme-toggle').setAttribute('aria-label', label); $('#theme-toggle').title = label;
  $('#theme-toggle use').setAttribute('href', theme === 'light' ? '#i-moon' : '#i-sun');
  $('meta[name=theme-color]').content = theme === 'light' ? '#f7f8fa' : '#161c1b';
}
applyTheme();
function setThemePreference(value) {
  themePreference = value;
  theme = value === 'system' ? (systemTheme.matches ? 'dark' : 'light') : value;
  $('#setting-theme').value = value; applyTheme(); save('theme', value);
}
systemTheme.addEventListener('change', () => { if (themePreference === 'system') { theme = systemTheme.matches ? 'dark' : 'light'; applyTheme(); } });
$('#theme-toggle').addEventListener('click', () => setThemePreference(theme === 'light' ? 'dark' : 'light'));
let newTab = read('newTab', false) === true;
let motionEnabled = read('motion', true) !== false;
document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
function updateSearchHint() {
  let direct = false;
  try { direct = !!destination($('#query').value, selectedEngine)?.direct; } catch {}
  $('.search-submit').setAttribute('aria-label', direct ? '前往网站' : '使用' + ENGINES[selectedEngine].name + '搜索');
  $('.search-submit use').setAttribute('href', direct ? '#i-out' : '#i-arrow');
  $('#search-error').hidden = true;
}
$('#query').addEventListener('input', updateSearchHint);
updateSearchHint();
$('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  try { const target = destination($('#query').value, selectedEngine); if (target) { if (newTab) window.open(target.url, '_blank', 'noopener,noreferrer'); else window.location.assign(target.url); } }
  catch (error) { $('#search-error').textContent = error.message; $('#search-error').hidden = false; }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !$('#settings-dialog').open && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); $('#query').focus(); }
  if (event.key === 'Escape' && document.activeElement === $('#query')) $('#query').blur();
});
let sites = read('sites', DEFAULT_SITES);
if (!Array.isArray(sites)) sites = DEFAULT_SITES;
sites = sites.filter(site => site && typeof site.name === 'string' && typeof site.url === 'string' && websiteUrl(site.url));
function renderSites() {
  $('#shortcuts').replaceChildren();
  $('#shortcut-count').textContent = sites.length;
  $('#empty-state').hidden = sites.length > 0;
  sites.forEach((site, index) => {
    const wrap = document.createElement('div'); wrap.className = 'shortcut';
    const link = document.createElement('a'); link.className = 'shortcut-link'; link.href = websiteUrl(site.url).href;
    if (newTab) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    const badge = document.createElement('span'); badge.className = 'site-badge'; badge.setAttribute('aria-hidden', 'true');
    const fallback = document.createElement('span'); fallback.textContent = typeof site.badge === 'string' ? site.badge.slice(0,2) : Array.from(site.name.trim())[0] || '站';
    const icon = document.createElement('img'); icon.className = 'site-favicon'; icon.alt = ''; icon.width = 26; icon.height = 26; icon.referrerPolicy = 'no-referrer';
    icon.addEventListener('load', () => { fallback.hidden = true; icon.classList.add('loaded'); });
    icon.addEventListener('error', () => { icon.remove(); });
    const target = new URL(link.href);
    const bundled = SITE_ICONS[target.hostname.replace(/^www\./, '')];
    icon.src = bundled ? './icons/' + bundled : new URL('/favicon.ico', target.origin).href;
    badge.append(fallback, icon);
    const copy = document.createElement('span'); copy.className = 'site-copy';
    const name = document.createElement('span'); name.className = 'site-name'; name.textContent = site.name; name.title = site.name;
    const domain = document.createElement('span'); domain.className = 'site-domain'; domain.textContent = new URL(link.href).hostname.replace(/^www\./, '');
    copy.append(name, domain); link.append(badge, copy); wrap.append(link);
    $('#shortcuts').append(wrap);
  });
}
renderSites();
let editingSite = null;
function resetSiteForm() {
  editingSite = null; $('#add-form').reset(); $('#add-error').hidden = true;
  $('#form-title').textContent = '添加网站'; $('#add-form [type=submit]').textContent = '添加网站'; $('#cancel-edit').hidden = true;
}
function persistSites() { save('sites', sites); renderSites(); renderSiteManager(); }
function renderSiteManager() {
  $('#site-manager').replaceChildren(); $('#manage-count').textContent = sites.length + ' 个'; $('#manager-empty').hidden = sites.length > 0;
  sites.forEach((site, index) => {
    const row = document.createElement('div'); row.className = 'manager-row';
    const copy = document.createElement('div'); copy.className = 'manager-copy';
    const name = document.createElement('strong'); name.textContent = site.name;
    const domain = document.createElement('small'); domain.textContent = websiteUrl(site.url).hostname;
    copy.append(name, domain); row.append(copy);
    const actions = document.createElement('div'); actions.className = 'manager-actions';
    const specs = [
      ['edit', '编辑', 'i-edit', false], ['up', '上移', 'i-up', index === 0],
      ['down', '下移', 'i-down', index === sites.length - 1], ['remove', '删除', 'i-close', false]
    ];
    specs.forEach(([action, text, icon, disabled]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'manager-action'; button.dataset.action = action;
      button.disabled = disabled; button.title = text + site.name; button.setAttribute('aria-label', text + site.name);
      button.innerHTML = `<svg aria-hidden="true"><use href="#${icon}"/></svg>`;
      button.addEventListener('click', () => {
        if (action === 'edit') {
          editingSite = index; $('#site-name').value = site.name; $('#site-url').value = site.url;
          $('#form-title').textContent = '编辑网站'; $('#add-form [type=submit]').textContent = '保存修改'; $('#cancel-edit').hidden = false;
          $('#add-error').hidden = true; $('#add-panel').open = true; $('#site-name').focus(); return;
        }
        resetSiteForm();
        if (action === 'remove') { sites.splice(index, 1); notify('已移除' + site.name); }
        else { const other = index + (action === 'up' ? -1 : 1); [sites[index], sites[other]] = [sites[other], sites[index]]; }
        persistSites();
        const focusIndex = action === 'remove' ? Math.min(index, sites.length - 1) : index + (action === 'up' ? -1 : 1);
        const focusRow = $('#site-manager').children[focusIndex];
        const nextButton = focusRow?.querySelector(`[data-action=${action}]:not(:disabled)`) || focusRow?.querySelector('button:not(:disabled)');
        (nextButton || $('#add-panel summary')).focus();
      }); actions.append(button);
    }); row.append(actions); $('#site-manager').append(row);
  });
}
function openSettings(section) {
  $('#setting-theme').value = themePreference; $('#setting-engine').value = selectedEngine;
  $('#setting-newtab').checked = newTab; $('#setting-motion').checked = motionEnabled; renderSiteManager();
  $('#settings-dialog').showModal(); document.body.classList.add('settings-visible');
  if (section === 'add') { resetSiteForm(); $('#add-panel').open = true; $('#site-name').focus(); }
  if (section === 'sites') $('#manage-sites').scrollIntoView({block:'start'});
}
$('#settings-open').addEventListener('click', () => openSettings());
$('#add-shortcut').addEventListener('click', () => openSettings('add'));
$('#edit-toggle').addEventListener('click', () => openSettings('sites'));
$('#settings-close').addEventListener('click', () => $('#settings-dialog').close());
$('#settings-done').addEventListener('click', () => $('#settings-dialog').close());
$('#settings-dialog').addEventListener('close', () => { document.body.classList.remove('settings-visible'); });
$('#settings-dialog').addEventListener('click', event => { if (event.target === $('#settings-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
$('#setting-theme').addEventListener('change', event => setThemePreference(event.target.value));
$('#setting-engine').addEventListener('change', event => setEngine(event.target.value));
$('#setting-newtab').addEventListener('change', event => { newTab = event.target.checked; save('newTab', newTab); renderSites(); });
$('#setting-motion').addEventListener('change', event => { motionEnabled = event.target.checked; document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off'; save('motion', motionEnabled); });
$('#cancel-edit').addEventListener('click', resetSiteForm);
$('#add-form').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#site-name').value.trim(); const url = websiteUrl($('#site-url').value);
  let error = !name ? '请输入网站名称。' : !url ? '请输入有效的网址，例如 example.com；仅支持 http 或 https。' : sites.some((site, index) => index !== editingSite && websiteUrl(site.url).href === url.href) ? '这个网址已经在快捷入口中了。' : '';
  $('#add-error').hidden = !error; $('#add-error').textContent = error;
  if (error) return;
  const wasEditing = editingSite !== null;
  if (wasEditing) sites[editingSite] = { name, url: url.href }; else sites.push({ name, url: url.href });
  persistSites(); resetSiteForm(); $('#add-panel').open = false; $('#add-panel summary').focus(); notify((wasEditing ? '已更新' : '已添加') + name);
});
$('#add-panel').addEventListener('toggle', () => { if ($('#add-panel').open) $('#site-name').focus(); });
function updateDate() {
  const now = new Date(); $('#date').textContent = new Intl.DateTimeFormat('zh-CN', { month:'long',day:'numeric',weekday:'long' }).format(now);
  $('#clock').textContent = new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(now); $('#clock').dateTime = now.toISOString();
}
updateDate(); setInterval(updateDate, 30000);

// 图片以 Blob 保存在 IndexedDB，不占用收藏和偏好的 localStorage 空间。
function backgroundStorage(action, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('yql-background', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('背景存储暂时不可用'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('images', action === 'read' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('images');
      const operation = action === 'read' ? store.get('custom') : action === 'write' ? store.put(value, 'custom') : store.delete('custom');
      transaction.oncomplete = () => { db.close(); resolve(operation.result); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  });
}
let backgroundUrl = null;
let backgroundBusy = false;
function applyBackground(value) {
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  backgroundUrl = value ? URL.createObjectURL(value.blob) : null;
  $('#page-background').style.backgroundImage = backgroundUrl ? `url("${backgroundUrl}")` : '';
  document.body.classList.toggle('has-background', !!value);
  $('#background-preview').hidden = !value;
  if (value) { $('#background-thumbnail').src = backgroundUrl; $('#background-name').textContent = value.name; }
  else { $('#background-thumbnail').removeAttribute('src'); $('#background-name').textContent = ''; }
  $('#background-reset').disabled = !value;
}
function setBackgroundBusy(busy) {
  backgroundBusy = busy;
  $('#background-choose').disabled = busy;
  $('#background-reset').disabled = busy || !backgroundUrl;
  $('#background-choose').textContent = busy ? '正在处理…' : '选择图片';
}
$('#background-choose').addEventListener('click', () => $('#background-file').click());
$('#background-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file || backgroundBusy) return;
  if (!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(file.type)) { $('#background-message').textContent = '请选择 JPG、PNG、WebP、AVIF 或 GIF 图片。'; return; }
  if (file.size > 20 * 1024 * 1024) { $('#background-message').textContent = '图片超过 20 MB，请选择较小的图片。'; return; }
  setBackgroundBusy(true); $('#background-message').textContent = '正在读取并保存背景…';
  let sourceUrl;
  try {
    sourceUrl = URL.createObjectURL(file);
    const image = new Image(); image.src = sourceUrl; await image.decode();
    const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('图片无法处理');
    const value = { blob, name: file.name }; await backgroundStorage('write', value); applyBackground(value);
    $('#background-message').textContent = '背景已保存。图片会居中铺满，GIF 会转为静态背景。'; $('#settings-status').textContent = '背景已保存';
  } catch { $('#background-message').textContent = '未能保存背景。请换一张有效图片，并确认浏览器允许网站存储。'; }
  finally { if (sourceUrl) URL.revokeObjectURL(sourceUrl); setBackgroundBusy(false); }
});
$('#background-reset').addEventListener('click', async () => {
  if (backgroundBusy) return; setBackgroundBusy(true);
  try { await backgroundStorage('delete'); applyBackground(null); $('#background-message').textContent = '已恢复默认背景。'; $('#settings-status').textContent = '已自动保存'; }
  catch { $('#background-message').textContent = '未能恢复默认背景，请检查浏览器的网站存储权限后重试。'; }
  finally { setBackgroundBusy(false); }
});
setBackgroundBusy(true);
backgroundStorage('read').then(value => { if (value && value.blob instanceof Blob) applyBackground(value); }).catch(() => { $('#background-message').textContent = '此浏览器暂时无法读取背景存储；其他功能可正常使用。'; }).finally(() => setBackgroundBusy(false));
