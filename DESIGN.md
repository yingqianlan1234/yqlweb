---
name: 启页
description: 简洁、搜索优先的双端上网起点
colors:
  bg: "#f7f8fa"
  surface: "#ffffff"
  fg: "#222c30"
  muted: "#626e74"
  line: "#dce2e5"
  accent: "#2b604d"
  accent-text: "#ffffff"
  soft: "#e7efe9"
  hover: "#edf0f2"
  error: "#a32323"
  dark-bg: "#161c1b"
  dark-surface: "#202826"
  dark-fg: "#e4eae6"
  dark-muted: "#a5b3ac"
  dark-line: "#404d47"
  dark-accent: "#add6bc"
  dark-accent-text: "#173b28"
  dark-soft: "#2d4035"
  dark-hover: "#2a3430"
  dark-error: "#ffb4ad"
typography:
  headline:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "42px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.035em"
  search:
    fontSize: "16px"
  label:
    fontSize: "13px"
rounded:
  control: "8px"
  action: "10px"
  badge: "12px"
  search: "15px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.control}"
    padding: "10px 21px"
    height: "43px"
---

# 启页设计规范

## Overview

遵循用户确认的简洁浅色方向，支持深色切换。中性底色、搜索优先、低装饰密度；绿色用于操作与少量识别点缀。实际实现以 `dist/style.css` 为准。

## Colors

默认使用浅色组；深色模式将同名语义映射至 `dark-` 组。正文、辅助文字、占位符至少满足 4.5:1，大字及图形至少 3:1；新增状态应分别核算两种主题。

## Typography

使用系统字体，无外部字体请求。主标题在平板缩为 35px、手机缩为 30px；搜索输入维持 16px。网站名称单行省略，域名为辅助信息。

## Layout

外层最大宽度 1248px，主内容最大宽度 790px。快捷网站默认四列，760px 及以下三列，520px 及以下两列；外层水平留白依次为 56px、28px、22px。手机添加表单纵向排列，隐藏键盘提示。

## Elevation & Depth

使用平面色阶和细边框区分表面，搜索框聚焦时增加轻微柔影。颜色过渡统一为 180ms ease-out，选中色块位移统一为 240ms cubic-bezier(.16,1,.3,1)；遵守减少动态效果设置。

## Shapes

搜索框采用柔和圆角，按钮和徽章使用较小圆角；主题切换与删除操作为圆形。操作图标使用同一线宽体系的内联 SVG；网站使用官方 favicon，白色图标底保证双主题辨识度，加载失败回退文字标识。

## Components

搜索是主操作，搜索引擎居中排列、间距充足，点击区域至少 44px 高；选中色块在选项之间平滑移动，选中项使用强调底色和反色文字。网站入口为轻量链接行，悬停微抬升并放大图标；编辑模式才显示删除按钮。添加网站使用可展开的内联表单。键盘焦点使用 2px 强调色轮廓，输入框整体显示焦点边框。入场只执行一次，不循环；减少动态效果时关闭位移、缩放与入场。

## Do's and Don'ts

- 保持搜索、常用网站、添加入口的清晰顺序。
- 同时检查双主题、窄屏可见性及实际几何，截图等待过渡稳定。
- 不添加装饰性主视觉、外部字体请求或 emoji 图标。
- 不把常用入口改为大面积彩色卡片。
