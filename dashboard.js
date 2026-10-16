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
  const DAY_KINDS = {birthday:{name:'生日',title:'来到这个世界',mode:'up'},anniversary:{name:'纪念日',title:'我们的纪念日',mode:'up'},deadline:{name:'工作截止日',title:'工作截止日',mode:'down'},custom:{name:'自定义',title:'我的记日',mode:'up'}};
  function dateSerial(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y,m,d] = value.split('-').map(Number), date = new Date(y,m-1,d);
    return y >= 1900 && y <= 2100 && localDateKey(date) === value ? Date.UTC(y,m-1,d) / DAY_MS : null;
  }
  function normalizeDayRecord(value, now = new Date()) {
    if (!value || !Object.hasOwn(DAY_KINDS,value.kind) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title.trim() || !['up','down'].includes(value.mode)) return null;
    const start = dateSerial(value.start), end = value.end === '' || value.end == null ? '' : value.end;
    if (typeof end !== 'string') return null;
    if ((start === null && !(value.kind === 'birthday' && value.start === '')) || (end && dateSerial(end) === null) || (value.kind === 'birthday' && value.start > localDateKey(now))) return null;
    return {id:value.id.slice(0,80),kind:value.kind,title:value.title.trim().slice(0,32),start:value.start,end,mode:value.mode};
  }
  function dayRecordInfo(record, now = new Date()) {
    const start = dateSerial(record?.start), end = dateSerial(record?.end || localDateKey(now));
    if (start === null || end === null) return null;
    return {days:(record.mode === 'down' ? start - end : end - start),end:record.end || localDateKey(now)};
  }
  function normalizeDayState(value, legacyBirthday, now = new Date()) {
    if (!value || !Array.isArray(value.items)) return {items:[{id:'birthday',kind:'birthday',title:DAY_KINDS.birthday.title,start:birthdayInfo(legacyBirthday,now) ? legacyBirthday : '',end:'',mode:'up'}],activeId:'birthday'};
    const seen = new Set(), items = value.items.map(item=>normalizeDayRecord(item,now)).filter(item=>item && !seen.has(item.id) && seen.add(item.id));
    return {items,activeId:items.some(item=>item.id===value.activeId) ? value.activeId : items[0]?.id || null};
  }
  function clampRecordDate(parts, maximum) {
    let [year,month,day] = parts;
    year = Math.max(1900,Math.min(maximum.getFullYear(),year));
    month = Math.max(1,Math.min(year === maximum.getFullYear() ? maximum.getMonth()+1 : 12,month));
    const last = year === maximum.getFullYear() && month === maximum.getMonth()+1 ? maximum.getDate() : new Date(year,month,0).getDate();
    return [year,month,Math.max(1,Math.min(last,day))];
  }
  const CITY_INDEX = [
    ['北京','beijing','bj','北京',39.90,116.40],['上海','shanghai','sh','上海',31.23,121.47],['广州','guangzhou','gz','广东',23.13,113.26],['深圳','shenzhen','sz','广东',22.54,114.06],
    ['杭州','hangzhou','hz','浙江',30.27,120.15],['成都','chengdu','cd','四川',30.57,104.07],['武汉','wuhan','wh','湖北',30.59,114.31],['重庆','chongqing','cq','重庆',29.56,106.55],
    ['天津','tianjin','tj','天津',39.13,117.20],['南京','nanjing','nj','江苏',32.06,118.80],['苏州','suzhou','sz','江苏',31.30,120.58],['宁波','ningbo','nb','浙江',29.87,121.55],
    ['西安','xian','xa','陕西',34.26,108.94],['郑州','zhengzhou','zz','河南',34.75,113.62],['长沙','changsha','cs','湖南',28.23,112.94],['厦门','xiamen','xm','福建',24.48,118.09],
    ['福州','fuzhou','fz','福建',26.07,119.30],['济南','jinan','jn','山东',36.67,117.00],['青岛','qingdao','qd','山东',36.07,120.38],['合肥','hefei','hf','安徽',31.82,117.23],
    ['南昌','nanchang','nc','江西',28.68,115.86],['昆明','kunming','km','云南',25.04,102.72],['贵阳','guiyang','gy','贵州',26.65,106.63],['南宁','nanning','nn','广西',22.82,108.37],
    ['海口','haikou','hk','海南',20.04,110.20],['沈阳','shenyang','sy','辽宁',41.80,123.43],['大连','dalian','dl','辽宁',38.91,121.61],['长春','changchun','cc','吉林',43.82,125.32],
    ['哈尔滨','haerbin','heb','黑龙江',45.80,126.53],['石家庄','shijiazhuang','sjz','河北',38.04,114.51],['太原','taiyuan','ty','山西',37.87,112.55],['兰州','lanzhou','lz','甘肃',36.06,103.83]
  ].map(([title,pinyin,initials,province,latitude,longitude])=>({title,aliases:[pinyin,initials],province,countryCode:'CN',latitude,longitude,local:true,preferred:true,detail:province===title ? '中国' : province+' · 中国',name:[title,...(province===title ? [] : [province]),'中国'].join(' · ')}));
  // 常见海外城市的中文译名在地名接口中可能匹配到国内同名村镇。
  CITY_INDEX.push(...[
    ['东京',['tokyo','dongjing','dj'],'日本','JP',35.68,139.69],['大阪',['osaka','daban','db'],'日本','JP',34.69,135.50],
    ['伦敦',['london','lundun','ld'],'英国','GB',51.51,-.13],['巴黎',['paris','bali','bl'],'法国','FR',48.85,2.35],
    ['纽约',['newyork','niuyue','ny'],'美国','US',40.71,-74.01],['新加坡',['singapore','xinjiapo','xjp'],'新加坡','SG',1.29,103.85],
    ['香港',['hongkong','xianggang','xg'],'中国','CN',22.28,114.16],['澳门',['macao','macau','aomen','am'],'中国','CN',22.20,113.54],
    ['台北',['taipei','taibei','tb'],'中国','CN',25.05,121.53]
  ].map(([title,aliases,detail,countryCode,latitude,longitude])=>({title,aliases,detail,countryCode,latitude,longitude,local:true,preferred:true,name:title+' · '+detail})));
  for (const [title,aliases,province,latitude,longitude,population] of globalThis.QidianCities || []) {
    if (CITY_INDEX.some(city=>cityKey(city.title)===cityKey(title) && Math.abs(city.latitude-latitude)<.2 && Math.abs(city.longitude-longitude)<.2)) continue;
    const detail=province===title ? '中国' : province+' · 中国';
    CITY_INDEX.push({title,aliases:aliases.map(cityKey),province,detail,latitude,longitude,population,countryCode:'CN',local:true,name:title+' · '+detail});
  }
  function cityKey(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s'’\-]/g,'').replace(/[市省]$/,''); }
  function localCityMatches(query) {
    const key=cityKey(query); if (!key || key.includes(',')) return [];
    return CITY_INDEX.filter(city=>[cityKey(city.title),...city.aliases].some(name=>name.startsWith(key))).sort((a,b)=>cityMatchScore(b,query)-cityMatchScore(a,query)).slice(0,6);
  }
  function cityMatchScore(city,query) {
    const key=cityKey(query.split(',')[0]), names=[cityKey(city.title),...(city.aliases || [])];
    return (names.includes(key) ? 1000 : names.some(name=>name.startsWith(key)) ? 500 : 0)+(city.local ? 100 : 0)+(city.preferred ? 30 : 0)+(!query.includes(',') && /[\u4e00-\u9fff]/.test(query) && city.countryCode==='CN' ? 20 : 0)+(/^PPLA|^PPLC/.test(city.feature || '') ? 10 : 0)+Math.log10(1+(city.population || 0));
  }
  function rankCityResults(query,locals,results) {
    const remote=(Array.isArray(results) ? results : []).filter(city=>/^PPL(?:A\d?|C)?$/.test(city.feature_code || '')).map(city=> {
      const title=typeof city.name==='string' ? city.name.trim() : '', parts=[city.admin1,city.country].filter(part=>typeof part==='string' && part.trim() && cityKey(part)!==cityKey(title));
      const detail=[...new Set(parts)].join(' · '), location=normalizeLocation({...city,name:[title,detail].filter(Boolean).join(' · ')});
      return title && location ? {...location,title,detail,countryCode:city.country_code,feature:city.feature_code,population:Number.isFinite(city.population) ? city.population : 0} : null;
    }).filter(Boolean);
    let cities=[...locals,...remote];
    if (cities.some(city=>city.local || /^PPLA|^PPLC/.test(city.feature || '') || city.population>=10000)) cities=cities.filter(city=>city.local || /^PPLA|^PPLC/.test(city.feature || '') || city.population>=10000);
    const unique=[];
    for (const city of cities.sort((a,b)=>cityMatchScore(b,query)-cityMatchScore(a,query))) if (!unique.some(other=>cityKey(other.title)===cityKey(city.title) && other.countryCode===city.countryCode && Math.abs(other.latitude-city.latitude)<.2 && Math.abs(other.longitude-city.longitude)<.2)) unique.push(city);
    return unique.slice(0,6);
  }
  const DAY_COPY = {
    label:['来到这个世界','与世界相遇已有','这段人生已走过','在这个星球生活了','与时光同行已有','从初见世界至今'],
    birthday:['今天是你的生日，愿新的一岁自在明亮。','生日快乐，愿你一路有爱，一路有光。','新的一岁，愿平凡的日子也闪闪发亮。','愿这一岁，热爱有回响，生活有惊喜。','又长大一岁，愿你从容，也始终好奇。','今天属于你，愿快乐比愿望更早到来。','愿新的一岁，心中有盼，身边有暖。','愿你岁岁平安，也岁岁尽兴。'],
    ordinary:['每一天，都值得好好度过。','把日子过成自己喜欢的样子。','慢慢走，也会抵达喜欢的远方。','生活的美好，藏在寻常的一天。','一路走来，每一步都算数。'],
    waiting:['心有所期，一天更近一天。','期待的日子，正在慢慢靠近。','给期待一点时间，也给自己一点从容。'],
    passed:['这段倒数已走过目标日。','重要的日子已经抵达，故事还在继续。','日子向前，留下的回忆也在发光。'],
    zero:['今天，就是这个重要的日子。','这一刻，值得为自己好好记录。','日历上的这一天，有特别的意义。'],
    future:['还未到起始日期，期待那一天。','故事还未开始，期待已经在路上。'],
    empty:['添加日期，让重要的日子有迹可循。','把重要的日子，轻轻记在这里。']
  };
  function dayCopy(record,info,isBirthday,choose) {
    const type=isBirthday ? 'birthday' : !info ? 'empty' : info.days===0 ? 'zero' : record.mode==='down' ? info.days>0 ? 'waiting' : 'passed' : info.days<0 ? 'future' : 'ordinary';
    return {label:record?.kind==='birthday' && record.title===DAY_KINDS.birthday.title ? choose('label',DAY_COPY.label) : record?.title || '记录重要的日子',caption:choose(type,DAY_COPY[type])};
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
    if ($('#birthday-editor').matches(':popover-open')) $('#birthday-editor').hidePopover();
    for (const [button,panel] of [['#weather-city-toggle','#weather-picker'],['#birthday-toggle','#day-editor'],['#day-toggle','#day-picker']]) setDisclosure($(button),$(panel),false);
    $('#widget-pair').inert = open; $('#widget-pair').setAttribute('aria-hidden',String(open));
    $('.side-widgets').classList.toggle('hot-expanded',open); setDisclosure($('#hot-toggle'),$('#hot-collapse'),open);
    $('#hot-toggle .widget-toggle-hint').textContent = open ? '收起' : '点击展开';
    if (open && !hotLoaded) { hotLoaded = true; loadHot(hotSource); }
    if (!open) setHotSourcePicker(false);
  });
  $('#weather-city-toggle').addEventListener('click', () => {
    const open = $('#weather-city-toggle').getAttribute('aria-expanded') !== 'true';
    setDisclosure($('#weather-city-toggle'),$('#weather-picker'),open);
    if (open) { showCityPresets(); $('#weather-query').focus({preventScroll:true}); }
  });
  $('#birthday-toggle').addEventListener('click',()=>openDayEditor(currentDay()));
  $('#day-toggle').addEventListener('click',()=> {
    const open = $('#day-toggle').getAttribute('aria-expanded') !== 'true';
    renderDayOptions(); setDisclosure($('#day-toggle'),$('#day-picker'),open);
    if (open) { moveDayIndicator(); $('#day-options [aria-pressed=true]')?.focus({preventScroll:true}); }
  });
  for (const [button,panel] of [['#weather-city-toggle','#weather-picker'],['#birthday-toggle','#day-editor'],['#day-toggle','#day-picker']]) {
    $(panel).addEventListener('toggle',event=>$(button).setAttribute('aria-expanded',String(event.newState==='open')));
  }
  let wheelParts, wheelTimers = [], wheelLimit = new Date(), wheelTarget;
  const wheelIds = ['#birthday-year', '#birthday-month', '#birthday-day'];
  function wheelMaximum(index) {
    return index === 0 ? wheelLimit.getFullYear() : index === 1 ? (wheelParts[0] === wheelLimit.getFullYear() ? wheelLimit.getMonth() + 1 : 12) : clampRecordDate([wheelParts[0], wheelParts[1], 31], wheelLimit)[2];
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
    const before = [...wheelParts]; wheelParts[index] = value; wheelParts = clampRecordDate(wheelParts,wheelLimit);
    const wheel = $(wheelIds[index]);
    for (const option of wheel.children) option.setAttribute('aria-selected', String(Number(option.textContent) === wheelParts[index]));
    wheel.setAttribute('aria-activedescendant', `date-option-${index}-${wheelParts[index]}`);
    for (let next = index + 1; next < 3; next++) if (before[index] !== wheelParts[index] || before[next] !== wheelParts[next]) renderWheel(next);
    updateWheelValue();
  }
  function initializeWheels(value) {
    wheelParts = clampRecordDate(value.split('-').map(Number),wheelLimit);
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
  let dayState = normalizeDayState(read('dayRecords',null),read('birthday',null)), editingDayId = null;
  function currentDay() { return dayState.items.find(item=>item.id===dayState.activeId) || null; }
  function birthdayFestival(now) {
    return dayState.items.some(item=>item.kind==='birthday' && birthdayInfo(item.start,now)?.today) ? ['生日快乐','生日快乐！愿新的一岁，平安有趣，热爱常在。'] : null;
  }
  window.QidianBirthday = {forDate:birthdayFestival};
  function persistDays(next,error) {
    try { localStorage.setItem('yql.dayRecords',JSON.stringify(next)); }
    catch { error.textContent='浏览器暂时无法保存，请检查本地存储权限后重试。'; error.hidden=false; return false; }
    dayState=next; error.hidden=true; return true;
  }
  const copyChoices=new Map();
  function chooseDayCopy(key,pool) { if (!copyChoices.has(key)) copyChoices.set(key,pool[Math.floor(Math.random()*pool.length)]); return copyChoices.get(key); }
  function renderDayRecord() {
    const record=currentDay(), info=dayRecordInfo(record), birthdayToday=record?.kind==='birthday' && birthdayInfo(record.start)?.today;
    $('#day-toggle span').textContent=record ? (record.kind==='birthday' && record.title===DAY_KINDS.birthday.title ? '生日' : record.title) : '选择内容';
    const copy=dayCopy(record,info,birthdayToday,chooseDayCopy);
    $('#life-label').textContent=copy.label; $('#life-label').title=copy.label; $('#day-toggle').title=record?.title || '选择记日内容'; $('#life-days').textContent=info ? info.days.toLocaleString('zh-CN') : '—';
    $('#birthday-caption').textContent=copy.caption;
    $('#birthday-toggle').firstChild.textContent=record ? record.start ? '编辑记录' : '填写生日' : '添加记日';
  }
  function moveDayIndicator() {
    const selected=$('#day-options [aria-pressed=true]'); if (selected) moveSelectionIndicator($('#day-options'),selected,$('#day-options .engine-indicator'));
  }
  function renderDayOptions() {
    $('#day-options').querySelectorAll('button').forEach(button=>button.remove()); $('#day-picker-error').hidden=true;
    for (const record of dayState.items) {
      const button=document.createElement('button'); button.type='button'; button.textContent=record.kind==='birthday' && record.title===DAY_KINDS.birthday.title ? DAY_KINDS.birthday.name : record.title;
      button.setAttribute('aria-pressed',String(record.id===dayState.activeId)); button.dataset.dayId=record.id;
      button.addEventListener('click',()=> {
        if (!persistDays({...dayState,activeId:record.id},$('#day-picker-error'))) return;
        $('#day-options').querySelectorAll('button').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
        moveDayIndicator(); renderDayRecord(); animateChange($('#day-display'),[{opacity:.4,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}]);
        setDisclosure($('#day-toggle'),$('#day-picker'),false); $('#day-toggle').focus({preventScroll:true});
      }); $('#day-options').append(button);
    }
  }
  $('#day-options').addEventListener('keydown',event=> {
    const buttons=Array.from($('#day-options').querySelectorAll('button')), index=buttons.indexOf(event.target);
    const next=event.key==='ArrowRight' || event.key==='ArrowDown' ? (index+1)%buttons.length : event.key==='ArrowLeft' || event.key==='ArrowUp' ? (index+buttons.length-1)%buttons.length : event.key==='Home' ? 0 : event.key==='End' ? buttons.length-1 : -1;
    if (next>=0 && buttons[next]) { event.preventDefault(); buttons[next].focus(); }
  });
  new ResizeObserver(moveDayIndicator).observe($('#day-options'));
  function draftDay() { return {id:editingDayId || 'draft',kind:$('[name=day-kind]:checked').value,title:$('#day-title').value,start:$('#day-start').value,end:$('#day-end').value,mode:$('[name=day-mode]:checked').value}; }
  function updateDayDraft() {
    const draft=draftDay(), info=dayRecordInfo(draft);
    $('#day-start-pick').firstChild.textContent=draft.start || '选择日期'; $('#day-end-pick').firstChild.textContent=draft.end || '今天（自动更新）'; $('#day-end-clear').hidden=!draft.end;
    $('#day-method-note').textContent=draft.mode==='down' ? '倒数 = 起始日期 − 截止日期。倒数到某天时，将起始日期设为目标日。' : '正数 = 截止日期 − 起始日期。适合记录已经过的天数。';
    $('#day-preview').textContent=info ? `预览：${draft.title.trim() || '这段时光'} ${info.days.toLocaleString('zh-CN')} 天` : '选择起始日期，即可预览记日。';
  }
  function openDayEditor(record=null) {
    if ($('#day-picker').matches(':popover-open')) $('#day-picker').hidePopover();
    editingDayId=record?.id || null; const draft=record || {kind:'anniversary',title:DAY_KINDS.anniversary.title,mode:'up',start:localDateKey(new Date()),end:''};
    $(`[name=day-kind][value=${draft.kind}]`).checked=true; $(`[name=day-mode][value=${draft.mode}]`).checked=true;
    $('#day-title').value=draft.title; $('#day-start').value=draft.start; $('#day-end').value=draft.end;
    $('#day-editor-title').textContent=record ? '编辑记日' : '添加记日'; $('#day-delete').hidden=!record; $('#day-error').hidden=true;
    updateDayDraft(); setDisclosure($('#birthday-toggle'),$('#day-editor'),true); $('#day-title').focus({preventScroll:true});
  }
  $('#day-add').addEventListener('click',()=>openDayEditor());
  $('#day-form').addEventListener('input',updateDayDraft);
  document.querySelectorAll('[name=day-kind]').forEach(input=>input.addEventListener('change',()=> {
    const preset=DAY_KINDS[input.value]; $('#day-title').value=preset.title; $(`[name=day-mode][value=${preset.mode}]`).checked=true; updateDayDraft();
  }));
  $('#day-end-clear').addEventListener('click',()=> { $('#day-end').value=''; updateDayDraft(); });
  for (const target of ['start','end']) $('#day-'+target+'-pick').addEventListener('click',()=> {
    wheelTarget=target; const birthStart=target==='start' && draftDay().kind==='birthday'; wheelLimit=birthStart ? new Date() : new Date(2100,11,31);
    $('#date-wheel-title').textContent=target==='start' ? '起始日期（公历）' : '截止日期（公历）';
    $('#birthday-editor').showPopover(); initializeWheels($('#day-'+target).value || (birthStart ? '2000-01-01' : localDateKey(new Date()))); $('#birthday-year').focus({preventScroll:true});
  });
  $('#day-form').addEventListener('submit',event=> {
    event.preventDefault(); const draft=draftDay(), record=normalizeDayRecord({...draft,id:editingDayId || crypto.randomUUID()});
    if (!record || !record.start) { $('#day-error').textContent=draft.kind==='birthday' ? '请选择有效的出生日期，不能晚于今天。' : '请填写名称和有效的起始日期。'; $('#day-error').hidden=false; return; }
    const items=editingDayId ? dayState.items.map(item=>item.id===editingDayId ? record : item) : [...dayState.items,record];
    if (!persistDays({items,activeId:record.id},$('#day-error'))) return;
    setDisclosure($('#birthday-toggle'),$('#day-editor'),false); renderDayRecord(); $('#birthday-toggle').focus({preventScroll:true});
    document.dispatchEvent(new Event('qidian-birthday-change')); celebrateBirthday();
  });
  $('#day-delete').addEventListener('click',()=> {
    const items=dayState.items.filter(item=>item.id!==editingDayId);
    if (!persistDays({items,activeId:items[0]?.id || null},$('#day-error'))) return;
    setDisclosure($('#birthday-toggle'),$('#day-editor'),false); renderDayRecord(); $('#birthday-toggle').focus({preventScroll:true}); document.dispatchEvent(new Event('qidian-birthday-change'));
  });
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
    if (!birthdayFestival(new Date()) || document.hidden) return;
    const once = () => {
      if (document.hidden || !birthdayFestival(new Date())) return;
      const key = localDateKey(new Date());
      if (!claimBirthdayCelebration(localStorage, key)) return;
      birthdayConfetti();
    };
    if (navigator.locks) navigator.locks.request('qidian-birthday', once).catch(() => {}); else once();
  }
  $('#birthday-form').addEventListener('submit',event=> {
    event.preventDefault();
    wheelIds.forEach((selector,index)=> { clearTimeout(wheelTimers[index]); wheelParts[index]=(index===0 ? 1900 : 1)+Math.round($(selector).scrollTop/40); });
    wheelParts=clampRecordDate(wheelParts,wheelLimit); updateWheelValue();
    $('#day-'+wheelTarget).value=$('#birthday-input').value; updateDayDraft(); $('#birthday-editor').hidePopover(); $('#day-'+wheelTarget+'-pick').focus({preventScroll:true});
  });
  document.addEventListener('qidian-day-change', () => { renderDayRecord(); celebrateBirthday(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderDayRecord(); celebrateBirthday(); } });
  renderDayRecord(); document.dispatchEvent(new Event('qidian-birthday-change')); celebrateBirthday();

  let location = normalizeLocation(read('weatherLocation', null)) || { name:'上海', latitude:31.23, longitude:121.47 }, weatherVersion = 0, searchVersion = 0, searchTimer, searchRequest, memoryOnly = false;
  function showWeather(data, at, cached = false) {
    const weather = normalizeWeather(data), [condition, icon] = weatherDescription(weather.code);
    $('#weather-temperature').textContent = weather.temperature + '°'; $('#weather-condition').textContent = condition; $('#weather-icon').setAttribute('href', '#i-' + icon);
    $('#weather-details').textContent = `体感 ${weather.feels}° · 湿度 ${weather.humidity}% · 风速 ${weather.wind} km/h`;
    $('#weather-range').textContent = `今日 ${weather.low}° / ${weather.high}°`;
    $('#weather-result').hidden = false;
    $('#weather-status').textContent = `${cached ? '上次更新' : '更新于'} ${new Intl.DateTimeFormat('zh-CN', { hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(at)}${memoryOnly ? ' · 城市仅在本次会话有效' : ''}`;
  }
  async function loadWeather(force = false) {
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
    location = selected; cancelCityLookup();
    try { localStorage.setItem('yql.weatherLocation', JSON.stringify(selected)); memoryOnly = false; } catch { memoryOnly = true; }
    setDisclosure($('#weather-city-toggle'), $('#weather-picker'), false); $('#weather-city-toggle').focus(); loadWeather();
  }
  const presetCities=CITY_INDEX.slice(0,8), cityCache=new Map();
  let cityOptions=[], cityActive=-1, composing=false;
  function cancelCityLookup() { clearTimeout(searchTimer); searchRequest?.abort(); searchRequest=null; searchVersion++; }
  function renderCities(cities,presets=false,preserve=false) {
    const activeName=preserve ? cityOptions[cityActive]?.name : null;
    cityOptions=cities; cityActive=cities.findIndex(city=>city.name===activeName); $('#weather-query').removeAttribute('aria-activedescendant');
    $('#weather-cities').replaceChildren(); $('#weather-cities').classList.toggle('city-presets',presets);
    cities.forEach((city,index)=> {
      const button=document.createElement('button'); button.type='button'; button.id=`weather-city-${index}`; button.setAttribute('role','option'); button.setAttribute('aria-selected',String(index===cityActive)); button.tabIndex=-1;
      if (presets) button.textContent=city.title;
      else { const name=document.createElement('strong'); name.textContent=city.title; const detail=document.createElement('small'); detail.textContent=city.detail; button.append(name,detail); }
      button.addEventListener('click',()=>selectLocation(city)); $('#weather-cities').append(button);
    });
    if (cityActive>=0) $('#weather-query').setAttribute('aria-activedescendant',`weather-city-${cityActive}`);
    $('#weather-query').setAttribute('aria-expanded',String(cities.length>0));
  }
  function showCityPresets() {
    cancelCityLookup(); $('#weather-query').value=''; renderCities(presetCities,true);
    $('#weather-search-status').textContent='常用城市 · 支持中文、拼音和首字母'; $('#weather-cities').setAttribute('aria-busy','false');
  }
  async function searchCities() {
    cancelCityLookup(); const version=searchVersion, query=$('#weather-query').value.trim(), key=cityKey(query), local=localCityMatches(query);
    if (!key) { renderCities(presetCities,true); $('#weather-search-status').textContent='常用城市 · 支持中文、拼音和首字母'; return; }
    const cached=cityCache.get(key), exact=local.some(city=>[cityKey(city.title),...city.aliases].includes(key));
    renderCities(cached || local,false,true); $('#weather-cities').setAttribute('aria-busy','false');
    if (cached || exact || key.length<2) { $('#weather-search-status').textContent=(cached || local).length ? '选择城市查看天气 · ↑ ↓ 切换，回车确认' : '继续输入城市名称或拼音。'; return; }
    $('#weather-cities').setAttribute('aria-busy',String(!local.length)); $('#weather-search-status').textContent=local.length ? '已找到常用城市，正在补充其他匹配…' : '正在查找匹配的城市…';
    const controller=new AbortController(); searchRequest=controller; const timeout=setTimeout(()=>controller.abort(),5000);
    try {
      const url=new URL('https://geocoding-api.open-meteo.com/v1/search'); url.search=new URLSearchParams({name:query,count:30,language:'zh',format:'json'});
      const response=await fetch(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'}); if (!response.ok) throw new Error('城市搜索暂不可用');
      const data=await response.json(); if (version!==searchVersion) return;
      const cities=rankCityResults(query,local,data.results); if (cities.length) { cityCache.set(key,cities); if (cityCache.size>32) cityCache.delete(cityCache.keys().next().value); }
      renderCities(cities,false,true); $('#weather-search-status').textContent=cities.length ? '选择城市查看天气 · ↑ ↓ 切换，回车确认' : '没有找到城市，试试完整名称、拼音或加上省份。';
    } catch { if (version===searchVersion) $('#weather-search-status').textContent=local.length ? '可先选择已匹配的城市；更多结果暂不可用。' : '城市搜索暂不可用，可稍后重试或使用定位。'; }
    finally { clearTimeout(timeout); if (searchRequest===controller) searchRequest=null; if (version===searchVersion) $('#weather-cities').setAttribute('aria-busy','false'); }
  }
  function queueCitySearch() {
    cancelCityLookup(); if (composing) { renderCities([]); return; }
    const query=$('#weather-query').value.trim(), key=cityKey(query), local=localCityMatches(query);
    renderCities(key ? cityCache.get(key) || local : presetCities,!key); $('#weather-cities').setAttribute('aria-busy','false');
    $('#weather-search-status').textContent=key ? local.length ? '已匹配常用城市，可直接选择。' : '正在匹配城市…' : '常用城市 · 支持中文、拼音和首字母';
    if (key) searchTimer=setTimeout(searchCities,180);
  }
  $('#weather-picker').addEventListener('toggle',event=> { if (event.newState==='closed') cancelCityLookup(); });
  $('#weather-query').addEventListener('compositionstart',()=> { composing=true; cancelCityLookup(); renderCities([]); });
  $('#weather-query').addEventListener('compositionend',()=> { composing=false; queueCitySearch(); });
  $('#weather-query').addEventListener('input',queueCitySearch);
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
  loadWeather();
})();
