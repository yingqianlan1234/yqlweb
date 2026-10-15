const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});try{
 const page=await browser.newPage({viewport:{width:1382,height:956}});await page.route('https://v1.hitokoto.cn/**',r=>r.fulfill({json:{hitokoto:'每次出发，都是新的可能。',from:'测试'}}));await page.route('https://uapis.cn/**',r=>r.fulfill({json:{list:Array.from({length:15},(_,i)=>({title:'热点'+i,url:'https://example.com'}))}}));
 await page.goto(process.env.SITE_URL||'http://127.0.0.1:4173');
 const result=await page.evaluate(async()=>{
  const css=await (await fetch(document.querySelector('link[rel=stylesheet]').href)).text();
  const baseline=css.split('/* 新拟态只用于默认背景')[0];
  const sheet=document.createElement('style');document.head.append(sheet);for(const link of document.querySelectorAll('link[rel=stylesheet]'))link.disabled=true;
  document.documentElement.dataset.motion='off';
  const selectors=['.search-box','#search-engine-picker','#site-category-picker','.settings-button','.search-submit','#shortcuts .shortcut-link'];
  const snapshot=()=>Object.fromEntries(selectors.map(s=>{const el=document.querySelector(s),c=getComputedStyle(el),p=getComputedStyle(el,'::before');return[s,[c.backgroundColor,c.boxShadow,c.color,c.border,c.padding,c.borderRadius,p.backgroundColor,p.boxShadow]];}));
  const comparisons={};
  for(const theme of ['light','dark']){setThemePreference(theme);document.body.classList.add('has-background');sheet.textContent=baseline;const before=snapshot();sheet.textContent=css;comparisons[theme]={before,after:snapshot()};}
  document.body.classList.remove('has-background');setThemePreference('light');
  const colors={};for(const theme of ['light','dark']){setThemePreference(theme);colors[theme]=['.site-name','.site-domain','#site-category-toggle'].map(s=>{const c=getComputedStyle(document.querySelector(s));return[c.color,getComputedStyle(document.body).getPropertyValue('--bg').trim()];});}
  setThemePreference('light');return{comparisons,colors,defaultShadow:getComputedStyle(document.querySelector('#shortcuts .shortcut-link')).boxShadow};
 });
 for(const pair of Object.values(result.comparisons))assert.deepEqual(pair.after,pair.before);
 assert.notEqual(result.defaultShadow,'none');
 const lum=a=>a.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
 for(const values of Object.values(result.colors))for(const [fg,bg] of values){const a=lum(fg.match(/[\d.]+/g).slice(0,3).map(Number)),hex=bg.slice(1),b=lum([0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,JSON.stringify({fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}));}
 await page.locator('#query').focus();await page.waitForTimeout(350);assert((await page.locator('.search-box').evaluate(e=>getComputedStyle(e).boxShadow)).includes('32px'));await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 for(const theme of ['light','dark']){await page.evaluate(t=>setThemePreference(t),theme);await page.screenshot({path:'artifacts/neumorphism-'+theme+'.png',fullPage:true});}
 console.log(JSON.stringify({passed:true,wallpaperLightAndDarkUnchanged:true,defaultNeumorphism:true,searchGlowPreserved:true,textContrast:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

