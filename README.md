# 启页

适配手机与电脑的轻量起始页。百度、必应、Google、DuckDuckGo 可切换；输入网址直达；支持添加和删除快捷网站、深浅色切换、`/` 聚焦搜索。

网站文件全部位于 `dist/`，无需构建和后端。设置仅保存在当前浏览器，不跨设备同步，不采集搜索记录。

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
