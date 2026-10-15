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
let searchFocused = false;
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
let glassBlur = read('glassBlur', null);
if (!Number.isFinite(glassBlur) || glassBlur < 0 || glassBlur > 40) glassBlur = null;
let glassTransparency = read('glassTransparency', null);
if (!Number.isFinite(glassTransparency) || glassTransparency < 0 || glassTransparency > 50) glassTransparency = null;
let accentColor = read('accentColor', null);
if (typeof accentColor !== 'string' || !/^#[\da-f]{6}$/i.test(accentColor)) accentColor = null;
const smallGlassScreen = matchMedia('(max-width:600px)');
function colorLuminance(rgb) {
  const values = rgb.map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
function colorContrast(a, b) {
  const values = [colorLuminance(a), colorLuminance(b)].sort((x, y) => x - y);
  return (values[1] + .05) / (values[0] + .05);
}
function applyAppearance() {
  const dark = theme === 'dark';
  const transparency = Math.min(glassTransparency ?? (dark ? 36 : 46), dark ? 42 : 50);
  const blur = glassBlur ?? (smallGlassScreen.matches ? 4 : 6);
  const style = document.documentElement.style;
  if (glassBlur === null) style.removeProperty('--glass-blur'); else style.setProperty('--glass-blur', blur + 'px');
  style.setProperty('--glass-opacity', 1 - transparency / 100);
  const clarity = Math.max(0, (transparency - (dark ? 24 : 36)) / (dark ? 18 : 14));
  const tint = dark ? [18, 26, 33].map(v => Math.round(v * (1 - clarity))) : [247, 248, 250];
  const foreground = (dark ? [242, 247, 250] : [28, 43, 54]).map(v => Math.round(v + ((dark ? 255 : 0) - v) * clarity));
  const muted = (dark ? [222, 232, 240] : [38, 56, 71]).map(v => Math.round(v + ((dark ? 255 : 0) - v) * clarity));
  const glintA = dark ? .08 - clarity * .04 : .32;
  const glintB = dark ? .04 - clarity * .02 : .12;
  style.setProperty('--glass-tint', tint.join(' ')); style.setProperty('--glass-fg', `rgb(${foreground.join(' ')})`); style.setProperty('--glass-muted', `rgb(${muted.join(' ')})`);
  style.setProperty('--glass-glint-a', glintA); style.setProperty('--glass-glint-b', glintB);
  $('#setting-glass-blur').value = blur; $('#glass-blur-value').value = blur + ' px';
  $('#setting-glass-transparency').max = dark ? 42 : 50;
  $('#setting-glass-transparency').value = transparency; $('#glass-transparency-value').value = transparency + '%';
  $('#setting-accent-color').value = accentColor || (dark ? '#acccf5' : '#365f91');
  for (const key of ['--accent', '--custom-accent', '--accent-text', '--accent-ink', '--soft']) style.removeProperty(key);
  const chosenAccent = accentColor || (dark ? '#acccf5' : '#365f91');
  const rgb = chosenAccent.slice(1).match(/../g).map(value => parseInt(value, 16));
  const text = colorContrast(rgb, [0, 0, 0]) > colorContrast(rgb, [255, 255, 255]) ? '#000000' : '#ffffff';
  const alpha = 1 - transparency / 100;
  // 以任意壁纸下最不利的玻璃底色计算文字用色；按钮保留用户选择的原色。
  const glint = 1 - (1 - glintA) * (1 - glintB);
  const glassBase = dark ? tint.map(v => (v * alpha + 255 * (1 - alpha)) * (1 - glint) + 255 * glint) : tint.map(v => v * alpha);
  const base = dark ? [22, 28, 27] : [247, 248, 250];
  const soft = accentColor ? base.map((v, i) => Math.round(v * .84 + rgb[i] * .16)) : dark ? [41, 59, 80] : [231, 238, 248];
  let ink = rgb;
  for (let amount = 1; Math.min(...[glassBase, base, soft].map(bg => colorContrast(ink, bg))) < 4.6 && amount <= 100; amount++) ink = rgb.map(v => Math.round(v + ((dark ? 255 : 0) - v) * amount / 100));
  style.setProperty('--accent-ink', `rgb(${ink.join(' ')})`);
  if (accentColor) {
    style.setProperty('--accent', accentColor); style.setProperty('--custom-accent', accentColor);
    style.setProperty('--accent-text', text); style.setProperty('--soft', `rgb(${soft.join(' ')})`);
  }
  document.dispatchEvent(new Event('appearancechange'));
}
$('#setting-glass-blur').addEventListener('input', event => { glassBlur = Number(event.target.value); applyAppearance(); save('glassBlur', glassBlur); });
$('#setting-glass-transparency').addEventListener('input', event => { glassTransparency = Number(event.target.value); applyAppearance(); save('glassTransparency', glassTransparency); });
$('#setting-accent-color').addEventListener('input', event => { accentColor = event.target.value; applyAppearance(); save('accentColor', accentColor); });
$('#appearance-reset').addEventListener('click', () => {
  glassBlur = null; glassTransparency = null; accentColor = null; applyAppearance();
  save('glassBlur', null); save('glassTransparency', null); save('accentColor', null);
});
smallGlassScreen.addEventListener('change', applyAppearance);
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
  moveSelectionIndicator($('.engines'), label, $('.engines .engine-indicator'));
}
function moveSelectionIndicator(group, label, indicator) {
  indicator.style.width = label.offsetWidth + 'px';
  indicator.style.height = label.offsetHeight + 'px';
  indicator.style.transform = `translate(${label.offsetLeft}px, ${label.offsetTop}px)`;
  group.classList.add('has-indicator');
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
  applyAppearance();
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
const searchBox = $('.search-box');
function setSearchFocused(value) {
  if (value === searchFocused) return;
  searchFocused = value; document.body.classList.toggle('search-focused', value); syncBackgroundPlayback();
}
searchBox.addEventListener('focusin', () => setSearchFocused(true));
searchBox.addEventListener('focusout', () => queueMicrotask(() => { if (!searchBox.contains(document.activeElement)) setSearchFocused(false); }));
document.addEventListener('pointerdown', event => { if (searchFocused && !searchBox.contains(event.target)) document.activeElement.blur(); });
updateSearchHint();
$('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  try { const target = destination($('#query').value, selectedEngine); if (target) { if (newTab) window.open(target.url, '_blank', 'noopener,noreferrer'); else window.location.assign(target.url); } }
  catch (error) { $('#search-error').textContent = error.message; $('#search-error').hidden = false; }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !$('#settings-dialog').open && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); $('#query').focus(); }
  if (event.key === 'Escape' && searchFocused) document.activeElement.blur();
});
let sites = read('sites', DEFAULT_SITES);
if (!Array.isArray(sites)) sites = DEFAULT_SITES;
sites = sites.filter(site => site && typeof site.name === 'string' && typeof site.url === 'string' && websiteUrl(site.url));
const SITES_PER_PAGE = 10;
let sitesPage = 0;
let shortcutDrag = null;
function renderSites() {
  const displayed = shortcutDrag?.active ? shortcutDrag.order : sites;
  const pageCount = Math.max(1, Math.ceil(displayed.length / SITES_PER_PAGE));
  sitesPage = Math.min(Math.max(0, sitesPage), pageCount - 1);
  $('#sites-prev').disabled = sitesPage === 0;
  $('#sites-next').disabled = sitesPage === pageCount - 1;
  $('#sites-page').textContent = `${sitesPage + 1} / ${pageCount}`;
  $('#shortcuts').replaceChildren();
  $('#shortcut-count').textContent = sites.length;
  $('#empty-state').hidden = sites.length > 0;
  displayed.slice(sitesPage * SITES_PER_PAGE, (sitesPage + 1) * SITES_PER_PAGE).forEach((site, offset) => {
    const index = sitesPage * SITES_PER_PAGE + offset;
    const wrap = document.createElement('div'); wrap.className = 'shortcut'; wrap.dataset.index = index;
    if (shortcutDrag?.active && site === shortcutDrag.site) wrap.classList.add('is-dragging');
    const link = document.createElement('a'); link.className = 'shortcut-link'; link.href = websiteUrl(site.url).href;
    link.draggable = false;
    if (newTab) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    const badge = document.createElement('span'); badge.className = 'site-badge'; badge.setAttribute('aria-hidden', 'true'); badge.title = '拖动图标排序；停在翻页按钮上可跨页，拖到下方移除';
    const fallback = document.createElement('span'); fallback.textContent = typeof site.badge === 'string' ? site.badge.slice(0,2) : Array.from(site.name.trim())[0] || '站';
    const icon = document.createElement('img'); icon.className = 'site-favicon'; icon.alt = ''; icon.width = 26; icon.height = 26; icon.referrerPolicy = 'no-referrer';
    icon.draggable = false;
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
function animateChange(element, frames, duration = 220) {
  if (!motionEnabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate(frames, { duration, easing: 'cubic-bezier(.16,1,.3,1)' });
}
let suppressShortcutClick = false;
const dropzone = $('#shortcut-dropzone');
function changeSitesPage(page) {
  if (shortcutDrag || suppressShortcutClick) return;
  sitesPage = page; renderSites(); animateChange($('#shortcuts'), [{ opacity: .4 }, { opacity: 1 }]);
}
$('#sites-prev').addEventListener('click', () => changeSitesPage(sitesPage - 1));
$('#sites-next').addEventListener('click', () => changeSitesPage(sitesPage + 1));
$('#shortcuts').addEventListener('pointerdown', event => {
  const badge = event.target.closest('.site-badge');
  if (!badge || event.button !== 0 || !event.isPrimary || shortcutDrag) return;
  const node = badge.closest('.shortcut');
  shortcutDrag = { id: event.pointerId, node, site: sites[Number(node.dataset.index)], originalPage: sitesPage, order: sites.slice(), x: event.clientX, y: event.clientY, active: false };
});
$('#shortcuts').addEventListener('click', event => { if (suppressShortcutClick) { event.preventDefault(); event.stopPropagation(); } }, true);
function clearDragPageTimer(drag) {
  clearTimeout(drag.pageTimer); drag.pageTimer = null;
  drag.pageButton?.classList.remove('drag-page-target'); drag.pageButton = null;
}
function hoverDragPage(drag, button) {
  if (drag.pageButton === button) return;
  clearDragPageTimer(drag);
  if (!button || button.disabled) return;
  drag.pageButton = button; button.classList.add('drag-page-target');
  drag.pageTimer = setTimeout(() => {
    if (shortcutDrag !== drag) return;
    const destinationPage = sitesPage + (button.id === 'sites-next' ? 1 : -1);
    const from = drag.order.indexOf(drag.site); drag.order.splice(from, 1);
    const destination = button.id === 'sites-next' ? destinationPage * SITES_PER_PAGE : (destinationPage + 1) * SITES_PER_PAGE - 1;
    drag.order.splice(Math.min(destination, drag.order.length), 0, drag.site);
    sitesPage = destinationPage; renderSites();
    drag.node = $('#shortcuts .is-dragging');
    // 每次停留只翻一页；移开按钮后才允许再次触发。
    drag.pageTimer = null;
  }, 550);
}
document.addEventListener('pointermove', event => {
  const drag = shortcutDrag;
  if (!drag || drag.id !== event.pointerId) return;
  if (!drag.active) {
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
    drag.active = true; suppressShortcutClick = true;
    const rect = drag.node.getBoundingClientRect();
    drag.offsetX = drag.x - rect.x; drag.offsetY = drag.y - rect.y;
    drag.ghost = drag.node.cloneNode(true); drag.ghost.className = 'shortcut drag-ghost'; drag.ghost.setAttribute('aria-hidden', 'true'); drag.ghost.inert = true;
    drag.ghost.style.width = rect.width + 'px'; document.body.append(drag.ghost);
    drag.node.classList.add('is-dragging'); document.body.classList.add('dragging-shortcut'); dropzone.hidden = false;
  }
  event.preventDefault();
  drag.ghost.style.transform = `translate(${event.clientX - drag.offsetX}px,${event.clientY - drag.offsetY}px)`;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  dropzone.classList.toggle('is-over', !!target?.closest('#shortcut-dropzone'));
  hoverDragPage(drag, target?.closest('#sites-prev,#sites-next'));
  const children = [...$('#shortcuts').children];
  // 命中固定格子，不使用正在移动的图标作为换位目标。
  const next = children.find(node => { const r = node.getBoundingClientRect(); return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom; });
  if (!next || next === drag.node) return;
  const before = new Map(children.map(node => [node, node.firstElementChild.getBoundingClientRect()]));
  if (children.indexOf(drag.node) < children.indexOf(next)) next.after(drag.node); else next.before(drag.node);
  const start = sitesPage * SITES_PER_PAGE;
  const ordered = [...$('#shortcuts').children].map(node => drag.order[Number(node.dataset.index)]);
  drag.order.splice(start, ordered.length, ...ordered);
  [...$('#shortcuts').children].forEach((node, index) => { node.dataset.index = start + index; });
  children.filter(node => node !== drag.node).forEach(node => {
    const old = before.get(node), rect = node.getBoundingClientRect();
    animateChange(node.firstElementChild, [{ transform: `translate(${old.x - rect.x}px,${old.y - rect.y}px)` }, { transform: 'none' }]);
  });
}, { passive: false });
function finishShortcutDrag(event, cancelled = false) {
  const drag = shortcutDrag;
  if (!drag || (event && event.pointerId !== drag.id)) return;
  shortcutDrag = null;
  if (!drag.active) return;
  clearDragPageTimer(drag);
  const remove = !cancelled && document.elementFromPoint(event.clientX, event.clientY)?.closest('#shortcut-dropzone');
  drag.ghost.remove(); dropzone.hidden = true; dropzone.classList.remove('is-over'); document.body.classList.remove('dragging-shortcut');
  if (!cancelled) {
    const removedIndex = sites.indexOf(drag.site);
    sites = remove ? drag.order.filter(site => site !== drag.site) : drag.order;
    persistSites();
    if (remove) {
      const removed = drag.site;
      notify('已移除' + removed.name);
      const undo = document.createElement('button'); undo.type = 'button'; undo.textContent = '撤销';
      undo.addEventListener('click', () => { sites.splice(Math.min(removedIndex, sites.length), 0, removed); sitesPage = Math.floor(removedIndex / SITES_PER_PAGE); persistSites(); notify('已恢复' + removed.name); }, { once: true });
      $('#notice').append(undo); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 7000);
    } else notify('排列顺序已保存');
  } else { sitesPage = drag.originalPage; renderSites(); }
  setTimeout(() => { suppressShortcutClick = false; }, 0);
}
document.addEventListener('pointerup', event => finishShortcutDrag(event));
document.addEventListener('pointercancel', event => finishShortcutDrag(event, true));
window.addEventListener('blur', () => finishShortcutDrag(null, true));
document.addEventListener('keydown', event => { if (event.key === 'Escape') finishShortcutDrag(null, true); });
let editingSite = null;
function resetSiteForm() {
  editingSite = null; $('#add-form').reset(); $('#add-error').hidden = true;
  $('#form-title').textContent = '添加网站'; $('#add-form [type=submit]').textContent = '添加网站'; $('#cancel-edit').hidden = true;
}
function persistSites() { save('sites', sites); renderSites(); renderSiteManager(); if (bookmarkEntries.length) renderBookmarks(); }
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
$('#setting-motion').addEventListener('change', event => { motionEnabled = event.target.checked; document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off'; save('motion', motionEnabled); syncBackgroundPlayback(); });
$('#cancel-edit').addEventListener('click', resetSiteForm);
$('#add-form').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#site-name').value.trim(); const url = websiteUrl($('#site-url').value);
  let error = !name ? '请输入网站名称。' : !url ? '请输入有效的网址，例如 example.com；仅支持 http 或 https。' : sites.some((site, index) => index !== editingSite && websiteUrl(site.url).href === url.href) ? '这个网址已经在快捷入口中了。' : '';
  $('#add-error').hidden = !error; $('#add-error').textContent = error;
  if (error) return;
  const wasEditing = editingSite !== null;
  if (wasEditing) sites[editingSite] = { name, url: url.href }; else sites.push({ name, url: url.href });
  sitesPage = Math.floor((wasEditing ? editingSite : sites.length - 1) / SITES_PER_PAGE);
  persistSites(); resetSiteForm(); $('#add-panel').open = false; $('#add-panel summary').focus(); notify((wasEditing ? '已更新' : '已添加') + name);
});
$('#add-panel').addEventListener('toggle', () => { if ($('#add-panel').open) $('#site-name').focus(); });
let bookmarksLinked = read('bookmarksConnected', false) === true;
let bookmarkEntries = [];
let bookmarkSelection = new Set();
let bookmarkRequest = null;
function filteredBookmarks() {
  const query = $('#bookmarks-search').value.trim().toLocaleLowerCase();
  return bookmarkEntries.filter(item => `${item.name} ${item.url} ${item.folder}`.toLocaleLowerCase().includes(query));
}
function updateBookmarkSelection() {
  $('#bookmarks-add').disabled = bookmarkSelection.size === 0;
  $('#bookmarks-add').textContent = bookmarkSelection.size ? `添加 ${bookmarkSelection.size} 个到快捷网站` : '添加到快捷网站';
  $('#bookmarks-count').textContent = `${filteredBookmarks().length} 个结果 · 已选 ${bookmarkSelection.size} 个`;
  const available = [...$('#bookmarks-list').querySelectorAll('input:not(:disabled)')];
  $('#bookmarks-select').disabled = available.length === 0;
  $('#bookmarks-select').textContent = available.length && available.every(input => input.checked) ? '取消选择当前结果' : '全选当前结果';
}
function renderBookmarks() {
  const list = $('#bookmarks-list'); list.replaceChildren();
  const existing = new Set(sites.map(site => websiteUrl(site.url).href));
  for (const entry of filteredBookmarks()) {
    const label = document.createElement('label'); label.className = 'bookmark-row';
    const input = document.createElement('input'); input.type = 'checkbox'; input.disabled = existing.has(entry.url); input.checked = bookmarkSelection.has(entry.url);
    input.addEventListener('change', () => { if (input.checked) bookmarkSelection.add(entry.url); else bookmarkSelection.delete(entry.url); updateBookmarkSelection(); });
    const copy = document.createElement('span'), name = document.createElement('strong'), detail = document.createElement('small');
    name.textContent = entry.name; detail.textContent = (input.disabled ? '已添加 · ' : '') + entry.folder + ' · ' + new URL(entry.url).hostname;
    label.title = entry.url; copy.append(name, detail); label.append(input, copy); list.append(label);
  }
  if (!list.children.length) { const empty = document.createElement('p'); empty.className = 'section-description'; empty.textContent = '没有匹配的书签。'; list.append(empty); }
  updateBookmarkSelection();
}
function requestBookmarks() {
  if (bookmarkRequest) return;
  const requestId = crypto.randomUUID();
  $('#bookmarks-connect').disabled = true; $('#bookmarks-status').textContent = '正在连接本地书签扩展…';
  const timer = setTimeout(() => {
    bookmarkRequest = null; $('#bookmarks-connect').disabled = false;
    $('#bookmarks-status').textContent = '未收到扩展响应。请先安装并启用配套扩展，再刷新本页重试。';
    $('.bookmarks-help').open = true;
  }, 4000);
  bookmarkRequest = { requestId, timer };
  window.postMessage({ channel: 'qidian-bookmarks-page', type: 'read', requestId }, location.origin);
}
window.addEventListener('message', event => {
  const message = event.data;
  if (event.source !== window || event.origin !== location.origin || message?.channel !== 'qidian-bookmarks-extension') return;
  if (message.type === 'changed') { if (bookmarksLinked) requestBookmarks(); return; }
  if (!bookmarkRequest || message.requestId !== bookmarkRequest.requestId || !['tree', 'error'].includes(message.type)) return;
  clearTimeout(bookmarkRequest.timer); bookmarkRequest = null; $('#bookmarks-connect').disabled = false;
  if (message.type === 'error' || !Array.isArray(message.tree)) { $('#bookmarks-status').textContent = '扩展无法读取书签，请检查扩展权限后重试。'; return; }
  const entries = [], seen = new Set(), pending = message.tree.map(node => ({ node, folder: '' }));
  while (pending.length) {
    const { node, folder } = pending.shift(); if (!node || typeof node !== 'object') continue;
    const name = typeof node.title === 'string' ? node.title.trim().slice(0, 200) : '';
    const url = typeof node.url === 'string' && /^https?:\/\//i.test(node.url) ? websiteUrl(node.url) : null;
    if (url && !seen.has(url.href)) { seen.add(url.href); entries.push({ name: name || url.hostname, url: url.href, folder: folder || '书签' }); }
    if (Array.isArray(node.children)) pending.unshift(...node.children.map(child => ({ node: child, folder: [folder, name].filter(Boolean).join(' / ').slice(0, 500) })));
  }
  bookmarkEntries = entries; bookmarkSelection = new Set([...bookmarkSelection].filter(url => seen.has(url)));
  bookmarksLinked = true; save('bookmarksConnected', true); $('#bookmarks-picker').hidden = false; $('#bookmarks-disconnect').hidden = false;
  $('#bookmarks-connect').textContent = '刷新书签'; $('#bookmarks-status').textContent = `已连接 · ${entries.length} 个网页书签，仅在本机读取`; renderBookmarks();
});
$('#bookmarks-connect').addEventListener('click', requestBookmarks);
$('#bookmarks-search').addEventListener('input', renderBookmarks);
$('#bookmarks-select').addEventListener('click', () => {
  const existing = new Set(sites.map(site => websiteUrl(site.url).href));
  const available = filteredBookmarks().filter(item => !existing.has(item.url));
  const allSelected = available.length > 0 && available.every(item => bookmarkSelection.has(item.url));
  available.forEach(item => { if (allSelected) bookmarkSelection.delete(item.url); else bookmarkSelection.add(item.url); }); renderBookmarks();
});
$('#bookmarks-add').addEventListener('click', () => {
  const existing = new Set(sites.map(site => websiteUrl(site.url).href));
  const selected = bookmarkEntries.filter(item => bookmarkSelection.has(item.url) && !existing.has(item.url));
  if (selected.length) sitesPage = Math.floor(sites.length / SITES_PER_PAGE);
  sites.push(...selected.map(({ name, url }) => ({ name, url }))); bookmarkSelection.clear(); persistSites(); renderBookmarks();
  $('#bookmarks-status').textContent = `已添加 ${selected.length} 个快捷网站，浏览器原书签保持不变。`;
});
$('#bookmarks-disconnect').addEventListener('click', () => {
  if (bookmarkRequest) { clearTimeout(bookmarkRequest.timer); bookmarkRequest = null; }
  bookmarksLinked = false; bookmarkEntries = []; bookmarkSelection.clear(); save('bookmarksConnected', false);
  window.postMessage({ channel: 'qidian-bookmarks-page', type: 'disconnect', requestId: crypto.randomUUID() }, location.origin);
  $('#bookmarks-list').replaceChildren(); $('#bookmarks-picker').hidden = true; $('#bookmarks-disconnect').hidden = true; $('#bookmarks-connect').disabled = false;
  $('#bookmarks-connect').textContent = '连接浏览器书签'; $('#bookmarks-status').textContent = '已断开连接，已添加的快捷网站继续保留。';
});
window.addEventListener('load', () => { if (bookmarksLinked) setTimeout(requestBookmarks, 250); });
const LOCAL_QUOTES = [
  '把今天留给值得的事，也留一点给自己。',
  '不必一次走很远，先把眼前这一步走好。',
  '窗外有风，心里也留一点空地。',
  '偶尔绕路，也会遇见新的风景。',
  '让好奇心先出发，答案会在路上。',
  '把纷杂留在页外，把注意力交给此刻。',
  '今天的进度，也可以是好好休息。',
  '有些灵感，藏在停下来的一分钟里。'
];
let quoteIndex = 0;
let quoteDate = '';
let dateTimer;
function updateDate() {
  const now = new Date();
  $('#date').textContent = new Intl.DateTimeFormat('zh-CN', { month:'long',day:'numeric' }).format(now);
  $('#date').dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  $('#weekday').textContent = new Intl.DateTimeFormat('zh-CN', { weekday:'long' }).format(now);
  $('#clock').textContent = new Intl.DateTimeFormat('zh-CN', { hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(now);
  $('#clock').dateTime = now.toISOString(); $('#clock').setAttribute('aria-label', '本地时间 ' + $('#clock').textContent);
  if (quoteDate !== $('#date').dateTime) {
    quoteDate = $('#date').dateTime;
    quoteIndex = (now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate()) % LOCAL_QUOTES.length;
    if (!$('#quote-text').dataset.online) $('#quote-text').textContent = LOCAL_QUOTES[quoteIndex];
  }
  clearTimeout(dateTimer); dateTimer = setTimeout(updateDate, 60000 - now.getSeconds() * 1000 - now.getMilliseconds() + 20);
}
updateDate();
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
async function fetchPublicJson(url) {
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('数据源暂不可用');
  return response.json();
}
async function loadOnlineQuote() {
  const button = $('#quote-next'); if (button.disabled) return;
  button.disabled = true; button.setAttribute('aria-busy', 'true'); const started = Date.now();
  try {
    const data = await fetchPublicJson('https://v1.hitokoto.cn/?max_length=60');
    if (typeof data.hitokoto !== 'string' || !data.hitokoto.trim() || data.hitokoto.length > 200) throw new Error('短句无效');
    $('#quote-text').textContent = data.hitokoto; $('#quote-text').dataset.online = 'true';
    const source = [data.from_who, data.from].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim().slice(0, 100));
    $('#quote-source').textContent = [...source, '一言'].join(' · ');
    $('#quote-source').href = typeof data.uuid === 'string' && /^[\da-f-]{36}$/i.test(data.uuid) ? 'https://hitokoto.cn/?uuid=' + data.uuid : 'https://hitokoto.cn/';
    $('#quote-source').target = '_blank'; $('#quote-source').rel = 'noopener noreferrer';
  } catch {
    quoteIndex = (quoteIndex + 1) % LOCAL_QUOTES.length;
    $('#quote-text').textContent = LOCAL_QUOTES[quoteIndex]; delete $('#quote-text').dataset.online;
    $('#quote-source').textContent = '栖点短句 · 联网暂不可用'; $('#quote-source').removeAttribute('href');
  } finally {
    animateChange($('.quote-copy'), [{ opacity: .3 }, { opacity: 1 }]);
    // 一言文档限制 2 QPS，避免快速连点触发上游限流。
    setTimeout(() => { button.disabled = false; button.removeAttribute('aria-busy'); }, Math.max(0, 600 - (Date.now() - started)));
  }
}
$('#quote-next').addEventListener('click', loadOnlineQuote);
loadOnlineQuote();

const HOT_SOURCES = {
  douyin: { name: '抖音', board: 'https://www.douyin.com/hot', host: 'douyin.com', search: 'https://www.douyin.com/search/' },
  baidu: { name: '百度', board: 'https://top.baidu.com/board?tab=realtime', host: 'baidu.com', search: 'https://www.baidu.com/s?wd=' },
  weibo: { name: '微博', board: 'https://s.weibo.com/top/summary?cate=realtimehot', host: 'weibo.com', search: 'https://s.weibo.com/weibo?q=' }
};
let hotSource = read('hotSource', 'douyin'); if (!Object.hasOwn(HOT_SOURCES, hotSource)) hotSource = 'douyin';
function moveHotIndicator() {
  moveSelectionIndicator($('.hot-sources'), $('[data-hot-source][aria-pressed=true]'), $('.hot-indicator'));
}
new ResizeObserver(moveHotIndicator).observe($('.hot-sources'));
document.fonts.ready.then(moveHotIndicator);
let hotItems = []; let hotPage = 0; let hotVersion = 0;
const hotPending = new Map();
function normalizeHot(source, data) {
  if (!Array.isArray(data.list)) throw new Error('榜单格式无效');
  return data.list.filter(item => item && typeof item.title === 'string' && item.title.trim()).slice(0, 10).map(item => {
    const title = item.title.trim().slice(0, 200); const provider = HOT_SOURCES[source]; const url = typeof item.url === 'string' ? websiteUrl(item.url) : null;
    const safe = url && (url.hostname === provider.host || url.hostname.endsWith('.' + provider.host));
    return { title, url: safe ? url.href : provider.search + encodeURIComponent(title) };
  });
}
function renderHot() {
  $('#hot-list').replaceChildren(); $('#hot-list').start = hotPage * 5 + 1;
  for (const [index, item] of hotItems.slice(hotPage * 5, hotPage * 5 + 5).entries()) {
    const row = document.createElement('li'); const link = document.createElement('a'); link.className = 'hot-link'; link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.title = item.title;
    const rank = document.createElement('span'); rank.className = 'hot-rank'; rank.textContent = hotPage * 5 + index + 1; rank.setAttribute('aria-hidden', 'true');
    const title = document.createElement('span'); title.className = 'hot-title'; title.textContent = item.title;
    link.append(rank, title); row.append(link); $('#hot-list').append(row);
  }
  $('#hot-prev').disabled = hotPage === 0; $('#hot-next').disabled = hotPage === 1 || hotItems.length <= 5;
  $('#hot-page').textContent = hotItems.length ? `${hotPage + 1} / ${Math.ceil(hotItems.length / 5)}` : '— / —';
  if (hotItems.length) animateChange($('#hot-list'), [{ opacity: .35, clipPath: 'inset(0 0 8% 0)' }, { opacity: 1, clipPath: 'inset(0)' }]);
}
async function loadHot(source, force = false) {
  const version = ++hotVersion; hotSource = source; hotPage = 0; hotItems = [];
  document.querySelectorAll('[data-hot-source]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hotSource === source)));
  moveHotIndicator();
  $('#hot-open').href = HOT_SOURCES[source].board; $('#hot-list').setAttribute('aria-label', HOT_SOURCES[source].name + '热点排行');
  $('#hot-updated').textContent = ''; $('#hot-status').textContent = '正在获取' + HOT_SOURCES[source].name + '热点…'; $('#hot-refresh').disabled = true;
  let cached;
  try { cached = JSON.parse(sessionStorage.getItem('yql.hot.' + source)); if (cached && Array.isArray(cached.data?.list)) { hotItems = normalizeHot(source, cached.data); } else cached = null; } catch { cached = null; }
  renderHot();
  try {
    const age = cached ? Date.now() - cached.at : Infinity;
    let data = cached && !force && age >= 0 && age < 300000 ? cached.data : null;
    if (!data) {
      if (!hotPending.has(source)) hotPending.set(source, fetchPublicJson('https://uapis.cn/api/v1/misc/hotboard?type=' + source).finally(() => hotPending.delete(source)));
      data = await hotPending.get(source);
      const items = normalizeHot(source, data); if (!items.length) throw new Error('榜单暂无内容');
      try { sessionStorage.setItem('yql.hot.' + source, JSON.stringify({ at: Date.now(), data: { list: items, update_time: data.update_time } })); } catch {}
    }
    if (version !== hotVersion) return;
    hotItems = normalizeHot(source, data); if (!hotItems.length) throw new Error('榜单暂无内容');
    const updated = new Date(data.update_time);
    $('#hot-updated').textContent = Number.isFinite(updated.getTime()) ? '更新于 ' + new Intl.DateTimeFormat('zh-CN', { month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(updated) : '';
    $('#hot-status').textContent = `前 ${hotItems.length} 条 · 每页 5 条`; renderHot();
  } catch {
    if (version !== hotVersion) return;
    $('#hot-status').textContent = hotItems.length ? '暂时无法刷新，显示上次获取的榜单' : '暂时无法获取，点击刷新重试或查看完整榜单'; renderHot();
  } finally { if (version === hotVersion) $('#hot-refresh').disabled = false; }
}
document.querySelectorAll('[data-hot-source]').forEach(button => button.addEventListener('click', () => { save('hotSource', button.dataset.hotSource); loadHot(button.dataset.hotSource); }));
$('#hot-refresh').addEventListener('click', () => loadHot(hotSource, true));
$('#hot-prev').addEventListener('click', () => { hotPage = 0; renderHot(); });
$('#hot-next').addEventListener('click', () => { hotPage = 1; renderHot(); });
loadHot(hotSource);

// 背景 Blob 和已授权的目录句柄保存在 IndexedDB，彼此使用独立键。
function backgroundStorage(action, value, key = 'custom') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('yql-background', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('背景存储暂时不可用'));
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction('images', action === 'read' ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('images');
        const operation = action === 'read' ? store.get(key) : action === 'write' ? store.put(value, key) : store.delete(key);
        transaction.oncomplete = () => { db.close(); resolve(operation.result); };
        transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
      } catch (error) { db.close(); reject(error); }
    };
  });
}
let backgroundUrl = null;
let backgroundPreviewUrl = null;
let backgroundBusy = false;
let libraryScanBusy = false;
let libraryDirectoryBusy = false;
let currentLibraryPath = '';
let backgroundVideoActive = false;
let backgroundWindowFocused = document.hasFocus();
let backgroundResumeTime = 0;
let backgroundMediaVersion = 0;
let backgroundRestorePending = false;
let backgroundFit = read('backgroundFit', 'cover');
if (!['contain', 'cover'].includes(backgroundFit)) backgroundFit = 'cover';
function applyBackgroundFit() {
  document.documentElement.style.setProperty('--background-fit', backgroundFit);
  $('#setting-background-fit').value = backgroundFit;
}
applyBackgroundFit();
$('#setting-background-fit').addEventListener('change', event => {
  backgroundFit = event.target.value; applyBackgroundFit(); save('backgroundFit', backgroundFit);
});
let backgroundBrightness = read('backgroundBrightness', 100);
if (!Number.isFinite(backgroundBrightness) || backgroundBrightness < 25 || backgroundBrightness > 150) backgroundBrightness = 100;
let backgroundBlur = read('backgroundBlur', 0);
if (!Number.isFinite(backgroundBlur) || backgroundBlur < 0 || backgroundBlur > 12) backgroundBlur = 0;
let backgroundSpeed = read('backgroundSpeed', 1);
if (![0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].includes(backgroundSpeed)) backgroundSpeed = 1;
let backgroundPlaying = read('backgroundPlaying', true) !== false;
function applyBackgroundParameters() {
  document.documentElement.style.setProperty('--background-brightness', backgroundBrightness / 100);
  document.documentElement.style.setProperty('--background-blur', backgroundBlur + 'px');
  $('#setting-background-brightness').value = backgroundBrightness;
  $('#background-brightness-value').value = backgroundBrightness + '%';
  $('#setting-background-blur').value = backgroundBlur;
  $('#background-blur-value').value = backgroundBlur + ' px';
  $('#setting-background-speed').value = backgroundSpeed;
  $('#setting-background-playing').checked = backgroundPlaying;
  $('#background-video').defaultPlaybackRate = backgroundSpeed;
  $('#background-video').playbackRate = backgroundSpeed;
}
applyBackgroundParameters();
$('#setting-background-brightness').addEventListener('input', event => { backgroundBrightness = Number(event.target.value); applyBackgroundParameters(); save('backgroundBrightness', backgroundBrightness); });
$('#setting-background-blur').addEventListener('input', event => { backgroundBlur = Number(event.target.value); applyBackgroundParameters(); save('backgroundBlur', backgroundBlur); });
$('#setting-background-speed').addEventListener('change', event => { backgroundSpeed = Number(event.target.value); applyBackgroundParameters(); save('backgroundSpeed', backgroundSpeed); });
$('#setting-background-playing').addEventListener('change', event => { backgroundPlaying = event.target.checked; save('backgroundPlaying', backgroundPlaying); syncBackgroundPlayback(); });
$('#background-parameters-reset').addEventListener('click', () => {
  backgroundFit = 'cover'; backgroundBrightness = 100; backgroundBlur = 0; backgroundSpeed = 1; backgroundPlaying = true;
  applyBackgroundFit(); applyBackgroundParameters(); syncBackgroundPlayback();
  save('backgroundFit', backgroundFit); save('backgroundBrightness', backgroundBrightness); save('backgroundBlur', backgroundBlur); save('backgroundSpeed', backgroundSpeed); save('backgroundPlaying', backgroundPlaying);
});
function applyBackground(value) {
  backgroundMediaVersion++; backgroundRestorePending = false; backgroundResumeTime = 0;
  const video = $('#background-video'); video.onloadedmetadata = null; video.pause(); video.removeAttribute('src'); video.removeAttribute('poster'); video.load(); video.hidden = true;
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  if (backgroundPreviewUrl) URL.revokeObjectURL(backgroundPreviewUrl);
  backgroundUrl = value ? URL.createObjectURL(value.blob) : null;
  backgroundPreviewUrl = value?.preview instanceof Blob ? URL.createObjectURL(value.preview) : null;
  const isVideo = value?.kind === 'video';
  backgroundVideoActive = isVideo;
  $('#background-video-settings').hidden = !isVideo;
  $('#page-background').style.backgroundImage = backgroundUrl && !isVideo ? `url("${backgroundUrl}")` : '';
  if (isVideo) { video.muted = true; video.src = backgroundUrl; if (backgroundPreviewUrl) video.poster = backgroundPreviewUrl; video.hidden = false; applyBackgroundParameters(); syncBackgroundPlayback(); }
  document.body.classList.toggle('has-background', !!value);
  $('#background-preview').hidden = !value;
  if (value) { $('#background-thumbnail').src = backgroundPreviewUrl || backgroundUrl; $('#background-name').textContent = value.name; }
  else { $('#background-thumbnail').removeAttribute('src'); $('#background-name').textContent = ''; }
  currentLibraryPath = value?.libraryPath || '';
  document.querySelectorAll('.library-item').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.path === currentLibraryPath)));
  $('#background-reset').disabled = !value;
}
const reducedBackgroundMotion = matchMedia('(prefers-reduced-motion: reduce)');
function unloadBackgroundVideo() {
  const video = $('#background-video');
  backgroundMediaVersion++; backgroundRestorePending = false; video.onloadedmetadata = null;
  if (video.getAttribute('src')) {
    if (video.readyState >= 1 && Number.isFinite(video.currentTime)) backgroundResumeTime = video.currentTime;
    video.pause(); video.removeAttribute('src'); video.load();
  }
  if (backgroundUrl) { URL.revokeObjectURL(backgroundUrl); backgroundUrl = null; }
}
async function restoreBackgroundVideo() {
  if (backgroundRestorePending) return;
  backgroundRestorePending = true;
  const version = ++backgroundMediaVersion;
  $('#background-playback-status').textContent = '正在恢复视频壁纸…';
  try {
    const value = await backgroundStorage('read');
    if (version !== backgroundMediaVersion || !backgroundVideoActive || document.hidden || !backgroundWindowFocused) return;
    if (value?.kind !== 'video' || !(value.blob instanceof Blob)) throw new Error('视频无法读取');
    const video = $('#background-video');
    backgroundUrl = URL.createObjectURL(value.blob);
    video.onloadedmetadata = () => {
      video.onloadedmetadata = null;
      if (Number.isFinite(video.duration) && backgroundResumeTime < video.duration) video.currentTime = backgroundResumeTime;
      applyBackgroundParameters(); syncBackgroundPlayback();
    };
    video.src = backgroundUrl; video.load();
  } catch { $('#background-playback-status').textContent = '未能恢复视频，请重新选择壁纸。'; }
  finally { if (version === backgroundMediaVersion) backgroundRestorePending = false; }
}
function syncBackgroundPlayback() {
  const video = $('#background-video'); if (!backgroundVideoActive) return;
  if (document.hidden || !backgroundWindowFocused) {
    unloadBackgroundVideo(); $('#background-playback-status').textContent = '页面位于后台，已卸载视频；返回后自动恢复。'; return;
  }
  if (!video.getAttribute('src')) { restoreBackgroundVideo(); return; }
  const reason = searchFocused ? '搜索专注模式，视频暂时暂停。' : !backgroundPlaying ? '已手动暂停，保留当前画面。' : !motionEnabled ? '界面动效已关闭，视频暂停。' : reducedBackgroundMotion.matches ? '系统已开启减少动态效果，视频暂停。' : '';
  $('#background-playback-status').textContent = reason || '原生视频播放中，静音循环；后台会卸载视频，返回后恢复。';
  if (reason) video.pause();
  else {
    const version = backgroundMediaVersion;
    video.play().catch(error => { if (version === backgroundMediaVersion && error.name !== 'AbortError') $('#background-playback-status').textContent = '自动播放被浏览器阻止，请关闭再开启“播放视频壁纸”重试。'; });
  }
}
document.addEventListener('visibilitychange', syncBackgroundPlayback);
window.addEventListener('blur', () => { backgroundWindowFocused = false; syncBackgroundPlayback(); });
window.addEventListener('focus', () => { backgroundWindowFocused = true; syncBackgroundPlayback(); });
window.addEventListener('pagehide', () => { if (backgroundVideoActive) unloadBackgroundVideo(); });
window.addEventListener('pageshow', () => { backgroundWindowFocused = document.hasFocus(); syncBackgroundPlayback(); });
reducedBackgroundMotion.addEventListener('change', syncBackgroundPlayback);
function setBackgroundBusy(busy) {
  backgroundBusy = busy;
  $('#background-choose').disabled = busy;
  $('#background-reset').disabled = busy || !(backgroundUrl || backgroundVideoActive);
  $('#background-choose').textContent = busy ? '正在处理…' : '选择图片';
  for (const id of ['#library-choose', '#library-reconnect', '#library-forget']) $(id).disabled = busy || libraryScanBusy || libraryDirectoryBusy;
  document.querySelectorAll('.library-item').forEach(button => { button.disabled = busy || button.dataset.available === 'false'; });
}
async function prepareBackgroundImage(file, name = file.name) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('图片无法处理');
    return { blob, name };
  } finally { URL.revokeObjectURL(url); }
}
$('#background-choose').addEventListener('click', () => $('#background-file').click());
$('#background-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file || backgroundBusy) return;
  if (!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(file.type)) { $('#background-message').textContent = '请选择 JPG、PNG、WebP、AVIF 或 GIF 图片。'; return; }
  if (file.size > 20 * 1024 * 1024) { $('#background-message').textContent = '图片超过 20 MB，请选择较小的图片。'; return; }
  setBackgroundBusy(true); $('#background-message').textContent = '正在读取并保存背景…';
  try {
    const value = await prepareBackgroundImage(file); await backgroundStorage('write', value); applyBackground(value);
    $('#background-message').textContent = '背景已保存，可在“背景显示”中调整缩放方式。GIF 会转为静态背景。'; $('#settings-status').textContent = '背景已保存';
  } catch { $('#background-message').textContent = '未能保存背景。请换一张有效图片，并确认浏览器允许网站存储。'; }
  finally { setBackgroundBusy(false); }
});
$('#background-reset').addEventListener('click', async () => {
  if (backgroundBusy) return; setBackgroundBusy(true);
  try { await backgroundStorage('delete'); applyBackground(null); $('#background-message').textContent = '已恢复默认背景。'; $('#settings-status').textContent = '已自动保存'; }
  catch { $('#background-message').textContent = '未能恢复默认背景，请检查浏览器的网站存储权限后重试。'; }
  finally { setBackgroundBusy(false); }
});
setBackgroundBusy(true);
backgroundStorage('read').then(value => { if (value && value.blob instanceof Blob) applyBackground(value); }).catch(() => { $('#background-message').textContent = '此浏览器暂时无法读取背景存储；其他功能可正常使用。'; }).finally(() => setBackgroundBusy(false));

let wallpaperLibrary = [];
let libraryPreviewUrls = [];
const libraryImagePattern = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;
const libraryVideoPattern = /\.(mp4|m4v|webm|ogv|ogg)$/i;
function libraryFilePath(path) {
  const parts = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop(); else parts.push(part);
  }
  return parts.join('/').toLowerCase();
}
async function readWallpaperLibrary(files) {
  if (libraryScanBusy) return;
  libraryScanBusy = true; setBackgroundBusy(backgroundBusy); $('#library-search').disabled = true;
  $('#library-status').textContent = '正在读取壁纸项目…';
  try {
    const paths = new Map(files.map(file => [libraryFilePath(file.webkitRelativePath || file.name), file]));
    const projects = files.filter(file => /(^|\/)project\.json$/i.test((file.webkitRelativePath || file.name).replace(/\\/g, '/')));
    let skipped = 0;
    const entries = await Promise.all(projects.map(async project => {
      try {
        const path = (project.webkitRelativePath || project.name).replace(/\\/g, '/');
        const base = path.slice(0, path.lastIndexOf('/') + 1);
        const metadata = JSON.parse((await project.text()).replace(/^\uFEFF/, ''));
        const resolve = relative => typeof relative === 'string' ? paths.get(libraryFilePath(base + relative)) : null;
        const media = resolve(metadata.file);
        const preview = resolve(metadata.preview) || resolve('preview.jpg') || resolve('preview.png') || resolve('preview.gif');
        const video = media && libraryVideoPattern.test(media.name);
        const image = media && libraryImagePattern.test(media.name);
        const selected = video || image ? media : preview;
        const type = typeof metadata.type === 'string' ? metadata.type.toLowerCase() : '';
        const kind = video ? '视频' : image ? '图片' : type === 'scene' ? '场景 · 预览图' : type === 'web' ? '网页 · 预览图' : '预览图';
        const title = typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title : base.split('/').filter(Boolean).pop() || '未命名壁纸';
        return { path, title, kind, video: !!video, file: selected, preview: preview || (image ? media : null), previewUrl: null };
      } catch { skipped++; return null; }
    }));
    $('#library-results').replaceChildren(); libraryPreviewUrls.forEach(url => URL.revokeObjectURL(url)); libraryPreviewUrls = [];
    wallpaperLibrary = entries.filter(Boolean).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    $('#library-search').value = ''; $('#library-search').disabled = !wallpaperLibrary.length;
    renderWallpaperLibrary();
    if (!projects.length) $('#library-status').textContent = '没有找到 project.json。请选择包含壁纸项目的 431960 目录，或单个壁纸项目文件夹。';
    else if (!wallpaperLibrary.length) $('#library-status').textContent = '找到项目文件，但未能读取有效信息。原背景保持不变。';
    else if (skipped) $('#library-status').textContent += `，另有 ${skipped} 个项目无法读取。`;
  } catch { $('#library-status').textContent = '未能读取这个文件夹，请重新选择。原背景保持不变。'; }
  finally { libraryScanBusy = false; setBackgroundBusy(backgroundBusy); }
}
function renderWallpaperLibrary() {
  const query = $('#library-search').value.trim().toLocaleLowerCase();
  const entries = wallpaperLibrary.filter(entry => `${entry.title} ${entry.kind} ${entry.path}`.toLocaleLowerCase().includes(query));
  $('#library-results').replaceChildren();
  for (const entry of entries) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'library-item';
    button.dataset.path = entry.path; button.dataset.available = String(!!entry.file); button.disabled = !entry.file || backgroundBusy;
    button.setAttribute('aria-pressed', String(entry.path === currentLibraryPath));
    const cover = document.createElement('span'); cover.className = 'library-cover';
    if (entry.preview) {
      if (!entry.previewUrl) { entry.previewUrl = URL.createObjectURL(entry.preview); libraryPreviewUrls.push(entry.previewUrl); }
      const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy'; image.src = entry.previewUrl;
      image.addEventListener('error', () => { image.remove(); cover.textContent = '预览不可用'; }); cover.append(image);
    } else cover.textContent = entry.video ? '视频壁纸' : '无预览';
    const title = document.createElement('strong'); title.textContent = entry.title; title.title = entry.title;
    const description = document.createElement('small'); description.textContent = entry.file ? entry.kind : '缺少媒体或预览图';
    button.append(cover, title, description); button.addEventListener('click', () => selectLibraryWallpaper(entry)); $('#library-results').append(button);
  }
  $('#library-status').textContent = entries.length ? `显示 ${entries.length} / ${wallpaperLibrary.length} 个壁纸。点击即可应用。` : wallpaperLibrary.length ? '没有匹配的壁纸，试试其他名称或编号。' : '没有可显示的壁纸。';
}
async function prepareBackgroundVideo(file, name) {
  const video = document.createElement('video'); video.muted = true; video.preload = 'auto'; video.playsInline = true;
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = () => reject(new Error('这个视频格式暂时无法在当前浏览器播放')); video.src = url; video.load(); });
    const canvas = document.createElement('canvas'); const ratio = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio)); canvas.height = Math.max(1, Math.round(video.videoHeight * ratio)); canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const preview = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return { blob: file, preview, name, kind: 'video' };
  } finally { video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}
async function selectLibraryWallpaper(entry) {
  if (!entry.file || backgroundBusy) return;
  setBackgroundBusy(true); $('#library-status').textContent = '正在读取并保存选中的壁纸…';
  try {
    const value = entry.video ? await prepareBackgroundVideo(entry.file, entry.title) : await prepareBackgroundImage(entry.file, entry.title);
    value.libraryPath = entry.path; await backgroundStorage('write', value); applyBackground(value);
    $('#library-status').textContent = `已应用「${entry.title}」${entry.video ? '，视频静音循环播放。' : '。'}`;
    $('#background-message').textContent = entry.video ? '视频背景已保存；关闭界面动效或系统减少动态效果时暂停播放。' : `${entry.kind}已保存，刷新后仍可使用。`;
    $('#settings-status').textContent = '背景已保存';
  } catch (error) { $('#library-status').textContent = error.name === 'QuotaExceededError' ? '本地存储空间不足，请选择较小的壁纸。原背景保持不变。' : `应用失败：${error.message || '无法读取文件或保存到浏览器'}。原背景保持不变。`; }
  finally { setBackgroundBusy(false); }
}
const canRememberLibrary = typeof window.showDirectoryPicker === 'function';
$('#library-brave-help').hidden = canRememberLibrary || !navigator.brave;
let libraryDirectory = null;
function showRememberedLibrary(granted) {
  $('#library-directory-name').hidden = !libraryDirectory;
  $('#library-directory-name').textContent = libraryDirectory ? `已记住目录：${libraryDirectory.name}` : '';
  $('#library-reconnect').hidden = !libraryDirectory;
  $('#library-reconnect').textContent = granted ? '刷新壁纸库' : '授权已保存目录';
  $('#library-forget').hidden = !libraryDirectory;
}
async function loadLibraryDirectory() {
  libraryDirectoryBusy = true; setBackgroundBusy(backgroundBusy);
  $('#library-status').textContent = '正在读取已授权的本地壁纸目录…';
  try {
    const files = [];
    async function collect(directory, prefix) {
      for await (const [name, entry] of directory.entries()) {
        const path = prefix + '/' + name;
        if (entry.kind === 'directory') await collect(entry, path);
        else { const file = await entry.getFile(); Object.defineProperty(file, 'webkitRelativePath', { value: path }); files.push(file); }
      }
    }
    await collect(libraryDirectory, libraryDirectory.name);
    await readWallpaperLibrary(files); showRememberedLibrary(true);
  } catch {
    showRememberedLibrary(false);
    $('#library-status').textContent = '无法读取已记住的目录。请重新授权；目录已移动或删除时，请重新选择。已选背景保留。';
  } finally { libraryDirectoryBusy = false; setBackgroundBusy(backgroundBusy); }
}
$('#library-choose').addEventListener('click', async () => {
  if (!canRememberLibrary) {
    if (!('webkitdirectory' in $('#library-folder'))) { $('#library-status').textContent = '此浏览器不支持选择文件夹，请在电脑上的新版 Chrome 或 Edge 中使用。'; return; }
    $('#library-folder').click(); return;
  }
  libraryDirectoryBusy = true; setBackgroundBusy(backgroundBusy);
  try {
    const directory = await window.showDirectoryPicker({ id: 'wallpaper-library', mode: 'read' });
    libraryDirectory = directory; showRememberedLibrary(true);
    let remembered = true;
    try { await backgroundStorage('write', directory, 'library-directory'); } catch { remembered = false; }
    await loadLibraryDirectory();
    if (!remembered) $('#library-status').textContent += ' 本次可以浏览，但目录未能记住，刷新后请重新选择。';
  } catch (error) {
    if (error.name !== 'AbortError') $('#library-status').textContent = '未能打开文件夹。请检查浏览器的目录读取权限后重试。';
  } finally { libraryDirectoryBusy = false; setBackgroundBusy(backgroundBusy); }
});
$('#library-reconnect').addEventListener('click', async () => {
  if (!libraryDirectory) return;
  libraryDirectoryBusy = true; setBackgroundBusy(backgroundBusy);
  try {
    const permission = await libraryDirectory.requestPermission({ mode: 'read' });
    if (permission === 'granted') await loadLibraryDirectory();
    else $('#library-status').textContent = '目录尚未获得读取权限。可再次点击授权，或选择其他文件夹。已选背景保留。';
  } catch { $('#library-status').textContent = '未能重新授权，请再次授权或重新选择文件夹。'; }
  finally { libraryDirectoryBusy = false; setBackgroundBusy(backgroundBusy); }
});
$('#library-forget').addEventListener('click', async () => {
  libraryDirectoryBusy = true; setBackgroundBusy(backgroundBusy);
  try {
    await backgroundStorage('delete', undefined, 'library-directory');
    libraryDirectory = null; showRememberedLibrary(false);
    $('#library-results').replaceChildren(); libraryPreviewUrls.forEach(url => URL.revokeObjectURL(url)); libraryPreviewUrls = []; wallpaperLibrary = [];
    $('#library-search').value = ''; $('#library-search').disabled = true;
    $('#library-status').textContent = '已忘记目录，已选背景保留。本地壁纸文件没有删除。';
  } catch { $('#library-status').textContent = '未能忘记目录，请检查浏览器的网站存储权限后重试。'; }
  finally { libraryDirectoryBusy = false; setBackgroundBusy(backgroundBusy); }
});
async function restoreLibraryDirectory() {
  if (!canRememberLibrary) { $('#library-status').textContent = '文件只在本机读取，不会上传。此浏览器无法记住目录，刷新后需重新选择；已选背景保留。'; return; }
  $('#library-choose').textContent = '选择并记住文件夹';
  libraryDirectoryBusy = true; setBackgroundBusy(backgroundBusy);
  try {
    const directory = await backgroundStorage('read', undefined, 'library-directory');
    if (!directory || directory.kind !== 'directory') return;
    libraryDirectory = directory;
    const granted = await directory.queryPermission({ mode: 'read' }) === 'granted';
    showRememberedLibrary(granted);
    if (granted) await loadLibraryDirectory();
    else $('#library-status').textContent = '目录已记住。点击“授权已保存目录”即可继续，无需重新寻找文件夹。';
  } catch { $('#library-status').textContent = '无法恢复目录记录，请重新选择文件夹。已选背景保留。'; }
  finally { libraryDirectoryBusy = false; setBackgroundBusy(backgroundBusy); }
}
restoreLibraryDirectory();
$('#library-folder').addEventListener('change', event => { const files = Array.from(event.target.files); event.target.value = ''; if (files.length) readWallpaperLibrary(files); });
$('#library-search').addEventListener('input', renderWallpaperLibrary);
