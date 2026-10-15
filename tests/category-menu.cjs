const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});try{
 const page=await browser.newPage({viewport:{width:1382,height:956}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.SITE_URL||'http://127.0.0.1:4173');await page.locator('#edit-toggle').click();
 const first=()=>page.locator('#site-manager .manager-category').first(),menu=page.locator('#manager-category-menu');
 await first().focus();await page.keyboard.press('ArrowDown');assert(await menu.evaluate(e=>e.matches(':popover-open')));assert.equal(await menu.locator('[aria-checked=true]').innerText(),'未分类');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 assert.equal(await first().innerText(),'工作');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('yql.sites'))[0].category),'工作');
 await first().click();await page.keyboard.press('Escape');assert.equal(await menu.evaluate(e=>e.matches(':popover-open')),false);assert.equal(await page.locator('#settings-dialog').evaluate(e=>e.open),true);assert(await first().evaluate(e=>e===document.activeElement));
 await first().click();await page.locator('#manage-title').click();assert.equal(await menu.evaluate(e=>e.matches(':popover-open')),false);await page.locator('#manage-sites>summary').click();
 await first().click();await page.locator('.settings-content').evaluate(e=>e.scrollTop+=50);await page.waitForTimeout(30);assert.equal(await menu.evaluate(e=>e.matches(':popover-open')),false);
 const last=page.locator('#site-manager .manager-category').last();await last.evaluate(e=>e.scrollIntoView({block:"end"}));await last.click();await page.waitForTimeout(180);const lastRect=await last.boundingBox(),up=await menu.boundingBox();assert(up.y+up.height<=lastRect.y+1);
 await page.keyboard.press('Escape');
 for(const width of [1382,320])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:956});await page.evaluate(t=>setThemePreference(t),theme);await first().scrollIntoViewIfNeeded();await first().click();await page.waitForTimeout(180);
  const r=await menu.boundingBox();assert(r.x>=0&&r.x+r.width<=width);assert(r.y>=0&&r.y+r.height<=956);assert.equal(await menu.evaluate(e=>e.getAnimations().length),0);
  const ratios=await menu.evaluate(el=>{const parse=c=>c.match(/[\d.]+/g).slice(0,3).map(Number),lum=a=>a.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0),surface=getComputedStyle(el).backgroundColor;return[...el.children].map(e=>{const c=getComputedStyle(e),a=lum(parse(c.color)),b=lum(parse(c.backgroundColor==='rgba(0, 0, 0, 0)'?surface:c.backgroundColor));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});});assert(ratios.every(r=>r>=4.5));
  await page.screenshot({path:'artifacts/category-menu-'+theme+'-'+width+'.png'});await page.keyboard.press('Escape');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await first().click();assert.equal(await menu.evaluate(e=>e.getAnimations().length),0);await page.keyboard.press('End');assert.equal(await menu.locator('button:last-child').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,keyboardSelectionAndSave:true,escapeAndOutsideClose:true,scrollClose:true,upwardPlacement:true,mobileAndThemes:true,contrast:true,reducedMotion:true,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
