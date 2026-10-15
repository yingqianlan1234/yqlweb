const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});try{
 const page=await browser.newPage({viewport:{width:1382,height:956}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.SITE_URL||'http://127.0.0.1:4173');
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');x.fillStyle='#768d86';x.fillRect(0,0,320,180);return c.toDataURL().split(',')[1];});
 await page.locator('#background-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await page.waitForFunction(()=>document.body.classList.contains('has-background')&&!wallpaperInkPending);
 await page.locator('#settings-open').click();await page.locator('#settings-tab-appearance').click();
 assert.equal(await page.locator('#setting-glass-transparency').getAttribute('max'),'100');
 for(const [value,label] of [[0,'较清晰'],[40,'较清晰'],[41,'通透'],[65,'通透'],[66,'高通透'],[85,'高通透'],[86,'极高通透'],[100,'极高通透']]){
  await page.locator('#setting-glass-transparency').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
  await page.waitForFunction(v=>document.querySelector('#glass-transparency-value').value===v+'%',value);
  assert((await page.locator('#glass-transparency-hint').innerText()).startsWith(label));assert.equal(await page.evaluate(()=>Number(document.documentElement.style.getPropertyValue('--glass-opacity'))),1-value/100);
 }
 await page.evaluate(()=>setThemePreference('dark'));assert.equal(await page.locator('#setting-glass-transparency').inputValue(),'100');
 assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--glass-tint')),'0 0 0');
 await page.reload();await page.locator('#settings-open').click();assert.equal(await page.locator('#setting-glass-transparency').inputValue(),'100');
 const batched=await page.evaluate(async()=>{
  const original=applyAppearance,oldStore=Storage.prototype.setItem;let calls=0,writes=0,samples=0;const sample=wallpaperInkContext.getImageData;
  applyAppearance=()=>{calls++;return original();};Storage.prototype.setItem=function(key,value){if(key==='yql.glassTransparency')writes++;return oldStore.call(this,key,value);};wallpaperInkContext.getImageData=function(...args){samples++;return sample.apply(this,args);};
  const el=document.querySelector('#setting-glass-transparency');for(let i=0;i<100;i++){el.value=90;el.dispatchEvent(new Event('input',{bubbles:true}));}
  await new Promise(requestAnimationFrame);const during=writes;el.dispatchEvent(new Event('change',{bubbles:true}));
  applyAppearance=original;Storage.prototype.setItem=oldStore;wallpaperInkContext.getImageData=sample;return{calls,writes,during,samples};
 });assert.deepEqual(batched,{calls:1,writes:1,during:0,samples:0});
 await page.locator('#settings-tab-search').click();await page.waitForTimeout(200);assert.equal(await page.locator('#settings-category-search').evaluate(e=>e.getAnimations().length),0);
 const closing=await page.evaluate(async()=>{const dialog=document.querySelector('#settings-dialog');dialog.close();await new Promise(r=>setTimeout(r,60));const opacity=Number(getComputedStyle(dialog).opacity);await new Promise(r=>setTimeout(r,150));return{opacity,display:getComputedStyle(dialog).display};});assert(closing.opacity>0&&closing.opacity<1);assert.equal(closing.display,'none');
 await page.locator('#settings-open').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#settings-tab-sites').click();assert.equal(await page.locator('#settings-category-sites').evaluate(e=>e.getAnimations().length),0);
 await page.locator('#settings-close').click();await page.waitForTimeout(180);assert.equal(await page.locator('#settings-dialog').isVisible(),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,fullTransparencyRange:true,readabilityBands:true,persistsAcrossThemesAndReload:true,batchedPreview:batched,noPersistentAnimations:true,smoothNativeClose:true,reducedMotion:true,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
