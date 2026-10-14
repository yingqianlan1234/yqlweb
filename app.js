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
  try { localStorage.setItem('yql.' + key, JSON.stringify(value)); }
  catch { notify('浏览器暂时无法保存设置，本次会话仍可使用。'); }
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
  input.addEventListener('change', () => { selectedEngine = input.value; save('engine', selectedEngine); updateSearchHint(); moveEngineIndicator(); });
});
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
let theme = read('theme', 'light') === 'dark' ? 'dark' : 'light';
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'light' ? '切换到深色模式' : '切换到浅色模式';
  $('#theme-toggle').setAttribute('aria-label', label); $('#theme-toggle').title = label;
  $('#theme-toggle use').setAttribute('href', theme === 'light' ? '#i-moon' : '#i-sun');
  $('meta[name=theme-color]').content = theme === 'light' ? '#f7f8fa' : '#161c1b';
}
applyTheme();
$('#theme-toggle').addEventListener('click', () => { theme = theme === 'light' ? 'dark' : 'light'; applyTheme(); save('theme', theme); });
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
  try { const target = destination($('#query').value, selectedEngine); if (target) window.location.assign(target.url); }
  catch (error) { $('#search-error').textContent = error.message; $('#search-error').hidden = false; }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); $('#query').focus(); }
  if (event.key === 'Escape' && document.activeElement === $('#query')) $('#query').blur();
});
let sites = read('sites', DEFAULT_SITES);
if (!Array.isArray(sites)) sites = DEFAULT_SITES;
sites = sites.filter(site => site && typeof site.name === 'string' && typeof site.url === 'string' && websiteUrl(site.url));
let editing = false;
function renderSites() {
  $('#shortcuts').replaceChildren(); $('#shortcuts').classList.toggle('editing', editing);
  $('#shortcut-count').textContent = sites.length;
  $('#empty-state').hidden = sites.length > 0;
  sites.forEach((site, index) => {
    const wrap = document.createElement('div'); wrap.className = 'shortcut';
    const link = document.createElement('a'); link.className = 'shortcut-link'; link.href = websiteUrl(site.url).href;
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
    if (editing) {
      const remove = document.createElement('button'); remove.className = 'remove-site'; remove.type = 'button'; remove.setAttribute('aria-label', '删除' + site.name);
      remove.innerHTML = '<svg aria-hidden="true"><use href="#i-close"/></svg>';
      remove.addEventListener('click', () => {
        sites.splice(index, 1); save('sites', sites); renderSites(); notify('已移除' + site.name);
        const buttons = document.querySelectorAll('.remove-site'); (buttons[Math.min(index,buttons.length-1)] || $('#edit-toggle')).focus();
      }); wrap.append(remove);
    }
    $('#shortcuts').append(wrap);
  });
}
renderSites();
$('#edit-toggle').addEventListener('click', () => { editing = !editing; $('#edit-toggle').setAttribute('aria-pressed', String(editing)); $('#edit-toggle span').textContent = editing ? '完成' : '编辑'; renderSites(); });
$('#add-form').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#site-name').value.trim(); const url = websiteUrl($('#site-url').value);
  let error = !name ? '请输入网站名称。' : !url ? '请输入有效的网址，例如 example.com；仅支持 http 或 https。' : sites.some(site => websiteUrl(site.url).href === url.href) ? '这个网址已经在快捷入口中了。' : '';
  $('#add-error').hidden = !error; $('#add-error').textContent = error;
  if (error) return;
  sites.push({ name, url: url.href }); save('sites', sites); renderSites(); $('#add-form').reset(); $('#add-panel').open = false; $('#add-panel summary').focus(); notify('已添加' + name);
});
$('#add-panel').addEventListener('toggle', () => { if ($('#add-panel').open) $('#site-name').focus(); });
function updateDate() {
  const now = new Date(); $('#date').textContent = new Intl.DateTimeFormat('zh-CN', { month:'long',day:'numeric',weekday:'long' }).format(now);
  $('#clock').textContent = new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(now); $('#clock').dateTime = now.toISOString();
}
updateDate(); setInterval(updateDate, 30000);
