(() => {
  const DAY_MS = 86400000;
  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function birthdayInfo(value, now = new Date()) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (year < 1900 || localDateKey(date) !== value || value > localDateKey(now)) return null;
    const days = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(year, month - 1, day)) / DAY_MS);
    return { days, today: now.getMonth() + 1 === month && now.getDate() === day };
  }
  function normalizeLocation(value) {
    if (!value || typeof value.name !== 'string' || !value.name.trim() || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) return null;
    return { name: value.name.trim().slice(0, 160), latitude: value.latitude, longitude: value.longitude };
  }
  function weatherDescription(code) {
    if (code === 0) return ['晴', 'sun'];
    if (code === 1) return ['晴间多云', 'sun'];
    if (code === 2) return ['多云', 'cloud'];
    if (code === 3) return ['阴', 'cloud'];
    if ([45, 48].includes(code)) return ['雾', 'cloud'];
    if ([51, 53, 55].includes(code)) return ['毛毛雨', 'rain'];
    if ([56, 57, 66, 67].includes(code)) return ['冻雨', 'rain'];
    if ([61, 63, 65].includes(code)) return ['雨', 'rain'];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ['雪', 'snow'];
    if ([80, 81, 82].includes(code)) return ['阵雨', 'rain'];
    if ([95, 96, 99].includes(code)) return ['雷雨', 'rain'];
    return ['天气未知', 'cloud'];
  }
  function normalizeWeather(data) {
    const current = data?.current, daily = data?.daily;
    if (!current || !daily || ![current.temperature_2m, current.apparent_temperature, current.relative_humidity_2m, current.wind_speed_10m, current.weather_code, daily.temperature_2m_max?.[0], daily.temperature_2m_min?.[0]].every(Number.isFinite)) throw new Error('天气数据暂不可用');
    return { temperature: Math.round(current.temperature_2m), feels: Math.round(current.apparent_temperature), humidity: Math.round(current.relative_humidity_2m), wind: Math.round(current.wind_speed_10m), code: current.weather_code, high: Math.round(daily.temperature_2m_max[0]), low: Math.round(daily.temperature_2m_min[0]) };
  }

  function claimBirthdayCelebration(storage, day) {
    try {
      if (storage.getItem('yql.birthdayCelebrated') === day) return false;
      storage.setItem('yql.birthdayCelebrated', day); return true;
    } catch { return false; }
  }
  function clampBirthday(parts, now = new Date()) {
    let [year, month, day] = parts;
    year = Math.max(1900, Math.min(now.getFullYear(), year));
    month = Math.max(1, Math.min(year === now.getFullYear() ? now.getMonth() + 1 : 12, month));
    const maximum = year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : new Date(year, month, 0).getDate();
    return [year, month, Math.max(1, Math.min(maximum, day))];
  }
  function setDisclosure(button, panel, open) {
    if (panel.hasAttribute('popover')) {
      if (open) panel.showPopover(); else if (panel.matches(':popover-open')) panel.hidePopover();
      button.setAttribute('aria-expanded', String(open)); return;
    }
    button.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open); panel.inert = !open; panel.setAttribute('aria-hidden', String(!open));
  }
  let hotLoaded = false;
  $('#hot-toggle').addEventListener('click', () => {
    const open = $('#hot-toggle').getAttribute('aria-expanded') !== 'true';
    if (!open && $('#hot-collapse').contains(document.activeElement)) $('#hot-toggle').focus();
    for (const [button, panel] of [['#weather-city-toggle', '#weather-picker'], ['#birthday-toggle', '#birthday-editor']]) setDisclosure($(button), $(panel), false);
    $('#widget-pair').inert = open; $('#widget-pair').setAttribute('aria-hidden', String(open));
    $('.side-widgets').classList.toggle('hot-expanded', open);
    setDisclosure($('#hot-toggle'), $('#hot-collapse'), open);
    $('#hot-toggle .widget-toggle-hint').textContent = open ? '收起' : '点击展开';
    if (open && !hotLoaded) { hotLoaded = true; loadHot(hotSource); }
    if (!open) setHotSourcePicker(false);
  });
  for (const [button, panel] of [['#weather-city-toggle', '#weather-picker'], ['#birthday-toggle', '#birthday-editor']]) {
    $(button).addEventListener('click', () => {
      const open = $(button).getAttribute('aria-expanded') !== 'true';
      setDisclosure($(button), $(panel), open);
      if (open) {
        if (panel === '#birthday-editor') { initializeWheels(); $('#birthday-year').focus({ preventScroll:true }); }
        else { showCityPresets(); $('#weather-query').focus({ preventScroll:true }); }
      }
    });
  }

  for (const [button, panel] of [['#weather-city-toggle', '#weather-picker'], ['#birthday-toggle', '#birthday-editor']]) {
    $(panel).addEventListener('toggle', event => { $(button).setAttribute('aria-expanded', String(event.newState === 'open')); });
  }
  let wheelParts, wheelTimers = [];
  const wheelIds = ['#birthday-year', '#birthday-month', '#birthday-day'];
  function wheelMaximum(index) {
    const now = new Date();
    return index === 0 ? now.getFullYear() : index === 1 ? (wheelParts[0] === now.getFullYear() ? now.getMonth() + 1 : 12) : clampBirthday([wheelParts[0], wheelParts[1], 31], now)[2];
  }
  function updateWheelValue() {
    $('#birthday-input').value = wheelParts.map((part, index) => String(part).padStart(index ? 2 : 4, '0')).join('-');
    $('#birthday-preview').textContent = `${wheelParts[0]}年 ${wheelParts[1]}月 ${wheelParts[2]}日`;
  }
  function renderWheel(index) {
    clearTimeout(wheelTimers[index]);
    const wheel = $(wheelIds[index]), first = index === 0 ? 1900 : 1, maximum = wheelMaximum(index);
    wheel.replaceChildren();
    for (let value = first; value <= maximum; value++) {
      const option = document.createElement('div'); option.className = 'date-wheel-option'; option.id = `date-option-${index}-${value}`;
      option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(value === wheelParts[index])); option.textContent = value;
      option.addEventListener('click', () => wheel.scrollTo({ top:(value - first) * 40, behavior:motionAllowed() ? 'smooth' : 'instant' }));
      wheel.append(option);
    }
    wheel.setAttribute('aria-activedescendant', `date-option-${index}-${wheelParts[index]}`);
    wheel.scrollTop = (wheelParts[index] - first) * 40;
  }
  function motionAllowed() { return document.documentElement.dataset.motion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function selectWheel(index, value) {
    const before = [...wheelParts]; wheelParts[index] = value; wheelParts = clampBirthday(wheelParts);
    const wheel = $(wheelIds[index]);
    for (const option of wheel.children) option.setAttribute('aria-selected', String(Number(option.textContent) === wheelParts[index]));
    wheel.setAttribute('aria-activedescendant', `date-option-${index}-${wheelParts[index]}`);
    for (let next = index + 1; next < 3; next++) if (before[index] !== wheelParts[index] || before[next] !== wheelParts[next]) renderWheel(next);
    updateWheelValue();
  }
  function initializeWheels() {
    wheelParts = clampBirthday((birthday || '2000-01-01').split('-').map(Number));
    wheelIds.forEach((_, index) => renderWheel(index)); updateWheelValue(); $('#birthday-error').hidden = true;
  }
  wheelIds.forEach((selector, index) => {
    const wheel = $(selector), first = index === 0 ? 1900 : 1;
    wheel.addEventListener('scroll', () => {
      clearTimeout(wheelTimers[index]);
      wheelTimers[index] = setTimeout(() => {
        const value = Math.min(wheelMaximum(index), Math.max(first, first + Math.round(wheel.scrollTop / 40)));
        selectWheel(index, value);
        wheel.scrollTo({top:(value - first) * 40, behavior:motionAllowed() ? 'smooth' : 'instant'});
      }, 100);
    }, {passive:true});
    wheel.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
      event.preventDefault();
      const delta = {ArrowUp:-1, ArrowDown:1, PageUp:-10, PageDown:10}[event.key];
      const value = event.key === 'Home' ? first : event.key === 'End' ? wheelMaximum(index) : Math.max(first, Math.min(wheelMaximum(index), wheelParts[index] + delta));
      selectWheel(index, value); wheel.scrollTo({top:(value - first) * 40, behavior:'instant'});
    });
  });
  let birthday = read('birthday', null);
  if (!birthdayInfo(birthday)) birthday = null;
  function birthdayFestival(now) {
    return birthdayInfo(birthday, now)?.today ? ['生日快乐', '生日快乐！愿新的一岁，平安有趣，热爱常在。'] : null;
  }
  window.QidianBirthday = { forDate: birthdayFestival };
  function renderBirthday() {
    const now = new Date(), info = birthdayInfo(birthday, now);
    $('#birthday-input').max = localDateKey(now); $('#birthday-input').value = birthday || '';
    $('#life-days').textContent = info ? info.days.toLocaleString('zh-CN') : '—';
    $('#birthday-caption').textContent = info ? info.today ? '今天是你的生日，愿新的一岁自在明亮。' : '每一天，都值得好好度过。' : '记录你的生日，让每一天都有迹可循。';
    $('#birthday-toggle').firstChild.textContent = info ? '修改生日' : '填写生日';
  }
  function birthdayConfetti() {
    if (document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas'); canvas.className = 'birthday-confetti'; canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d'); if (!context) return;
    const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio; context.scale(ratio, ratio); document.body.append(canvas);
    const palette = ['#d97757', '#e7a78f', '#e8c879', '#8caaa0', '#f1e6df'];
    const pieces = Array.from({ length: 90 }, (_, index) => ({ x: index % 2 ? width : 0, y: height * .65, vx: (index % 2 ? -1 : 1) * (3 + Math.random() * 8), vy: -8 - Math.random() * 10, rotation: Math.random() * 6, spin: Math.random() * .2 - .1, color: palette[index % palette.length] }));
    let frame, start, previous;
    const stop = () => { cancelAnimationFrame(frame); canvas.remove(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('resize', stop); };
    const onVisibility = () => { if (document.hidden) stop(); };
    const draw = now => {
      start ??= now; previous ??= now; const elapsed = now - start, step = Math.min(40, now - previous) / 16.67; previous = now;
      if (elapsed >= 2400 || document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) { stop(); return; }
      context.clearRect(0, 0, width, height); context.globalAlpha = Math.min(1, (2400 - elapsed) / 600);
      for (const piece of pieces) {
        piece.x += piece.vx * step; piece.y += piece.vy * step; piece.vy += .24 * step; piece.rotation += piece.spin * step;
        context.save(); context.translate(piece.x, piece.y); context.rotate(piece.rotation); context.fillStyle = piece.color; context.fillRect(-2, -4, 4, 8); context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('resize', stop, { once: true }); frame = requestAnimationFrame(draw);
  }
  function celebrateBirthday() {
    if (!birthdayInfo(birthday)?.today || document.hidden) return;
    const once = () => {
      if (document.hidden || !birthdayInfo(birthday)?.today) return;
      const key = localDateKey(new Date());
      if (!claimBirthdayCelebration(localStorage, key)) return;
      birthdayConfetti();
    };
    if (navigator.locks) navigator.locks.request('qidian-birthday', once).catch(() => {}); else once();
  }
  $('#birthday-form').addEventListener('submit', event => {
    event.preventDefault();
    wheelIds.forEach((selector,index) => { clearTimeout(wheelTimers[index]); const first = index === 0 ? 1900 : 1; wheelParts[index] = first + Math.round($(selector).scrollTop / 40); });
    wheelParts = clampBirthday(wheelParts); updateWheelValue();
    const value = $('#birthday-input').value;
    if (!birthdayInfo(value)) { $('#birthday-error').textContent = '请选择有效的出生日期，不能晚于今天。'; $('#birthday-error').hidden = false; return; }
    try { localStorage.setItem('yql.birthday', JSON.stringify(value)); }
    catch { $('#birthday-error').textContent = '浏览器暂时无法保存生日，请检查本地存储权限。'; $('#birthday-error').hidden = false; return; }
    birthday = value; $('#birthday-error').hidden = true; setDisclosure($('#birthday-toggle'), $('#birthday-editor'), false); $('#birthday-toggle').focus();
    renderBirthday(); document.dispatchEvent(new Event('qidian-birthday-change')); celebrateBirthday();
  });
  document.addEventListener('qidian-day-change', () => { renderBirthday(); celebrateBirthday(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderBirthday(); celebrateBirthday(); } });
  renderBirthday(); document.dispatchEvent(new Event('qidian-birthday-change')); celebrateBirthday();

  let location = normalizeLocation(read('weatherLocation', null)), weatherVersion = 0, searchVersion = 0, searchTimer, memoryOnly = false;
  function showWeather(data, at, cached = false) {
    const weather = normalizeWeather(data), [condition, icon] = weatherDescription(weather.code);
    $('#weather-temperature').textContent = weather.temperature + '°'; $('#weather-condition').textContent = condition; $('#weather-icon').setAttribute('href', '#i-' + icon);
    $('#weather-details').textContent = `体感 ${weather.feels}° · 湿度 ${weather.humidity}% · 风速 ${weather.wind} km/h`;
    $('#weather-range').textContent = `今日 ${weather.low}° / ${weather.high}°`;
    $('#weather-result').hidden = false;
    $('#weather-status').textContent = `${cached ? '上次更新' : '更新于'} ${new Intl.DateTimeFormat('zh-CN', { hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(at)}${memoryOnly ? ' · 城市仅在本次会话有效' : ''}`;
  }
  async function loadWeather(force = false) {
    if (!location) return;
    const version = ++weatherVersion, selected = location;
    $('#weather-city-toggle span').textContent = selected.name;
    $('#weather-city-toggle').title = selected.name;
    $('#weather-refresh').disabled = true; $('#weather-status').textContent = '正在获取天气…'; $('#weather-result').hidden = true;
    let cache = read('weatherCache', null), cachedData = false;
    if (cache?.latitude === selected.latitude && cache?.longitude === selected.longitude && Number.isFinite(cache.at)) {
      try { showWeather(cache.data, cache.at, true); cachedData = true; } catch { cache = null; }
    } else cache = null;
    try {
      if (!force && cachedData && Date.now() - cache.at >= 0 && Date.now() - cache.at < 900000) return;
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({ latitude: selected.latitude, longitude: selected.longitude, current:'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m', daily:'temperature_2m_max,temperature_2m_min', forecast_days:1, timezone:'auto' });
      const data = await fetchPublicJson(url.href); normalizeWeather(data);
      if (version !== weatherVersion) return;
      const at = Date.now(); showWeather(data, at);
      try { localStorage.setItem('yql.weatherCache', JSON.stringify({ latitude:selected.latitude, longitude:selected.longitude, at, data })); } catch {}
    } catch {
      if (version !== weatherVersion) return;
      $('#weather-status').textContent = cachedData ? '天气更新失败，显示上次数据；可稍后刷新。' : '暂时无法获取天气，请稍后刷新或切换城市。';
    } finally { if (version === weatherVersion) $('#weather-refresh').disabled = false; }
  }
  function selectLocation(value) {
    const selected = normalizeLocation(value); if (!selected) return;
    location = selected; clearTimeout(searchTimer); searchVersion++;
    try { localStorage.setItem('yql.weatherLocation', JSON.stringify(selected)); memoryOnly = false; } catch { memoryOnly = true; }
    setDisclosure($('#weather-city-toggle'), $('#weather-picker'), false); $('#weather-city-toggle').focus(); loadWeather();
  }
  const presetCities = [
    ['北京',39.90,116.40],['上海',31.23,121.47],['广州',23.13,113.26],['深圳',22.54,114.06],
    ['杭州',30.27,120.15],['成都',30.57,104.07],['武汉',30.59,114.31],['重庆',29.56,106.55]
  ].map(([name,latitude,longitude]) => ({name,latitude,longitude}));
  let cityOptions = [], cityActive = -1, composing = false;
  function renderCities(cities, presets = false) {
    cityOptions = cities; cityActive = -1; $('#weather-query').removeAttribute('aria-activedescendant');
    $('#weather-cities').replaceChildren(); $('#weather-cities').classList.toggle('city-presets', presets);
    cities.forEach((city, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.id = `weather-city-${index}`;
      button.setAttribute('role','option'); button.setAttribute('aria-selected','false'); button.tabIndex = -1;
      button.textContent = city.name; button.addEventListener('click', () => selectLocation(city)); $('#weather-cities').append(button);
    });
    $('#weather-query').setAttribute('aria-expanded', String(cities.length > 0));
  }
  function showCityPresets() {
    clearTimeout(searchTimer); searchVersion++; $('#weather-query').value = '';
    renderCities(presetCities, true); $('#weather-search-status').textContent = '常用城市 · 也可以输入名称搜索';
    $('#weather-cities').setAttribute('aria-busy','false'); $('#weather-search').disabled = false;
  }
  async function searchCities() {
    clearTimeout(searchTimer); const version = ++searchVersion, query = $('#weather-query').value.trim();
    if (query.length < 2) { renderCities(presetCities, true); $('#weather-search-status').textContent = query ? '再输入一个字，或选择常用城市。' : '常用城市 · 也可以输入名称搜索'; return; }
    $('#weather-cities').setAttribute('aria-busy','true'); $('#weather-search-status').textContent = '正在查找匹配的城市…';
    renderCities([]);
    try {
      const url = new URL('https://geocoding-api.open-meteo.com/v1/search'); url.search = new URLSearchParams({name:query, count:6, language:'zh', format:'json'});
      const data = await fetchPublicJson(url.href); if (version !== searchVersion) return;
      const cities = (Array.isArray(data.results) ? data.results : []).map(city => normalizeLocation({...city, name:[...new Set([city.name,city.admin1,city.country].filter(value => typeof value === 'string' && value.trim()))].join(' · ')})).filter(Boolean);
      renderCities(cities); $('#weather-search-status').textContent = cities.length ? '选择城市查看天气 · ↑ ↓ 切换，回车确认' : '没有找到城市，试试完整名称或拼音。';
    } catch { if (version === searchVersion) $('#weather-search-status').textContent = '城市联想暂不可用，可稍后重试或使用定位。'; }
    finally { if (version === searchVersion) $('#weather-cities').setAttribute('aria-busy','false'); }
  }
  $('#weather-query').addEventListener('compositionstart', () => { composing = true; clearTimeout(searchTimer); searchVersion++; });
  $('#weather-query').addEventListener('compositionend', () => { composing = false; queueCitySearch(); });
  function queueCitySearch() {
    clearTimeout(searchTimer); searchVersion++; renderCities([]); $('#weather-cities').setAttribute('aria-busy','false');
    if (!composing) searchTimer = setTimeout(searchCities, 280);
  }
  $('#weather-query').addEventListener('input', queueCitySearch);
  $('#weather-query').addEventListener('keydown', event => {
    if (composing || event.isComposing) return;
    if (['ArrowDown','ArrowUp'].includes(event.key) && cityOptions.length) {
      event.preventDefault(); cityActive = (cityActive + (event.key === 'ArrowDown' ? 1 : -1) + cityOptions.length) % cityOptions.length;
      Array.from($('#weather-cities').children).forEach((option,index) => option.setAttribute('aria-selected', String(index === cityActive)));
      const option = $('#weather-cities').children[cityActive]; $('#weather-query').setAttribute('aria-activedescendant', option.id); option.scrollIntoView({block:'nearest'});
    } else if (event.key === 'Enter' && cityActive >= 0) { event.preventDefault(); selectLocation(cityOptions[cityActive]); }
  });
  $('#weather-search-form').addEventListener('submit', event => { event.preventDefault(); if (!composing) searchCities(); });
  $('#weather-locate').addEventListener('click', () => {
    if (!navigator.geolocation) { $('#weather-status').textContent = '当前浏览器不支持定位，请搜索城市。'; return; }
    $('#weather-locate').disabled = true; $('#weather-status').textContent = '正在定位，请在浏览器提示中授权…';
    navigator.geolocation.getCurrentPosition(position => {
      $('#weather-locate').disabled = false;
      selectLocation({ name:'当前位置', latitude:Math.round(position.coords.latitude * 100) / 100, longitude:Math.round(position.coords.longitude * 100) / 100 });
    }, error => { $('#weather-locate').disabled = false; $('#weather-status').textContent = error.code === 1 ? '定位未获允许，请搜索城市。' : '暂时无法定位，请搜索城市或稍后重试。'; }, { enableHighAccuracy:false, timeout:10000, maximumAge:300000 });
  });
  $('#weather-refresh').addEventListener('click', () => loadWeather(true));
  if (location) loadWeather();
})();
