(() => {
  const query = document.querySelector('#query');
  const panel = document.querySelector('#search-assist');
  const list = document.querySelector('#search-assist-list');
  const status = document.querySelector('#search-assist-status');
  const title = document.querySelector('#search-assist-title');
  const clear = document.querySelector('#search-assist-clear');
  const extension = location.protocol === 'chrome-extension:';
  let enabled = read('suggestions', true) !== false;
  let historyEnabled = read('searchHistoryEnabled', true) !== false;
  const validHistory = value => Array.isArray(value) ? value.filter(item => item && typeof item.query === 'string' && item.query.trim() && item.query.length <= 200 && Number.isFinite(item.at)).slice(0, 30) : [];
  let history = validHistory(read('searchHistory', []));
  let composing = false, compositionSubmit = false, timer, request, version = 0, active = -1;
  let choices = [];
  document.querySelector('#setting-suggestions').checked = enabled;
  document.querySelector('#setting-search-history').checked = historyEnabled;

  function cancelLookup() { clearTimeout(timer); request?.abort(); request = null; version++; }
  function close() {
    cancelLookup(); panel.hidden = true; active = -1;
    query.setAttribute('aria-expanded', 'false'); query.removeAttribute('aria-activedescendant');
  }
  function historyMatches(text) {
    return historyEnabled ? history.filter(item => item.query.toLocaleLowerCase().includes(text.toLocaleLowerCase())).slice(0, text ? 3 : 6).map(item => ({ text: item.query, history: true })) : [];
  }
  function choose(text) {
    query.value = text; updateSearchHint(); close(); query.focus();
    document.querySelector('#search-form').requestSubmit();
  }
  function render(items, message, online) {
    if (document.activeElement !== query || composing) return;
    choices = items; active = -1; list.replaceChildren();
    title.textContent = online ? '搜索联想 · 必应' : '搜索历史';
    clear.hidden = !history.length; status.textContent = message;
    items.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'assist-row'; row.setAttribute('role', 'presentation');
      const button = document.createElement('button'); button.type = 'button'; button.className = 'assist-choice'; button.id = 'search-choice-' + index;
      button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false');
      const text = document.createElement('span'); text.textContent = item.text; button.append(text);
      if (item.history) { const badge = document.createElement('small'); badge.textContent = '历史'; button.append(badge); }
      button.addEventListener('click', () => choose(item.text)); row.append(button);
      if (item.history) {
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'assist-remove'; remove.setAttribute('aria-label', '删除历史：' + item.text);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', '#i-close'); svg.setAttribute('aria-hidden', 'true'); svg.append(use); remove.append(svg);
        remove.addEventListener('click', () => { history = history.filter(entry => entry.query !== item.text); save('searchHistory', history); query.focus(); refresh(); }); row.append(remove);
      }
      list.append(row);
    });
    panel.style.setProperty('--assist-height', Math.max(120, Math.min(360, innerHeight - query.closest('.search-box').getBoundingClientRect().bottom - 76)) + 'px');
    panel.hidden = false; query.setAttribute('aria-expanded', 'true'); query.removeAttribute('aria-activedescendant');
  }
  function jsonp(text, signal) {
    // 网页使用必应提供的 JSONP；扩展仅 fetch JSON，不运行远程代码。
    return new Promise((resolve, reject) => {
      const name = '__qidianSuggest_' + crypto.randomUUID().replaceAll('-', '');
      const script = document.createElement('script'); let settled = false;
      function finish(error, data) {
        if (settled) return; settled = true; script.remove(); signal.removeEventListener('abort', abort);
        window[name] = () => {}; setTimeout(() => { delete window[name]; }, 5000);
        error ? reject(error) : resolve(data);
      }
      const abort = () => finish(new DOMException('Aborted', 'AbortError'));
      window[name] = data => finish(null, data);
      script.referrerPolicy = 'no-referrer'; script.src = 'https://api.bing.com/osjson.aspx?query=' + encodeURIComponent(text) + '&JsonType=callback&JsonCallback=' + name;
      script.onerror = () => finish(new Error('联想服务暂不可用'));
      script.onload = () => { if (!settled) finish(new Error('联想数据为空')); };
      signal.addEventListener('abort', abort, { once: true }); document.head.append(script);
    });
  }
  async function lookup(text, current) {
    const controller = new AbortController(); request = controller;
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      let data;
      if (extension) {
        const response = await fetch('https://api.bing.com/osjson.aspx?query=' + encodeURIComponent(text), { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error('联想服务暂不可用'); data = await response.json();
      } else data = await jsonp(text, controller.signal);
      if (current !== version || query.value.trim() !== text || !enabled) return;
      const local = historyMatches(text), seen = new Set(local.map(item => item.text));
      const suggestions = Array.isArray(data?.[1]) ? data[1].filter(value => typeof value === 'string' && value.trim() && value.length <= 200).filter(value => !seen.has(value) && seen.add(value)).map(value => ({ text: value, history: false })) : [];
      render([...local, ...suggestions].slice(0, 8), suggestions.length ? '' : '暂无更多联想，可直接搜索', true);
    } catch {
      if (current === version) render(historyMatches(text), '联想暂不可用，仍可直接搜索', true);
    } finally { clearTimeout(timeout); if (request === controller) request = null; }
  }
  function refresh() {
    cancelLookup(); if (document.activeElement !== query || composing) return;
    const text = query.value.trim();
    if (!text) { if (!historyEnabled) { close(); return; } render(historyMatches(''), history.length ? '' : '暂无搜索记录', false); return; }
    if (!enabled || text.length > 120 || websiteUrl(text) || /^[a-z][a-z\d+.-]*:/i.test(text)) { const items = historyMatches(text); items.length ? render(items, '', false) : close(); return; }
    render(historyMatches(text), '正在获取联想…', true);
    const current = version; timer = setTimeout(() => lookup(text, current), 250);
  }
  function clearHistory() { history = []; save('searchHistory', history); if (panel.contains(document.activeElement)) query.focus(); refresh(); notify('搜索历史已清空'); }
  query.addEventListener('focus', refresh); query.addEventListener('input', refresh);
  query.addEventListener('compositionstart', () => { composing = true; close(); });
  query.addEventListener('compositionend', () => { composing = false; refresh(); });
  query.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229 || composing) { if (event.key === 'Enter') { compositionSubmit = true; setTimeout(() => { compositionSubmit = false; }, 0); } return; }
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (panel.hidden) { refresh(); return; } if (!choices.length) return; event.preventDefault();
      active = active < 0 ? (event.key === 'ArrowDown' ? 0 : choices.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      list.querySelectorAll('.assist-choice').forEach((button, index) => button.setAttribute('aria-selected', String(index === active)));
      const option = document.querySelector('#search-choice-' + active); query.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter' && !panel.hidden && active >= 0) { event.preventDefault(); choose(choices[active].text); }
  });
  panel.addEventListener('pointerdown', event => event.preventDefault());
  query.closest('.search-box').addEventListener('focusout', () => queueMicrotask(() => { if (!query.closest('.search-box').contains(document.activeElement)) close(); }));
  clear.addEventListener('click', clearHistory); document.querySelector('#search-history-clear').addEventListener('click', clearHistory);
  document.querySelector('#setting-suggestions').addEventListener('change', event => { enabled = event.target.checked; save('suggestions', enabled); refresh(); });
  document.querySelector('#setting-search-history').addEventListener('change', event => { historyEnabled = event.target.checked; save('searchHistoryEnabled', historyEnabled); refresh(); });
  window.addEventListener('storage', event => { if (event.key === 'yql.searchHistory') { history = validHistory(read('searchHistory', [])); refresh(); } });
  window.QidianSearch = {
    close, isComposing: () => composing || compositionSubmit,
    record(value) { const text = value.trim(); if (!historyEnabled || !text || text.length > 200) return; history = [{ query: text, at: Date.now() }, ...history.filter(item => item.query.toLocaleLowerCase() !== text.toLocaleLowerCase())].slice(0, 30); save('searchHistory', history); }
  };

  const preferenceKeys = ['theme', 'engine', 'newTab', 'motion', 'sites', 'siteCategory', 'glassBlur', 'glassTransparency', 'accentColor', 'hotSource', 'backgroundFit', 'backgroundBrightness', 'backgroundBlur', 'backgroundSpeed', 'backgroundPlaying', 'suggestions', 'searchHistoryEnabled', 'searchHistory'];
  document.querySelector('#preferences-export').addEventListener('click', () => {
    const preferences = {};
    for (const key of preferenceKeys) { const value = read(key, undefined); if (value !== undefined) preferences[key] = value; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'qidian', version: 1, preferences }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'qidian-settings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  document.querySelector('#preferences-import').addEventListener('click', () => document.querySelector('#preferences-file').click());
  document.querySelector('#preferences-file').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('设置文件过大，请选择小于 1 MB 的文件。');
      const data = JSON.parse(await file.text());
      if (data?.app !== 'qidian' || data.version !== 1 || !data.preferences || typeof data.preferences !== 'object' || Array.isArray(data.preferences)) throw new Error('请选择栖点导出的设置文件。');
      const entries = Object.entries(data.preferences).filter(([key]) => preferenceKeys.includes(key));
      if (!entries.length) throw new Error('设置文件中没有可导入的数据。');
      for (const [key, value] of entries) {
        if (key === 'sites' && (!Array.isArray(value) || value.length > 2000 || value.some(site => !site || typeof site.name !== 'string' || site.name.length > 200 || typeof site.url !== 'string' || !websiteUrl(site.url) || (site.category !== undefined && (typeof site.category !== 'string' || site.category.length > 24))))) throw new Error('快捷网站数据无效。');
        if (key === 'searchHistory' && (!Array.isArray(value) || value.length > 30 || validHistory(value).length !== value.length)) throw new Error('搜索历史数据无效。');
        if (!['sites', 'searchHistory'].includes(key) && value !== null && !['string', 'boolean', 'number'].includes(typeof value)) throw new Error('设置数据无效。');
      }
      const previous = entries.map(([key]) => [key, localStorage.getItem('yql.' + key)]);
      try { for (const [key, value] of entries) localStorage.setItem('yql.' + key, JSON.stringify(value)); }
      catch (error) { for (const [key, value] of previous) { if (value === null) localStorage.removeItem('yql.' + key); else localStorage.setItem('yql.' + key, value); } throw error; }
      location.reload();
    } catch (error) { document.querySelector('#settings-status').textContent = error.message || '导入失败，原设置已保留。'; }
  });
})();
