# 启页

适配手机与电脑的轻量起始页。百度、必应、Google、DuckDuckGo 可切换；输入网址直达；支持添加和删除快捷网站、深浅色切换、`/` 聚焦搜索。

网站文件全部位于 `dist/`，无需构建和后端。设置仅保存在当前浏览器，不跨设备同步，不采集搜索记录。

本地预览：在仓库根目录运行 `python -m http.server 4173 --directory dist`，打开 `http://localhost:4173`。

可将 `dist/` 部署到静态托管平台。Sites 身份与静态目录配置位于 `.openai/hosting.json`。
