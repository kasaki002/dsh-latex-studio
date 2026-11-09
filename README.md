# dsh-latex-studio

引擎用**便携版 MiKTeX**（xelatex + pdflatex），不写注册表、不改 PATH、不需要管理员权限。

## 安装

```bash
npm install @kasaki002/dsh-latex-studio
```

也可以在 DSH 的插件管理里填包名 `@kasaki002/dsh-latex-studio`，或者从仓库直装
`github:kasaki002/dsh-latex-studio`。本地开发用 `link:` 指向工作目录，改完刷新页面就生效。

第一次打开会提示「未安装引擎」，点一下那个按钮（约 150 MB，走清华 TUNA 镜像）就能用了。

## 入口

- **会话视图**：会话顶部的 **LaTeX** 页签。工具栏只留「保存 / 编译」；「更多」里是下载 PDF
  （编译成功后才有）、在浏览器打开、拖入窗口；左上角有一个「↺」图标按钮用于重置。
- **设置 → LaTeX 工作室**：当前引擎信息 + 会话视图开关 + 「打开web端」按钮。视图里没有重复控件。
  - 引擎一栏显示版本与安装状态，带「重新检测」；第一次识别成功后结果写进
    `engines.json`，之后启动直接读它（只检查文件还在不在），不再每次进页面都扫一遍、跑 `--version`。
  - 开关控制是否显示上面那个页签。
  - 开关是全局的，所有会话、所有浏览器共用；刷新页面后依然生效。
- **网页版**：`http://127.0.0.1:<DSH 端口>/dsh-latex/`。桌面版界面跑在 `dsh-app://app` 里，
  `window.open` 会被 Electron 拦掉，所以按钮由 Host 调系统默认浏览器打开，并带一张 2 分钟、
  一次性的票据换取本站 session cookie（只对 `/dsh-latex` 生效，12 小时）。直接粘地址而没有
  票据或会话时返回 401，页面会提示从哪里打开。

### 网页版功能

- **公式面板**：右上角「∑ 公式」三个页签：
  - **符号**：10 组常用符号（希腊字母、关系、箭头、大型运算、括号、矩阵……），点一下按光标
    插入；「包 `$…$`」勾选时插入行内数学，取消就只插命令（在已有公式环境里用）。
  - **模板**：10 组常用公式/环境（二次方程、柯西不等式、泰勒展开、矩阵、正态分布……），
    插入完整的 `\[ … \]`；`align` 这类顶层环境原样插入。
  - **预览**：输入任意 LaTeX，防抖 700 ms 后由本地引擎编译成 PNG（`/api/formula`，按内容哈希
    缓存在 `out/_formula/`），可以「插入到文档」或下载图片；语法错误直接显示报错行。
- **分栏**：中间那条竖线可以拖动调整编辑区/预览区宽度（15%–85%），双击恢复 52%，
  聚焦后按方向键微调；比例存在 `prefs.json` 的 `split` 里，换浏览器/重启后仍然记得。
- **主题**：右上角「深色 / 浅色 / 跟随系统」三档。选「跟随系统」时用 `prefers-color-scheme`
  并实时响应系统切换（不用刷新）。选择存在 Host 的 `prefs.json`（`theme` 字段），因为端口
  每次启动都可能变，只靠 localStorage 留不住；localStorage 只作为首屏的缓存避免闪一下。
- **拖入文件**：把 `.tex` 拖进窗口任意位置会出现虚线接收区，松手后经 `/api/droptext` 在
  `latex-studio/drop/` 存一份副本并载入；`.bib` / `.sty` / `.cls` 只保存不载入。
- **拖入整个项目文件夹**：拖文件夹时会用 `webkitGetAsEntry` 读出完整相对结构，按原样逐文件
  上传到 `latex-studio/drop/tree-<id>/<文件夹>/…`（原始字节，图片不会坏），再自动打开其中的
  `.tex`。`figures/`、`chapters/`、`.bib` 都跟着过来，相对路径不会断。
- **导入文件**：打开页面内置的目录浏览器（盘符 → 目录 → `.tex`），不依赖系统对话框，也不会产生副本；
  点文件就直接载入。
- **新建**：工具栏「新建」→ 用内置目录浏览器选文件夹（只列文件夹，可直接「选择这个文件夹」）+
  填文件名，可勾选写入 ctexart 起始模板；创建后自动填好路径并载入编辑区。已存在的文件会被拒绝
  （不会覆盖），父目录不存在会自动创建；上次用的目录会记住。
- **重置**：工具栏左上角的「↺」图标按钮 → 清空路径、编辑区、预览和日志；如果当前文件是插件缓存在
  `latex-studio/drop/` 下的副本（单文件是那份 `.tex`，整目录拖入是 `drop/tree-<id>/` 整棵缓存树），
  一并删掉它。**原文件永远不动**；当前路径是普通原文件时只清空界面，不删任何东西。
- **下载 PDF**：**编译成功之后**才会出现（失败会把上一次的入口收掉）。网页端在「更多」里，
  点了走 `/api/pdf?...&download=1`（`attachment` + RFC 5987 文件名，中文名不会乱码）；会话视图
  也在「更多」里，用 fetch 取字节再 `a[download]`，桌面端的自定义协议下也能正常落盘。

## 使用

- **选文件**：「导入文件」是内置文件浏览器（盘符 → 目录 → .tex），不依赖系统弹窗。也可以把
  `.tex` 拖进窗口（浏览器拿不到绝对路径时会存一份副本到 `latex-studio/drop/`），或者拖整个
  项目文件夹，把 figures/ 一起带过来。
- **编译**：默认只跑一遍；日志里出现 `Rerun to get` / 未定义引用 / `Label(s) may have changed`
  时自动补第二遍，所以目录和交叉引用是对的。文档用 `\bibliography{refs}` 时，第一遍之后会自动
  跑 `bibtex` 再补两遍 LaTeX，引用编号不会停在 `?`；用 `\begin{thebibliography}` 内联文献的文档
  不会触发。中文选 `xelatex`（`auto` 会自己判断）。编译带 `-synctex=1`。
- **预览**：内容竖向、可滚动，图片懒加载，150 dpi 渲染（A4 约 1240×1754）。
  页脚一行是日志尾巴，会写明这次编译跑了几遍。「下载 PDF」把当前产物存到本机。
- **新建**：视图工具条「新建」→ 内置目录选择器选文件夹（只列文件夹）+ 填文件名，可勾选写入
  ctexart 起始模板；已存在的文件会被拒绝，父目录不存在会自动创建。
- **重置**：会话视图左上角的「↺」图标按钮是两段式确认（第一次点亮、4 秒内再点一次才执行）：
  清空当前文件、编辑区、草稿、预览和页码，删掉插件在 `drop/` 下的缓存副本，并清掉本会话存进
  `state.json` 的草稿——下次打开不会再恢复旧状态。**磁盘上的原文件不动**；当前不是缓存时只清空视图。
- **状态**：每个会话各存各的（`state.json` 里按 session id 分开），切会话/关窗口回来能接着干，
  两个会话不会互相覆盖草稿。

> 双向定位（点 PDF 回源码 / 双击源码跳 PDF）的接口留在服务端（`/api/locate`、`/api/forward`），界面暂时没接。

## 会话里也能编译

- `latex_status`：引擎装没装、在哪。
- `latex_compile`：传 `.tex` 路径，返回 PDF 绝对路径、遍数和日志尾部。

## 目录

```
%USERPROFILE%\.dsh\latex-studio\   （可用 DSH_LATEX_HOME 改；老的 D:\windows\AAA My program\latex-studio 如果还在会继续用）
  prefs.json   界面偏好（是否启用会话视图、网页端主题、分栏比例）
  state.json   按会话的界面状态（文件、引擎、页码、草稿）
  engines.json 引擎探测缓存（xelatex/pdflatex/lualatex 路径 + 版本）
  setup/       miktexsetup 工具
  repo/        下载下来的包仓库（装完可以删，省 150 MB）
  tex/         便携 MiKTeX 本体
  out/<id>/    编译产物（PDF、aux、log、pages/）
  drop/        浏览器拖进来时另存的副本；拖文件夹是 drop/tree-<id>/<文件夹>/ 的完整目录树
```

## 安全

`/dsh-latex/*` 注册在 DSH 的 webServer 上，用自己的前缀路由，**不走** `/api` 的默认鉴权。
所以插件在 handler 最前面调 `ctx.connection.requestRejection({ headers })`，复用 DSH 的
Host/Origin 校验和浏览器登录 cookie：没登录 401、来源不信任 403、没有认证服务 503。
这样同端口的其他程序拿不到「读写任意文件」的能力。

设置里的「打开网页」会把系统浏览器带到这个前缀下。系统浏览器没有 DSH 的 cookie，所以
`POST /api/open-url` 先发一张 2 分钟、一次性的票据（随机 24 字节，取出即删），浏览器带
`?t=` 打开时换一个 `dsh_latex_sid` cookie（`Path=/dsh-latex`、`HttpOnly`、`SameSite=Strict`、
12 小时），此后只对这个前缀生效；票据只能由已登录的界面申请，换完立即 303 到干净地址。

## 兼容和 dsh-better-sidebar 集成

已经兼容的插件有dsh-better-sidebar
装了 [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 时，本插件会通过
`ctx.betterSidebar.registerFileViewer` 注册一个「LaTeX」文件预览器（只匹配 `.tex`）：

- 在文件树里点开 `.tex`，默认显示**源码**（可编辑）；点击「编译并预览」可编译并切到
  PDF 页，之后工具条上是「重新编译 / 下载 PDF / 源码」。
- 源码模式保存会写回原文件（走 `/api/save`）并重新编译；文件超过它的可编辑阈值时只给预览、
  不显示源码模式。
- 编译在后台走本插件的 `/api/compile`，所以 bibtex、两遍 LaTeX、中文文件名这些行为一致。
- 在 Better Sidebar 的设置页 → 文件预览器列表里可以关掉「LaTeX」，`.tex` 就回到原来的
  代码编辑器；没装 better-sidebar 时这段注册不会发生，其它功能不受影响。

## 注意

- 没有 `biber` / `biblatex` 全套时，参考文献用 `bibtex`（编译流程已自动处理）或先手工写。
- 第一次编译中文会触发 MiKTeX 现场下载 `ctex` 等宏包，稍慢。
- 网页版是调试页（纯字符串 HTML），只有中文；会话视图的文案走 Client locale（中文/英文）。

## 插件页的「详细介绍」

DSH 的 设置 → 插件 里点开本插件，页面上那段介绍来自 `INTRO.zh.md` / `INTRO.en.md`，
由 `locale/zh.json`、`locale/en.json` 的 `meta.detail` 指定；GitHub 上显示的则是本 README。
两边内容可以分别维护：改 `INTRO.*.md` 只影响插件页，改 `README.md` 只影响 GitHub。
去掉 `meta.detail` 会回退成在插件页直接显示 README。
