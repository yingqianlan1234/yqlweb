const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try {
 const page=await browser.newPage({viewport:{width:1382,height:956}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://uapis.cn/**',r=>r.fulfill({json:{list:Array.from({length:15},(_,i)=>({title:'热点'+i,url:'https://www.baidu.com'}))}}));
 await page.route('https://v1.hitokoto.cn/**',r=>r.fulfill({json:{hitokoto:'每天都有新发现',from:'测试'}}));
 const chooseCategory=async value=>{await page.locator('#site-category-toggle').click();await page.locator('#site-category-filter button').filter({hasText:value==='*'?'展开全部':value}).last().click();};
 const currentCategory=()=>page.locator('#site-category-filter [aria-pressed=true]').getAttribute('data-category');
 await page.goto(process.env.SITE_URL||'http://127.0.0.1:4173');
 await page.evaluate(()=>{
  localStorage.setItem('yql.sites',JSON.stringify(Array.from({length:15},(_,i)=>({name:'网站'+i,url:'https://example.com/'+i,category:i===1||i===4?'生活':'工作'}))));
  localStorage.setItem('yql.searchHistoryEnabled','false');
 });await page.reload();
 await page.locator('#settings-open').click();assert.equal(await page.locator('#manage-sites').evaluate(e=>e.open),false);assert.equal(await page.locator('#site-manager').isVisible(),false);await page.locator('#settings-tab-sites').click();await page.locator('#manage-sites>summary').click();assert.equal(await page.locator('#site-manager').isVisible(),true);await page.locator('#settings-close').click();
 await page.locator('#query').focus();assert.equal(await page.locator('#search-assist').isVisible(),false);await page.keyboard.press('Escape');
 await chooseCategory('工作');
 assert.equal(await page.locator('#shortcuts>.shortcut').count(),10);assert.equal(await page.locator('#sites-page').textContent(),'1 / 2');
 const first=page.locator('#shortcuts .site-badge').first(),target=page.locator('#shortcuts>.shortcut').nth(1);
 const a=await first.boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+20,a.y+20);await page.mouse.down();await page.mouse.move(b.x+30,b.y+20,{steps:8});await page.waitForTimeout(100);assert.equal(await page.locator('.drag-ghost').count(),1);await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('yql.sites')).slice(0,3).map(s=>s.name)),['网站2','网站1','网站0']);
 const start=await page.locator('#shortcuts .site-badge').first().boundingBox(),next=await page.locator('#sites-next').boundingBox();
 await page.mouse.move(start.x+20,start.y+20);await page.mouse.down();await page.mouse.move(next.x+20,next.y+20,{steps:8});await page.waitForTimeout(700);assert.equal(await page.locator('#sites-page').textContent(),'2 / 2');await page.mouse.up();
 await page.reload();assert.equal(await currentCategory(),'工作');
 await chooseCategory('生活');assert.equal(await page.locator('#shortcuts>.shortcut').count(),2);
 await page.locator('#add-shortcut').click();assert.equal(await page.locator('#site-category').inputValue(),'生活');
 await page.locator('#site-name').fill('新网站');await page.locator('#site-url').fill('https://new.example.com');await page.locator('#site-category').selectOption('学习');await page.locator('#add-form [type=submit]').click();await page.locator('#settings-close').click();
 assert.equal(await currentCategory(),'学习');assert.equal(await page.locator('#shortcuts>.shortcut').count(),1);
 await page.locator('#edit-toggle').click();await page.locator('#site-manager .manager-row').last().locator('[data-action=edit]').click();assert.equal(await page.locator('#site-category').inputValue(),'学习');await page.locator('#site-category').selectOption('生活');await page.locator('#add-form [type=submit]').click();await page.locator('#settings-close').click();
 assert.equal(await currentCategory(),'生活');assert.equal(await page.locator('#shortcuts>.shortcut').count(),3);
 assert.equal(await page.locator('#site-category-filter button[data-category="学习"]').count(),0);
 await chooseCategory('*');assert.equal(await page.locator('#shortcuts>.shortcut').count(),10);
 // 真正拖到收起的分类入口，自动展开后松手到目标分类。
 await chooseCategory('工作');
 const movedName=await page.locator('#shortcuts .site-name').first().textContent();
 const dragStart=await page.locator('#shortcuts .site-badge').first().boundingBox();
 const toggle=await page.locator('#site-category-toggle').boundingBox();
 await page.mouse.move(dragStart.x+18,dragStart.y+18);await page.mouse.down();await page.mouse.move(toggle.x+35,toggle.y+16,{steps:8});await page.waitForTimeout(750);
 assert.equal(await page.locator('#site-category-toggle').getAttribute('aria-expanded'),'true');
 const destination=await page.locator('#site-category-filter [data-category="生活"]').boundingBox();
 await page.mouse.move(destination.x+destination.width/2,destination.y+16,{steps:8});await page.waitForTimeout(100);
 assert.equal(await page.locator('.drag-ghost').count(),1);await page.mouse.up();
 assert.equal(await currentCategory(),'生活');
 assert.equal(await page.evaluate(name=>JSON.parse(localStorage.getItem('yql.sites')).find(site=>site.name===name).category,movedName),'生活');
 await page.reload();assert.equal(await currentCategory(),'生活');assert.equal(await page.locator('#shortcuts>.shortcut').count(),4);
 const cancelStart=await page.locator('#shortcuts .site-badge').first().boundingBox();const beforeCancel=await page.evaluate(()=>localStorage.getItem('yql.sites'));
 await page.mouse.move(cancelStart.x+18,cancelStart.y+18);await page.mouse.down();await page.mouse.move(cancelStart.x+80,cancelStart.y+18,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await page.evaluate(()=>localStorage.getItem('yql.sites')),beforeCancel);assert.equal(await page.locator('.drag-ghost').count(),0);
 await page.locator('#site-category-toggle').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#site-category-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#site-category-toggle').getAttribute('aria-expanded'),'false');

 for(const theme of ['light','dark']){
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
  const result=await page.locator('.site-category-bar').evaluate(el=>{const st=getComputedStyle(el),bg=getComputedStyle(document.documentElement).getPropertyValue('--bg');return{fg:st.color,bg};});
  const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number);const lum=a=>a.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
  const fg=lum(rgb(result.fg)),hex=result.bg.trim().slice(1),bg=lum([0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));assert((Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)>=4.5);
 }
 await page.evaluate(()=>document.documentElement.dataset.theme='light');
 for(const width of [1382,390,320]){await page.setViewportSize({width,height:956});await page.waitForTimeout(300);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#site-category-toggle').click();await page.waitForTimeout(400);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/categories-'+width+'.png',fullPage:true});await page.keyboard.press('Escape');}
 await page.setViewportSize({width:1382,height:956});await page.locator('#edit-toggle').click();
 const managerFirst=page.locator('#site-manager .manager-row').first();const managedName=await managerFirst.locator('strong').textContent();
 await managerFirst.locator('.manager-category').click();await page.locator('#manager-category-menu [data-value="工具"]').click();
 assert.equal(await page.evaluate(name=>JSON.parse(localStorage.getItem('yql.sites')).find(s=>s.name===name).category,managedName),'工具');
 await page.locator('#site-manager .manager-row').first().locator('.manager-category').click();await page.locator('#manager-category-menu [data-value="*new*"]').click();
 assert.equal(await page.locator('#new-category-name').isVisible(),true);await page.locator('#new-category-name').fill('设计资料');await page.locator('#add-form [type=submit]').click();
 assert.equal(await page.evaluate(name=>JSON.parse(localStorage.getItem('yql.sites')).find(s=>s.name===name).category,managedName),'设计资料');
 assert.equal(await page.locator('#site-category option[value="设计资料"]').count(),1);
 for(const width of [1382,320]){await page.setViewportSize({width,height:956});await page.locator('#manage-sites>summary').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/category-management-'+width+'.png',fullPage:true});assert(await page.locator('#settings-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));}
 await page.locator('#settings-close').click();await page.reload();await page.locator('#settings-open').click();assert.equal(await page.locator('#manage-sites').evaluate(e=>e.open),false);await page.locator('#settings-close').click();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,categoryCreateEditFilter:true,collapsedManager:true,oneClickCategories:true,customCategory:true,filteredDragAndCrossPage:true,crossCategoryDragAndCancel:true,pickerKeyboard:true,historyDisabledHidesPanel:true,persistence:true,responsive:true,contrast:true,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
