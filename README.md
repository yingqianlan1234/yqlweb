# 栖点

适配手机与电脑的轻量起始页。百度、必应、Google、DuckDuckGo 可切换；输入网址直达；支持添加和删除快捷网站、深浅色切换、`/` 聚焦搜索。

右上角“设置”集中管理浅色 / 深色 / 跟随系统、默认搜索引擎、新标签页打开和动效；快捷网站可增删、修改名称与地址、上下排序。更改自动保存在当前浏览器，兼容旧版本已保存的设置。

“设置 → 当前背景”可选择本地图片并恢复默认。支持 JPG、PNG、WebP、AVIF、GIF，最大 20 MB；自动转为最长边不超过 2560px 的静态 JPEG，保存在当前浏览器的 IndexedDB，不上传、不跨设备同步。背景居中铺满；顶部、中间与底部统一使用支持深浅主题的液态玻璃效果，适配深浅主题。

“设置 → Wallpaper Engine 壁纸库”可选择 `steamapps/workshop/content/431960` 或单个壁纸项目目录，通过 `project.json` 读取名称、预览图与媒体文件。支持按名称和文件夹编号搜索、点击切换：浏览器支持的视频直接静音循环播放，场景和网页壁纸仅用预览图，不运行 `.pkg`、HTML 或可执行文件。文件不会上传；只将当前选中的背景保存到本浏览器。刷新后背景保留；支持目录接口的浏览器会记住目录并恢复壁纸库，权限失效时点击授权；其他浏览器需重新选择目录。关闭动效、系统减少动态效果或标签页不可见时，背景视频暂停。大视频需要足够的浏览器本地存储空间，保存失败会保留原背景。

网站文件全部位于 `dist/`，无需构建和后端。设置仅保存在当前浏览器，不跨设备同步，不采集搜索记录。

`index.html` 为 CSS 和 JavaScript 引用附加内容版本号（`?v=...`），避免浏览器混用不同发布版本。每次修改对应资源后，需同步更新该引用的版本号。

默认入口使用随站点保存的官方图标，来源见 `dist/icons/sources.json`；新增网站尝试加载其 `/favicon.ico`，不发送来源页面信息，失败时回退文字标识。搜索引擎使用居中滑动选中状态，交互动效遵守系统“减少动态效果”设置。

本地预览：在仓库根目录运行 `python -m http.server 4173 --directory dist`，打开 `http://localhost:4173`。

线上地址：https://yingqianlan1234.github.io/yqlweb/

GitHub Pages 从 `gh-pages` 分支根目录发布。修改 `dist/` 并提交后，发布更新：

```powershell
git push https://github.com/yingqianlan1234/yqlweb.git HEAD:main
git subtree split --prefix dist -b gh-pages
git push https://github.com/yingqianlan1234/yqlweb.git gh-pages:gh-pages
```

后续发布前若本地已存在 `gh-pages` 分支，用 `git subtree split --prefix dist` 输出的提交 SHA 执行 `git push https://github.com/yingqianlan1234/yqlweb.git <SHA>:gh-pages` 即可，无需重建该分支。

原 Sites 配置保留于 `.openai/hosting.json`。

壁纸参数：在设置的当前背景区调节完整显示/铺满裁切、亮度、模糊；视频额外支持播放/暂停和 0.25–2 倍速度。参数自动保存，重置参数不删除背景。视频使用原生播放；标签页隐藏或浏览器窗口失焦时卸载视频源并撤销临时地址，返回后从本地存储恢复到离开的位置，实际内存回收由浏览器管理。

记住壁纸目录：支持 File System Access API 的浏览器可选择并记住目录；目录权限有效时刷新自动恢复，否则点击授权已保存目录。忘记目录不会删除文件或已选背景。Brave 需在 brave://flags/#file-system-access-api 将 File System Access API 设为 Enabled 并手动重启；首次仍需选择一次目录并授权。目录和文件仅在本机读取，不上传。设置 → 外观：可统一调节顶部、中间与底部玻璃面板的模糊和透明度，并自选强调色。设置自动保存在本浏览器，恢复默认外观不会删除壁纸或目录记录。
顶部显示本地时间、日期和星期；底部接入一言联网短句，支持点击或键盘切换；接口失败时回退本地短句。

今日热点：抖音、百度、微博来源切换，每源前十条、每页五条，带对应原站链接与完整榜单入口。使用 https://uapis.cn/api/v1/misc/hotboard 无密钥访客额度，当前标签页按来源缓存五分钟；额度与可用性由提供方决定，见 https://uapis.cn/docs/api-reference/faq 。一言使用 https://v1.hitokoto.cn/，来源说明见 https://developer.hitokoto.cn/sentence/ 。搜索框聚焦时其他界面模糊，暂停视频壁纸并显示强调色光晕，退出后遵守原播放设置。搜索关键词不会发送给热榜或短句接口。

首页可拖动图标排序，拖入下方删除区可移除，七秒内可撤销。名称区域保持正常跳转与滚动，键盘用户可使用设置中的管理按钮。

书签连接：在设置 → 浏览器书签下载配套 Brave 扩展并解压；打开 brave://extensions，开启开发者模式，加载包含 manifest.json 的文件夹。刷新网站并连接后，可搜索、勾选书签并添加到快捷入口。扩展只在本站读取书签，不上传或修改浏览器原书签。源码位于 brave-extension/，发行包为 dist/downloads/qidian-bookmarks.zip。
