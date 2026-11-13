// 客户端半边：会话里的「LaTeX」视图 + 设置里单独一页「LaTeX 工作室」。
// 数据流：这两个 UI ⇄ /dsh-latex/api/*（同源 fetch，带 DSH 登录 cookie）⇄ 服务端 lib/tex.mjs
window.__ModuleLoader__.load({
  id: '@kasaki002/dsh-latex-studio',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { createElement: h, useEffect, useRef, useState } = React

    const API = '/dsh-latex'
    const NS = 'latex-studio'
    const mono = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'
    const RENDER_DPI = 150
    const card = { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2)' }
    const btn = { height: 28, padding: '0 10px', fontSize: 12.5, cursor: 'pointer', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' }
    const btnPrimary = { ...btn, background: 'var(--dsw-alias-brand-primary)', borderColor: 'var(--dsw-alias-brand-primary)', color: '#fff' }
    const input = { height: 28, padding: '0 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontFamily: mono }

    // 新建文件时可选写入的起始模板（和网页端保持一致）。
    const NEW_TEMPLATE = [
      '\\documentclass[UTF8]{ctexart}',
      '\\usepackage{amsmath,amssymb}',
      '\\title{标题}',
      '\\author{}',
      '\\date{\\today}',
      '\\begin{document}',
      '\\maketitle',
      '',
      '正文写这里。',
      '',
      '\\end{document}',
      '',
    ].join('\n')

    // ---------------------------------------------------------------- 文案
    // 走 Client locale 服务；服务不在时退回中文，保证非 Web 组成也能跑。
    const DICT = {
      zh: {
        'view.label': 'LaTeX',
        'view.checking': '检查中…',
        'view.ready': '引擎就绪',
        'view.installing': '安装中：{phase}',
        'view.notInstalled': '未安装引擎',
        'view.install': '安装引擎（约 150 MB）',
        'view.engineAuto': '自动',
        'view.save': '保存',
        'view.download': '下载 PDF',
        'view.downloaded': '已下载 {name}',
        'view.downloadFailed': '下载失败：{error}',
        'view.reset': '重置',
        'view.resetHint': '再点一次会清空当前编辑区和预览，并删除插件缓存的副本（若有）。磁盘上的原文件不会动。',
        'view.resetDone': '已重置，缓存副本已删除（原文件未动）。',
        'view.resetDoneNoCache': '已重置（当前不是插件缓存，没有删除任何文件）。',
        'view.resetFailed': '恢复默认失败：{error}',
        'view.more': '更多 ▾',
        'view.moreClose': '收起 ▴',
        'view.openWeb': '在浏览器打开',
        'view.openWebOpening': '正在打开…',
        'view.openWebDone': '已在系统浏览器里打开网页版。',
        'view.openWebFailed': '打开网页失败：{error}',
        'view.compile': '编译',
        'view.compiling': '编译中…',
        'view.pathPlaceholder': 'C:\\path\\to\\doc.tex',
        'view.new': '新建',
        'view.newTitle': '新建 LaTeX 文件',
        'view.newDir': '目录',
        'view.newName': '文件名',
        'view.newTemplate': '写入 ctexart 起始模板',
        'view.newChooseDir': '选择…',
        'view.newCreate': '创建',
        'view.newCreating': '创建中…',
        'view.newCancel': '取消',
        'view.newNeedDir': '先选一个目录',
        'view.newNeedName': '先填文件名',
        'view.newBadName': '文件名不能包含 \\ / : * ? " < > |',
        'view.newDone': '已新建 {path}',
        'view.pickThisDir': '选这个文件夹',
        'view.emptyDirOnly': '这个目录下没有子目录',
        'view.browse': '导入文件',
        'view.browseHint': '打开内置文件浏览器，选一个 .tex',
        'view.sortName': '名称',
        'view.sortTime': '时间',
        'view.sortHint': '点一下在「名称 / 时间 / 反序」之间切换',
        'view.drop': '拖入…',
        'view.dropTitle': '开一个独立窗口接拖放，不会掉进对话里',
        'view.load': '载入',
        'view.editorPlaceholder': '在这里写 LaTeX。拖文件进来、或点「导入文件」选一个 .tex。',
        'view.pages': '{n} 页 · 直接往下滚',
        'view.pageAlt': '第 {n} 页',
        'view.emptyPreview': '编译后这里出预览',
        'view.lastCompile': '上次编译 {time}',
        'view.initialLog': '拖一个 .tex 进来，或者点「导入文件」。',
        'view.dragTitle': '把 .tex 拖到这个窗口里',
        'view.dragSub': '这块是独立的接收区，松手不会掉进对话窗口',
        'view.pickFromDir': '从目录里选',
        'view.close': '关闭',
        'view.up': '↑ 上一级',
        'view.computer': '这台电脑',
        'view.emptyDir': '这个目录里没有子目录和 .tex 文件',
        'view.opened': '已打开 {path}（{chars} 字符）',
        'view.openFailed': '打开失败：{error}',
        'view.listFailed': '列目录失败：{error}',
        'view.needFile': '先选一个文件',
        'view.saved': '已保存 {path}（{bytes} 字节）',
        'view.saveFailed': '保存失败：{error}',
        'view.alreadyInstalling': '已经在装了',
        'view.compileFailed': '编译失败：{error}',
        'view.compileOk': '✓ 编译成功（{engine}，{passes} 遍，{sec}s）',
        'view.compileBad': '✗ 编译失败（{engine}，{passes} 遍，{sec}s）',
        'view.badFile': '只接 .tex / .bib / .sty / .cls，收到的是 {name}',
        'view.dropped': '已接收 {name} → 另存为 {path}（浏览器拿不到原路径，拖进来的是副本）',
        'view.droppedWithRels': '已接收 {name} → 另存为 {path}。这是副本，文档里的相对路径（figures/ 等）不会跟过来，编译会找不到图；建议点「导入文件」直接打开原文件。',
        'view.dropFailed': '接收文件失败：{error}',
        'view.restoredDraft': '已恢复 {file}\n草稿里有未保存的修改，直接接着改；点「保存」才会写回磁盘。',
        'settings.title': 'LaTeX 工作室',
        'settings.desc': '在会话里显示「LaTeX」页签：写 .tex、编译、预览 PDF。',
        'settings.switchDesc': '关闭后会话里的「LaTeX」页签会隐藏；网页版仍然可以从下面打开。',
        'settings.switchLabel': '启用会话里的 LaTeX 视图',
        'settings.webTitle': '网页版编辑器',
        'settings.engineTitle': '当前引擎',
        'settings.engineChecking': '检查中…',
        'settings.engineReady': '已安装',
        'settings.engineMissing': '未安装',
        'settings.engineRecheck': '重新检测',
        'settings.engineRechecking': '检测中…',
        'settings.on': '已开启',
        'settings.off': '已关闭',
        'settings.open': '打开网页',
        'settings.openHint': '用系统默认浏览器打开网页版 LaTeX 编辑器',
        'settings.opening': '正在打开…',
        'settings.opened': '已在系统浏览器里打开（没看到窗口的话，检查一下浏览器窗口或任务栏）。',
        'settings.openFailed': '打开失败：{error}',
        'settings.saveFailed': '保存失败，已恢复原状态',
        'settings.docTitle': '文档输出',
        'settings.docPrefer': '优先生成 .tex 文件',
        'settings.docPreferHint': '勾选后，要文档时只给 .tex，不再默认输出 docx + pdf。',
        'settings.docPdf': '同时生成 PDF',
        'settings.docPdfHint': '在 .tex 之外再编译一份 PDF（需要已装引擎）。',
        'settings.docWorkspace': '工作区',
        'settings.docWorkspaceHint': '只对选中的 DSH 工作区生效：往它的 AGENTS.md 里加一行说明；取消勾选就把那一行删掉，恢复原来的输出习惯。',
        'settings.docWorkspaceEmpty': '不限定工作区',
        'settings.docWorkspaceFailed': '读不到工作区列表：{error}',
        'settings.docWorkspaceNone': '还没有工作区',
        'settings.docStale': '插件服务端还是旧版本（{error}），重启 DSH 后这些设置才能保存。',
        'settings.liveTitle': '实时编译',
        'settings.liveHint': '改完自动编译。停止输入后：安静 1.5 秒就编译；保存后：只在保存时编译。长文档会比较吃 CPU。',
        'settings.liveOff': '关闭',
        'settings.liveIdle': '停止输入后',
        'settings.liveSave': '保存后',
        'settings.liveDone': '实时编译 {mode}',
        'viewer.title': 'LaTeX',
        'viewer.preview': '预览',
        'viewer.source': '源码',
        'viewer.recompile': '重新编译',
        'viewer.compilePreview': '编译并预览',
        'viewer.compiling': '编译中…',
        'viewer.download': '下载 PDF',
        'viewer.save': '保存',
        'viewer.saving': '保存中…',
        'viewer.unsaved': '有未保存的修改',
        'viewer.saved': '已保存',
        'viewer.empty': '还没有预览。点「重新编译」。',
        'viewer.failed': '编译失败，见下方日志。',
        'viewer.pageAlt': '第 {n} 页',
        'viewer.saveFailed': '保存失败：{error}',
        'viewer.downloadFailed': '下载失败：{error}',
      },
      en: {
        'view.label': 'LaTeX',
        'view.checking': 'Checking…',
        'view.ready': 'Engine ready',
        'view.installing': 'Installing: {phase}',
        'view.notInstalled': 'Engine not installed',
        'view.install': 'Install engine (about 150 MB)',
        'view.engineAuto': 'Auto',
        'view.save': 'Save',
        'view.download': 'Download PDF',
        'view.downloaded': 'Downloaded {name}',
        'view.downloadFailed': 'Download failed: {error}',
        'view.reset': 'Reset',
        'view.resetHint': 'Click again to clear the editor and preview and delete the cached copy, if any. Your file on disk is not touched.',
        'view.resetDone': 'Reset done; the cached copy was removed (your file is untouched).',
        'view.resetDoneNoCache': 'Reset done (nothing deleted; this was not a cached copy).',
        'view.resetFailed': 'Reset failed: {error}',
        'view.more': 'More ▾',
        'view.moreClose': 'Less ▴',
        'view.openWeb': 'Open in browser',
        'view.openWebOpening': 'Opening…',
        'view.openWebDone': 'Opened the web editor in your browser.',
        'view.openWebFailed': 'Could not open the web editor: {error}',
        'view.compile': 'Compile',
        'view.compiling': 'Compiling…',
        'view.pathPlaceholder': 'C:\\path\\to\\doc.tex',
        'view.browse': 'Import file',
        'view.browseHint': 'Open the built-in file browser and pick a .tex',
        'view.sortName': 'Name',
        'view.sortTime': 'Modified',
        'view.sortHint': 'Click to cycle name / modified / reversed',
        'view.new': 'New',
        'view.newTitle': 'New LaTeX file',
        'view.newDir': 'Folder',
        'view.newName': 'File name',
        'view.newTemplate': 'Start from the ctexart template',
        'view.newChooseDir': 'Choose…',
        'view.newCreate': 'Create',
        'view.newCreating': 'Creating…',
        'view.newCancel': 'Cancel',
        'view.newNeedDir': 'Choose a folder first',
        'view.newNeedName': 'Enter a file name',
        'view.newBadName': 'A file name cannot contain \\ / : * ? " < > |',
        'view.newDone': 'Created {path}',
        'view.pickThisDir': 'Use this folder',
        'view.emptyDirOnly': 'No subfolders here',
        'view.drop': 'Drop…',
        'view.dropTitle': 'Open a separate drop target so files do not land in the chat',
        'view.load': 'Load',
        'view.editorPlaceholder': 'Write LaTeX here. Drop a .tex file or pick one with Import file.',
        'view.pages': '{n} pages · scroll down',
        'view.pageAlt': 'Page {n}',
        'view.emptyPreview': 'The preview appears after compiling',
        'view.lastCompile': 'Last build {time}',
        'view.initialLog': 'Drop a .tex file here, or click Import file.',
        'view.dragTitle': 'Drop the .tex file into this window',
        'view.dragSub': 'This is a separate drop area, so the file does not land in the chat',
        'view.pickFromDir': 'Pick from a folder',
        'view.close': 'Close',
        'view.up': '↑ Up',
        'view.computer': 'This computer',
        'view.emptyDir': 'No subfolders or .tex files here',
        'view.opened': 'Opened {path} ({chars} characters)',
        'view.openFailed': 'Open failed: {error}',
        'view.listFailed': 'Listing failed: {error}',
        'view.needFile': 'Pick a file first',
        'view.saved': 'Saved {path} ({bytes} bytes)',
        'view.saveFailed': 'Save failed: {error}',
        'view.alreadyInstalling': 'Already installing',
        'view.compileFailed': 'Compile failed: {error}',
        'view.compileOk': '✓ Compiled ({engine}, {passes} pass(es), {sec}s)',
        'view.compileBad': '✗ Compile failed ({engine}, {passes} pass(es), {sec}s)',
        'view.badFile': 'Only .tex / .bib / .sty / .cls are accepted, got {name}',
        'view.dropped': 'Received {name} → saved as {path} (the browser hides the original path, so this is a copy)',
        'view.droppedWithRels': 'Received {name} → saved as {path}. This is a copy, so relative paths such as figures/ are not copied with it and the build will miss them; use Import file to open the original file.',
        'view.dropFailed': 'Receiving the file failed: {error}',
        'view.restoredDraft': 'Restored {file}\nThe draft has unsaved edits; keep going, and press Save to write them back.',
        'settings.title': 'LaTeX studio',
        'settings.desc': 'Show a LaTeX tab in the conversation: write .tex, compile, preview the PDF.',
        'settings.switchDesc': 'Turning this off hides the LaTeX tab in conversations; the web editor stays available below.',
        'settings.switchLabel': 'Enable the LaTeX view in conversations',
        'settings.webTitle': 'Web editor',
        'settings.engineTitle': 'Engine',
        'settings.engineChecking': 'Checking…',
        'settings.engineReady': 'Installed',
        'settings.engineMissing': 'Not installed',
        'settings.engineRecheck': 'Detect again',
        'settings.engineRechecking': 'Detecting…',
        'settings.on': 'On',
        'settings.off': 'Off',
        'settings.open': 'Open web',
        'settings.openHint': 'Open the web LaTeX editor in your default browser',
        'settings.opening': 'Opening…',
        'settings.opened': 'Opened in your browser (check the browser window or taskbar if you do not see it).',
        'settings.openFailed': 'Could not open: {error}',
        'settings.saveFailed': 'Saving failed; reverted',
        'settings.docTitle': 'Document output',
        'settings.docPrefer': 'Prefer generating .tex files',
        'settings.docPreferHint': 'When on, document requests produce only .tex instead of the default docx + pdf.',
        'settings.docPdf': 'Also build a PDF',
        'settings.docPdfHint': 'Compile an extra PDF next to the .tex (requires an engine).',
        'settings.docWorkspace': 'Workspace',
        'settings.docWorkspaceHint': 'Applies only to the selected DSH workspace: one line is added to its AGENTS.md, and removed again when you turn the option off.',
        'settings.docWorkspaceEmpty': 'No workspace (applies nowhere)',
        'settings.docWorkspaceFailed': 'Could not read the workspace list: {error}',
        'settings.docWorkspaceNone': 'No workspaces yet',
        'settings.docStale': 'The plugin server side is still the old build ({error}); restart DSH to save these settings.',
        'settings.liveTitle': 'Live compile',
        'settings.liveHint': 'Recompile automatically: after typing pauses for 1.5s, or only when you save. Long documents use more CPU.',
        'settings.liveOff': 'Off',
        'settings.liveIdle': 'After typing pauses',
        'settings.liveSave': 'After save',
        'settings.liveDone': 'Live compile: {mode}',
        'viewer.title': 'LaTeX',
        'viewer.preview': 'Preview',
        'viewer.source': 'Source',
        'viewer.recompile': 'Recompile',
        'viewer.compilePreview': 'Compile & preview',
        'viewer.compiling': 'Compiling…',
        'viewer.download': 'Download PDF',
        'viewer.save': 'Save',
        'viewer.saving': 'Saving…',
        'viewer.unsaved': 'Unsaved changes',
        'viewer.saved': 'Saved',
        'viewer.empty': 'No preview yet. Click Recompile.',
        'viewer.failed': 'Compile failed; see the log below.',
        'viewer.pageAlt': 'Page {n}',
        'viewer.saveFailed': 'Save failed: {error}',
        'viewer.downloadFailed': 'Download failed: {error}',
      },
    }

    let tr = (key) => DICT.zh[key] ?? key
    const t = (key, vars) => {
      const s = tr(key)
      if (!vars) return s
      return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
    }

    // ---------------------------------------------------------------- 全局偏好
    // 「是否启用会话视图」由 Host 的 prefs.json 持有：所有会话、所有浏览器共用一份。
    const prefs = { viewEnabled: true, preferTex: false, docPdf: false, docWorkspace: '', liveCompile: 'off' }
    const listeners = new Set()
    const subscribe = (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    }
    const setPrefs = (patch) => {
      Object.assign(prefs, patch)
      for (const fn of [...listeners]) fn()
    }
    function usePrefs() {
      const [, bump] = useState(0)
      useEffect(() => {
        const fn = () => bump((n) => n + 1)
        return subscribe(fn)
      }, [])
      return prefs
    }

    async function api(path, init) {
      const res = await fetch(API + path, init)
      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        return { ok: false, error: text.slice(0, 300) }
      }
    }
    const post = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

    // Electron 32 起 File.path 被移除；桌面 preload 暴露了 __DSH_HOST_PATHS__.pathFor(file)。
    function nativePathOf(file) {
      try {
        if (typeof file?.path === 'string' && file.path) return file.path
        const bridge = typeof window !== 'undefined' ? window.__DSH_HOST_PATHS__ : undefined
        const resolved = bridge?.pathFor?.(file)
        return typeof resolved === 'string' && resolved ? resolved : null
      } catch {
        return null
      }
    }

    // ---------------------------------------------------------------- 会话视图
    function LatexView(props) {
      // 每个会话各存各的：切会话、关窗口回来都接着自己的文件。
      const stateKey = String(props?.sessionId ?? 'default')
      const [st, setSt] = useState(null)
      const [file, setFile] = useState('')
      const [text, setText] = useState('')
      const [doc, setDoc] = useState(null)
      const [page, setPage] = useState(1)
      const [pdfName, setPdfName] = useState('')
      const [stamp, setStamp] = useState(0)
      const [log, setLog] = useState(() => t('view.initialLog'))
      const [busy, setBusy] = useState(false)
      const [resetArmed, setResetArmed] = useState(false)
      const [newOpen, setNewOpen] = useState(false)
      const [newDir, setNewDir] = useState('')
      const [newName, setNewName] = useState('untitled.tex')
      const [newUseTemplate, setNewUseTemplate] = useState(true)
      const [newBusy, setNewBusy] = useState(false)
      const [newError, setNewError] = useState('')
      const [pickerFor, setPickerFor] = useState('file')
      const [pkAddr, setPkAddr] = useState('')
      const [pkSort, setPkSort] = useState('name')
      const [pkDesc, setPkDesc] = useState(false)
      const [moreOpen, setMoreOpen] = useState(false)
      const [openingWeb, setOpeningWeb] = useState(false)
      const [picker, setPicker] = useState(null)
      const [engine, setEngine] = useState('auto')
      const [dropOpen, setDropOpen] = useState(false)
      const poll = useRef(null)
      const saveTimer = useRef(null)
      const lastSaved = useRef(null)
      const restored = useRef(false)
      // 实时编译：磁盘上的内容、定时器、以及“正在编译/排队”标记。
      const p = usePrefs()
      const lastDisk = useRef(null)
      const liveTimer = useRef(null)
      const liveRunning = useRef(false)
      const liveQueued = useRef(false)
      const liveRef = useRef(() => {})
      const fileRef = useRef('')
      const textRef = useRef('')
      const engineRef = useRef('auto')
      fileRef.current = file
      textRef.current = text
      engineRef.current = engine

      const refresh = async () => {
        const s = await api('/api/status')
        setSt(s)
        if (s.log && s.log.length) setLog(s.log.join('\n'))
        return s
      }

      useEffect(() => {
        refresh()
        return () => {
          if (poll.current) clearInterval(poll.current)
          if (saveTimer.current) clearTimeout(saveTimer.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      const openPath = async (p) => {
        const r = await api('/api/file?path=' + encodeURIComponent(p))
        if (r.error) {
          setLog(t('view.openFailed', { error: r.error }))
          return r
        }
        setFile(r.path)
        setText(r.content)
        lastDisk.current = r.content
        setLog(t('view.opened', { path: r.path, chars: r.content.length }))
        return r
      }

      // 切会话 / 关窗口再回来：自动接着本会话上次打开的文件
      useEffect(() => {
        if (restored.current) return
        restored.current = true
        ;(async () => {
          const r = await api('/api/state?key=' + encodeURIComponent(stateKey))
          const s = r.state
          if (!s) return
          if (s.engine) setEngine(s.engine)
          if (!s.file) return
          const opened = await openPath(s.file)
          if (!opened || opened.error) return
          if (typeof s.draft === 'string' && s.draft !== opened.content) {
            setText(s.draft)
            setLog(t('view.restoredDraft', { file: s.file }))
          }
          if (s.page) setPage(s.page)
        })().catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [stateKey])

      // 每次改动都留个底：文件、引擎、页码、草稿。
      // 2.5 秒防抖 + 内容没变就不发：长文档每敲一个字都往服务端塞一份会卡。
      useEffect(() => {
        if (!restored.current) return
        if (!file) return
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          const payload = { file, engine, page, draft: text.slice(0, 400000), ts: Date.now() }
          const fingerprint = file + '|' + engine + '|' + page + '|' + text
          if (fingerprint === lastSaved.current) return
          lastSaved.current = fingerprint
          post('/api/state', { key: stateKey, state: payload }).catch(() => {})
        }, 2500)
        return () => {
          if (saveTimer.current) clearTimeout(saveTimer.current)
        }
      }, [stateKey, file, engine, page, text])

      const loadInfo = async (name) => {
        const info = await api('/api/pdfinfo?name=' + encodeURIComponent(name))
        if (info.ok) setDoc({ pages: info.pages, width: info.width, height: info.height })
        setPage(1)
        setStamp(Date.now())
      }

      const browse = async (dir) => {
        const r = await api('/api/list' + (dir ? '?dir=' + encodeURIComponent(dir) : ''))
        if (r.error) {
          setLog(t('view.listFailed', { error: r.error }))
          return
        }
        setPicker({ dir: r.dir, parent: r.parent, entries: r.entries })
        setPkAddr(r.dir || '')
      }

      // 选文件：先走内置浏览器（盘符 → 目录 → .tex）。
      const openPickerFor = async (mode) => {
        setPickerFor(mode)
        await browse(picker?.dir || '')
      }

      const save = async () => {
        if (!file.trim()) {
          setLog(t('view.needFile'))
          return
        }
        const r = await post('/api/save', { path: file.trim(), content: text })
        setLog(r.error ? t('view.saveFailed', { error: r.error }) : t('view.saved', { path: r.path, bytes: r.bytes }))
        if (!r.error) {
          lastDisk.current = text
          // 「保存后编译」模式：保存成功就顺手编一遍。
          if (p.liveCompile === 'save') liveRef.current()
        }
      }

      const installEngine = async () => {
        const r = await post('/api/install', {})
        if (!r.started) setLog(r.error || t('view.alreadyInstalling'))
        poll.current = setInterval(async () => {
          const s = await refresh()
          if (!s.installing) {
            clearInterval(poll.current)
            poll.current = null
            refresh()
          }
        }, 2000)
      }

      // 编译结果统一在这里落地：live 编译和手动「编译」共用。
      const applyCompile = async (r) => {
        if (r.error) {
          setLog(t('view.compileFailed', { error: r.error }))
          return
        }
        const head = t(r.ok ? 'view.compileOk' : 'view.compileBad', {
          engine: r.engine,
          passes: r.passes,
          sec: (r.ms / 1000).toFixed(1),
        })
        const bib = r.bibtex ? (r.bibtex.ok ? ' · bibtex ✓' : ' · bibtex ✗') : ''
        setLog(head + bib + '\n\n' + (r.log || '').split('\n').slice(-18).join('\n'))
        if (r.ok) {
          setPdfName(r.pdfName)
          await loadInfo(r.pdfName)
        } else {
          // 只有成功编译出 PDF 才给下载入口；失败就把上一次的入口收掉。
          setPdfName('')
          setDoc(null)
        }
      }

      const compile = async () => {
        if (!file.trim()) {
          setLog(t('view.needFile'))
          return
        }
        setBusy(true)
        setLog(t('view.compiling'))
        // 编之前先把编辑区落盘：不然「编译」编的是上一次保存的内容。
        if (text !== lastDisk.current) {
          const s = await post('/api/save', { path: file.trim(), content: text })
          if (s.error) {
            setBusy(false)
            setLog(t('view.saveFailed', { error: s.error }))
            return
          }
          lastDisk.current = text
        }
        const r = await post('/api/compile', { path: file.trim(), engine })
        setBusy(false)
        await applyCompile(r)
      }

      // 实时编译：有改动先落盘，再编译；同一时刻只跑一个，期间来的改动排一次队。
      const liveCompile = async () => {
        const target = fileRef.current.trim()
        if (!target) return
        if (liveRunning.current) {
          liveQueued.current = true
          return
        }
        liveRunning.current = true
        setBusy(true)
        try {
          if (textRef.current !== lastDisk.current) {
            const s = await post('/api/save', { path: target, content: textRef.current })
            if (!s.error) lastDisk.current = textRef.current
          }
          const r = await post('/api/compile', { path: target, engine: engineRef.current })
          await applyCompile(r)
        } finally {
          liveRunning.current = false
          setBusy(false)
          if (liveQueued.current) {
            liveQueued.current = false
            liveRef.current()
          }
        }
      }
      liveRef.current = liveCompile

      // 停止输入 1.5 秒就编译（只在 liveCompile = idle 且内容真的变了时）。
      useEffect(() => {
        if (p.liveCompile !== 'idle') return undefined
        if (!file.trim() || !restored.current) return undefined
        if (text === lastDisk.current) return undefined
        if (liveTimer.current) clearTimeout(liveTimer.current)
        liveTimer.current = setTimeout(() => {
          liveRef.current()
        }, 1500)
        return () => {
          if (liveTimer.current) clearTimeout(liveTimer.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [text, file, p.liveCompile])

      // 用浏览器打开网页版（Host 用一次性票据起系统浏览器）。
      const openWebPage = async () => {
        if (openingWeb) return
        setOpeningWeb(true)
        const r = await post('/api/open-url', {})
        setOpeningWeb(false)
        setLog(r?.error ? t('view.openWebFailed', { error: r.error }) : t('view.openWebDone'))
      }

      // 用 blob 下载：桌面端页面在 dsh-app://app 下，直接开下载链接会走自定义协议的
      // 下载语义，不可靠；fetch 拿字节再 a[download] 两边都一样。
      const download = async () => {
        if (!pdfName) return
        try {
          const res = await fetch(API + '/api/pdf?name=' + encodeURIComponent(pdfName))
          if (!res.ok) throw new Error('HTTP ' + res.status)
          const blob = await res.blob()
          const name = pdfName.split('/').pop() || 'document.pdf'
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = name
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 5000)
          setLog(t('view.downloaded', { name }))
        } catch (err) {
          setLog(t('view.downloadFailed', { error: String(err?.message ?? err) }))
        }
      }

      // 恢复默认：两段式（先亮确认，再点一次才执行），避免误触清空；
      // 只删插件在 drop/ 下的缓存副本，原文件不动，同时清掉本会话存的状态。
      const resetAll = async () => {
        if (!resetArmed) {
          setResetArmed(true)
          setLog(t('view.resetHint'))
          setTimeout(() => setResetArmed(false), 4000)
          return
        }
        setResetArmed(false)
        const current = file.trim()
        let removed = false
        try {
          if (current) {
            const r = await post('/api/reset-cache', { path: current })
            if (r?.error) {
              setLog(t('view.resetFailed', { error: r.error }))
              return
            }
            removed = Boolean(r?.removed)
          }
          await post('/api/state/reset', { key: stateKey })
        } catch (err) {
          setLog(t('view.resetFailed', { error: String(err?.message ?? err) }))
          return
        }
        setFile('')
        setText('')
        setDoc(null)
        setPdfName('')
        setPage(1)
        setEngine('auto')
        setLog(t(removed ? 'view.resetDone' : 'view.resetDoneNoCache'))
      }

      // 新建：选目录 + 文件名（可带 ctexart 起始模板），创建后直接载入。
      const openNew = () => {
        const cur = file.trim()
        let dir = ''
        const cut = Math.max(cur.lastIndexOf('\\'), cur.lastIndexOf('/'))
        if (cut > 0) dir = cur.slice(0, cut)
        // 设置里选了「项目位置」就优先用它，新文件不往别处落。
        if (prefs.docWorkspace) dir = prefs.docWorkspace
        setNewDir(dir)
        setNewName('untitled.tex')
        setNewUseTemplate(true)
        setNewError('')
        setNewOpen(true)
      }

      const createNew = async () => {
        const dir = newDir.trim().replace(/[\\/]+$/, '')
        let name = newName.trim()
        if (!dir) {
          setNewError(t('view.newNeedDir'))
          return
        }
        if (!name) {
          setNewError(t('view.newNeedName'))
          return
        }
        if (/[\\/:*?"<>|]/.test(name)) {
          setNewError(t('view.newBadName'))
          return
        }
        if (!/\.tex$/i.test(name)) name += '.tex'
        const content = newUseTemplate ? NEW_TEMPLATE : ''
        setNewBusy(true)
        const r = await post('/api/new', { path: dir + '\\' + name, content })
        setNewBusy(false)
        if (r?.error) {
          setNewError(r.error)
          return
        }
        setNewOpen(false)
        setFile(r.path)
        setText(content)
        setDoc(null)
        setPdfName('')
        setPage(1)
        setLog(t('view.newDone', { path: r.path }))
      }

      // 接住一个文件：优先用真实路径，拿不到就把内容存成副本
      const handleFile = async (f) => {
        if (!f) return
        if (!/\.(tex|bib|sty|cls)$/i.test(f.name)) {
          setLog(t('view.badFile', { name: f.name }))
          return
        }
        if (nativePathOf(f)) {
          await openPath(nativePathOf(f))
          return
        }
        const content = await f.text()
        const r = await post('/api/droptext', { name: f.name, content })
        if (r.error) {
          setLog(t('view.dropFailed', { error: r.error }))
          return
        }
        setFile(r.path)
        setText(content)
        // 副本目录里没有 figures/ 之类的相对资源，先提醒一声，省得编译时才发现图没了。
        const hasRels = /\\(?:includegraphics|input|include|bibliography|bibliographystyle|graphicspath)\b/u.test(content)
        setLog(t(hasRels ? 'view.droppedWithRels' : 'view.dropped', { name: f.name, path: r.path }))
      }

      // 拖放用独立窗口接：直接在会话里拖会先被对话窗口的拖放接走。
      // 窗口打开时在 window 上用捕获阶段拦掉，别让事件冒到对话那边。
      useEffect(() => {
        if (!dropOpen) return
        const swallow = (e) => {
          e.preventDefault()
          e.stopPropagation()
        }
        const onDropCapture = async (e) => {
          e.preventDefault()
          e.stopPropagation()
          const files = e.dataTransfer?.files
          setDropOpen(false)
          if (files && files.length) await handleFile(files[0])
        }
        window.addEventListener('dragenter', swallow, true)
        window.addEventListener('dragover', swallow, true)
        window.addEventListener('drop', onDropCapture, true)
        return () => {
          window.removeEventListener('dragenter', swallow, true)
          window.removeEventListener('dragover', swallow, true)
          window.removeEventListener('drop', onDropCapture, true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [dropOpen])

      const installed = st && st.installed
      const statusText = !st ? t('view.checking') : installed ? t('view.ready') : st.installing ? t('view.installing', { phase: st.phase }) : t('view.notInstalled')

      // 内置浏览器：选目录时只留目录；排序时目录永远在前。
      const pickerAll = picker ? (pickerFor === 'dir' ? picker.entries.filter((e) => e.kind === 'dir') : picker.entries) : []
      const pickerEntries = pickerAll.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
        const raw = pkSort === 'time' ? (a.mtime ?? 0) - (b.mtime ?? 0) : a.name.localeCompare(b.name, 'zh-CN')
        return pkDesc ? -raw : raw
      })
      const pkCrumbs = (() => {
        const dir = (picker?.dir || '').replace(/[\\/]+$/, '')
        if (!dir) return []
        const parts = dir.split(/[\\/]/).filter(Boolean)
        return parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join('\\') }))
      })()
      const pkCrumbStyle = {
        padding: '1px 6px',
        border: 0,
        borderRadius: 4,
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        cursor: 'pointer',
        fontSize: 11.5,
      }
      const pkCrumbNodes = [
        h('button', { key: 'pc', style: pkCrumbStyle, onClick: () => browse('') }, t('view.computer')),
        ...pkCrumbs.flatMap((c, i) => [
          h('span', { key: 's' + i, style: { opacity: 0.5 } }, '›'),
          h('button', { key: 'c' + i, style: pkCrumbStyle, onClick: () => browse(c.path) }, c.name),
        ]),
      ]
      const fmtSize = (n) => {
        if (n == null) return ''
        if (n < 1024) return n + ' B'
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
        return (n / 1024 / 1024).toFixed(1) + ' MB'
      }
      const fmtTime = (ms) => {
        if (!ms) return ''
        const d = new Date(ms)
        const p2 = (x) => String(x).padStart(2, '0')
        return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
      }

      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
            height: '100%',
            minHeight: 0,
            padding: '10px 14px',
            boxSizing: 'border-box',
            color: 'var(--dsw-alias-label-primary)',
          },
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          h(
            'button',
            {
              title: t('view.reset'),
              'aria-label': t('view.reset'),
              onClick: resetAll,
              disabled: busy,
              style: {
                width: 26,
                height: 26,
                padding: 0,
                flex: '0 0 auto',
                borderRadius: '50%',
                border: '1px solid var(--dsw-alias-border-l2)',
                background: resetArmed ? 'var(--dsw-alias-state-warn-primary, #b7791f)' : 'transparent',
                color: resetArmed ? '#fff' : 'var(--dsw-alias-label-secondary)',
                cursor: busy ? 'default' : 'pointer',
                fontSize: 14,
                lineHeight: 1,
              },
            },
            '↺',
          ),
          h('span', { style: { fontSize: 12.5, color: installed ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)' } }, statusText),
          !installed && !st?.installing ? h('button', { style: btnPrimary, onClick: installEngine }, t('view.install')) : null,
          h('span', { style: { flex: 1 } }),
          h(
            'select',
            { value: engine, onChange: (e) => setEngine(e.target.value), style: { ...input, fontFamily: 'inherit', width: 108 } },
            h('option', { value: 'auto' }, t('view.engineAuto')),
            h('option', { value: 'xelatex' }, 'xelatex'),
            h('option', { value: 'pdflatex' }, 'pdflatex'),
          ),
          h('button', { style: btn, onClick: save, disabled: busy }, t('view.save')),
          h('button', { style: btn, onClick: () => setMoreOpen(!moreOpen) }, moreOpen ? t('view.moreClose') : t('view.more')),
          h('button', { style: btnPrimary, onClick: compile, disabled: busy }, busy ? t('view.compiling') : t('view.compile')),
        ),
        moreOpen
          ? h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
              pdfName ? h('button', { style: btn, onClick: download }, t('view.download')) : null,
              h('button', { style: btn, onClick: openWebPage, disabled: openingWeb }, openingWeb ? t('view.openWebOpening') : t('view.openWeb')),
              h('button', { style: btn, onClick: () => setDropOpen(true), title: t('view.dropTitle') }, t('view.drop')),
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', gap: 6, alignItems: 'center' } },
          h('input', { style: { ...input, flex: 1 }, placeholder: t('view.pathPlaceholder'), value: file, onChange: (e) => setFile(e.target.value), spellCheck: false }),
          h('button', { style: btn, onClick: () => file && openPath(file) }, t('view.load')),
          h('button', { style: btn, onClick: () => openPickerFor('file'), title: t('view.browseHint') }, t('view.browse')),
          h('button', { style: btn, onClick: openNew }, t('view.new')),
        ),
        h(
          'div',
          { style: { display: 'flex', flex: 1, gap: 10, minHeight: 0 } },
          h('textarea', {
            value: text,
            onChange: (e) => setText(e.target.value),
            spellCheck: false,
            placeholder: t('view.editorPlaceholder'),
            style: { ...card, flex: 1, minWidth: 0, padding: '8px 10px', fontFamily: mono, fontSize: 12.5, lineHeight: '1.65', resize: 'none', outline: 'none', color: 'var(--dsw-alias-label-primary)' },
          }),
          h(
            'div',
            { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } },
              h('span', null, doc ? t('view.pages', { n: doc.pages }) : '—'),
              h('span', { style: { flex: 1 } }),
              h('span', null, pdfName ? t('view.lastCompile', { time: new Date(stamp).toLocaleTimeString() }) : ''),
            ),
            h(
              'div',
              { style: { ...card, flex: 1, minHeight: 0, overflow: 'auto', background: 'rgba(127,127,127,.16)', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' } },
              doc
                ? Array.from({ length: doc.pages }, (_, i) =>
                    h('img', {
                      key: i + 1,
                      src: API + '/api/render?name=' + encodeURIComponent(pdfName) + '&page=' + (i + 1) + '&dpi=' + RENDER_DPI + '&t=' + stamp,
                      loading: 'lazy',
                      alt: t('view.pageAlt', { n: i + 1 }),
                      style: { width: '100%', maxWidth: 820, height: 'auto', display: 'block', background: '#fff', boxShadow: '0 1px 5px rgba(0,0,0,.3)' },
                    }),
                  )
                : h('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 } }, t('view.emptyPreview')),
            ),
          ),
        ),
        h(
          'pre',
          {
            style: { margin: 0, padding: '6px 9px', fontSize: 11.5, lineHeight: 1.5, fontFamily: mono, color: 'var(--dsw-alias-label-secondary)', background: 'rgba(127,127,127,.08)', borderRadius: 8, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap' },
          },
          log,
        ),
        dropOpen
          ? h(
              'div',
              { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 } },
              h(
                'div',
                {
                  style: {
                    width: 'min(620px, 86vw)',
                    height: 'min(340px, 58vh)',
                    border: '2px dashed var(--dsw-alias-border-l2)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    background: 'var(--dsw-alias-bg-layer-1)',
                  },
                },
                h('div', { style: { fontSize: 15 } }, t('view.dragTitle')),
                h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('view.dragSub')),
                h(
                  'div',
                  { style: { display: 'flex', gap: 8, marginTop: 6 } },
                  h('button', { style: btn, onClick: () => { setDropOpen(false); browse('') } }, t('view.pickFromDir')),
                  h('button', { style: btn, onClick: () => setDropOpen(false) }, t('view.close')),
                ),
              ),
            )
          : null,
        newOpen
          ? h(
              'div',
              { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 } },
              h(
                'div',
                { style: { ...card, width: 560, maxWidth: '90vw', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10 } },
                h('div', { style: { fontSize: 13, fontWeight: 600 } }, t('view.newTitle')),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { width: 48, flex: '0 0 auto', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('view.newDir')),
                  h('input', { style: { ...input, flex: 1 }, value: newDir, onChange: (e) => setNewDir(e.target.value), spellCheck: false, placeholder: 'D:\\papers' }),
                  h('button', { style: btn, onClick: () => { setPickerFor('dir'); browse(newDir.trim() || '') } }, t('view.newChooseDir')),
                ),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { width: 48, flex: '0 0 auto', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('view.newName')),
                  h('input', { style: { ...input, flex: 1 }, value: newName, onChange: (e) => setNewName(e.target.value), spellCheck: false }),
                ),
                h(
                  'label',
                  { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' } },
                  h('input', { type: 'checkbox', checked: newUseTemplate, onChange: (e) => setNewUseTemplate(e.target.checked), style: { width: 'auto', height: 'auto' } }),
                  t('view.newTemplate'),
                ),
                newError ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, newError) : null,
                h(
                  'div',
                  { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
                  h('button', { style: btn, onClick: () => setNewOpen(false) }, t('view.newCancel')),
                  h('button', { style: btnPrimary, onClick: createNew, disabled: newBusy }, newBusy ? t('view.newCreating') : t('view.newCreate')),
                ),
              ),
            )
          : null,
        picker
          ? h(
              'div',
              {
                onClick: (e) => {
                  if (e.target === e.currentTarget) setPicker(null)
                },
                onKeyDown: (e) => {
                  if (e.key === 'Escape') setPicker(null)
                },
                style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
              },
              h(
                'div',
                {
                  style: {
                    ...card,
                    width: 780,
                    maxWidth: '94vw',
                    maxHeight: '78vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 12,
                    gap: 8,
                    background: 'var(--dsw-alias-bg-layer-1)',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    borderRadius: 10,
                  },
                },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h(
                    'button',
                    { style: { ...btn, height: 26, padding: '0 8px' }, onClick: () => browse(picker.parent ?? ''), title: t('view.up') },
                    '↑',
                  ),
                  h('input', {
                    style: { ...input, flex: 1, minWidth: 0 },
                    value: pkAddr,
                    placeholder: 'D:\\papers',
                    spellCheck: false,
                    onChange: (e) => setPkAddr(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        browse(pkAddr.trim())
                      }
                    },
                  }),
                  h(
                    'button',
                    {
                      style: { ...btn, height: 26, padding: '0 8px' },
                      title: t('view.sortHint'),
                      onClick: () => {
                        // 名称↑ → 名称↓ → 时间↑ → 时间↓ → 名称↑
                        if (pkSort === 'name' && !pkDesc) setPkDesc(true)
                        else if (pkSort === 'name' && pkDesc) {
                          setPkSort('time')
                          setPkDesc(false)
                        } else if (pkSort === 'time' && !pkDesc) setPkDesc(true)
                        else {
                          setPkSort('name')
                          setPkDesc(false)
                        }
                      },
                    },
                    (pkSort === 'name' ? t('view.sortName') : t('view.sortTime')) + (pkDesc ? ' ↓' : ' ↑'),
                  ),
                  h('button', { style: { ...btn, height: 26, padding: '0 8px' }, onClick: () => setPicker(null) }, t('view.close')),
                ),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } }, ...pkCrumbNodes),
                h(
                  'div',
                  { style: { overflow: 'auto', flex: 1, minHeight: 0, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 6 } },
                  pickerEntries.length
                    ? pickerEntries.map((e) =>
                        h(
                          'div',
                          {
                            key: e.path,
                            onClick: async () => {
                              if (e.kind === 'dir') return browse(e.path)
                              if (pickerFor !== 'file') return
                              setPicker(null)
                              await openPath(e.path)
                            },
                            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 12.5, whiteSpace: 'nowrap' },
                            onMouseEnter: (ev) => (ev.currentTarget.style.background = 'rgba(127,127,127,.14)'),
                            onMouseLeave: (ev) => (ev.currentTarget.style.background = 'transparent'),
                          },
                          h('span', { style: { flex: '0 0 auto' } }, e.kind === 'dir' ? '📁' : '📄'),
                          h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: mono } }, e.name),
                          h('span', { style: { flex: '0 0 auto', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, fmtSize(e.size)),
                          h('span', { style: { flex: '0 0 118px', textAlign: 'right', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, fmtTime(e.mtime)),
                        ),
                      )
                    : h(
                        'div',
                        { style: { padding: 12, color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 } },
                        pickerFor === 'dir' ? t('view.emptyDirOnly') : t('view.emptyDir'),
                      ),
                ),
                pickerFor === 'dir'
                  ? h(
                      'div',
                      { style: { display: 'flex', justifyContent: 'flex-end' } },
                      h('button', { style: btnPrimary, onClick: () => { setNewDir(picker.dir || ''); setPicker(null) } }, t('view.pickThisDir')),
                    )
                  : null,
              ),
            )
          : null,
      )
    }

    // ---------------------------------------------------------------- 设置页
    // settings.section：设置左侧导航里单独的一页，不再塞在「通用」里。
    function LatexSettingsSection() {
      const p = usePrefs()
      const [busy, setBusy] = useState(false)
      const [opening, setOpening] = useState(false)
      const [error, setError] = useState('')
      const [hint, setHint] = useState('')
      const [engine, setEngine] = useState(null)
      const [checking, setChecking] = useState(false)
      const [workspaces, setWorkspaces] = useState(null)
      const [wsError, setWsError] = useState('')

      // DSH 的工作区清单（只读）：设置里选一个，只对它生效。
      useEffect(() => {
        let alive = true
        api('/api/workspaces')
          .then((r) => {
            if (!alive) return
            if (r?.ok) setWorkspaces(Array.isArray(r.workspaces) ? r.workspaces : [])
            else setWsError(String(r?.error ?? 'unknown'))
          })
          .catch((e) => alive && setWsError(String(e?.message ?? e)))
        return () => {
          alive = false
        }
      }, [])

      // 统一写偏好：先乐观更新，失败回滚。
      const savePref = async (patch) => {
        const before = {}
        for (const k of Object.keys(patch)) before[k] = p[k]
        setPrefs(patch)
        setError('')
        const r = await api('/api/prefs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (r?.error) {
          setPrefs(before)
          setError(t('settings.saveFailed'))
          return
        }
        setPrefs({
          viewEnabled: r.viewEnabled,
          preferTex: r.preferTex === true,
          docPdf: r.docPdf === true,
          docWorkspace: typeof r.docWorkspace === 'string' ? r.docWorkspace : '',
          liveCompile: typeof r.liveCompile === 'string' ? r.liveCompile : 'off',
        })
        if (r.sync && r.sync.ok === false) setError(t('settings.saveFailed'))
      }

      useEffect(() => {
        let alive = true
        api('/api/status')
          .then((s) => {
            if (alive) setEngine(s)
          })
          .catch(() => {})
        return () => {
          alive = false
        }
      }, [])

      const recheck = async () => {
        if (checking) return
        setChecking(true)
        const r = await post('/api/engine/refresh', {})
        setChecking(false)
        if (!r?.error) setEngine(r)
      }

      const toggle = async () => {
        if (busy) return
        const next = !p.viewEnabled
        setBusy(true)
        setError('')
        setHint('')
        setPrefs({ viewEnabled: next })
        const r = await api('/api/prefs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ viewEnabled: next }),
        })
        if (r?.error || r?.viewEnabled !== next) {
          setPrefs({ viewEnabled: !next })
          setError(r?.error || t('settings.saveFailed'))
        }
        setBusy(false)
      }

      // 桌面端 window.open 会被 Electron 拦掉，改由 Host 用系统浏览器打开。
      const openWeb = async () => {
        if (opening) return
        setOpening(true)
        setError('')
        setHint('')
        const r = await post('/api/open-url', {})
        setOpening(false)
        if (r?.error) setError(t('settings.openFailed', { error: r.error }))
        else setHint(t('settings.opened'))
      }

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', maxWidth: 680, padding: '2px 0' } },
        h(
          'div',
          { style: { paddingBottom: 14 } },
          h('div', { style: { fontSize: 16, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, t('settings.title')),
          h('div', { style: { marginTop: 6, fontSize: 12.5, lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.desc')),
        ),
        h(
          'div',
          { style: { padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h(
              'div',
              { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.engineTitle')),
              h(
                'div',
                { style: { marginTop: 2, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } },
                !engine
                  ? t('settings.engineChecking')
                  : engine.installed
                    ? t('settings.engineReady') + (engine.version ? ' · ' + engine.version : '')
                    : t('settings.engineMissing'),
              ),
            ),
            h('button', { style: btn, onClick: recheck, disabled: checking }, checking ? t('settings.engineRechecking') : t('settings.engineRecheck')),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.switchLabel')),
            h('div', { style: { marginTop: 2, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.switchDesc')),
            error ? h('div', { style: { marginTop: 4, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
            hint ? h('div', { style: { marginTop: 4, fontSize: 12, color: 'var(--dsw-alias-label-secondary)', wordBreak: 'break-all' } }, hint) : null,
          ),
          h(
            'button',
            {
              role: 'switch',
              'aria-checked': p.viewEnabled ? 'true' : 'false',
              'aria-label': t('settings.switchLabel'),
              disabled: busy,
              onClick: toggle,
              title: p.viewEnabled ? t('settings.on') : t('settings.off'),
              style: {
                position: 'relative',
                flex: '0 0 auto',
                width: 38,
                height: 20,
                padding: 0,
                borderRadius: 999,
                border: '1px solid var(--dsw-alias-border-l2)',
                background: p.viewEnabled ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
              },
            },
            h('span', {
              style: {
                position: 'absolute',
                top: 1,
                left: p.viewEnabled ? 20 : 1,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: p.viewEnabled ? '#fff' : 'var(--dsw-alias-label-secondary)',
                transition: 'left .12s ease',
              },
            }),
          ),
        ),
        h(
          'div',
          { style: { padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
          h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.docTitle')),
          wsError
            ? h(
                'div',
                { style: { marginTop: 6, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-state-error-primary)' } },
                t('settings.docStale', { error: wsError }),
              )
            : null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: wsError ? 'default' : 'pointer', opacity: wsError ? 0.55 : 1 } },
            h('input', { type: 'checkbox', checked: p.preferTex === true, disabled: Boolean(wsError), onChange: () => savePref({ preferTex: !p.preferTex }) }),
            h('span', { style: { fontSize: 13 } }, t('settings.docPrefer')),
          ),
          h('div', { style: { marginTop: 2, marginLeft: 22, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.docPreferHint')),
          h(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                cursor: p.preferTex ? 'pointer' : 'default',
                opacity: p.preferTex ? 1 : 0.55,
              },
            },
            h('input', { type: 'checkbox', checked: p.docPdf === true, disabled: !p.preferTex || Boolean(wsError), onChange: () => savePref({ docPdf: !p.docPdf }) }),
            h('span', { style: { fontSize: 13 } }, t('settings.docPdf')),
          ),
          h('div', { style: { marginTop: 2, marginLeft: 22, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.docPdfHint')),
          h('div', { style: { marginTop: 12, fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.docWorkspace')),
          h(
            'div',
            { style: { marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 } },
            h(
              'select',
              {
                style: { ...input, flex: 1, minWidth: 0 },
                value: p.docWorkspace || '',
                disabled: !workspaces || Boolean(wsError),
                onChange: (e) => savePref({ docWorkspace: e.target.value }),
              },
              h('option', { value: '' }, t('settings.docWorkspaceEmpty')),
              (workspaces || []).map((w) => h('option', { key: w.id, value: w.path }, w.title + ' — ' + w.path)),
              workspaces && workspaces.length === 0 ? h('option', { value: '', disabled: true }, t('settings.docWorkspaceNone')) : null,
            ),
          ),
          h(
            'div',
            { style: { marginTop: 4, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } },
            wsError ? t('settings.docWorkspaceFailed', { error: wsError }) : t('settings.docWorkspaceHint'),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.liveTitle')),
            h('div', { style: { marginTop: 2, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.liveHint')),
          ),
          h(
            'select',
            { style: { ...input, width: 160 }, value: p.liveCompile, disabled: Boolean(wsError), onChange: (e) => savePref({ liveCompile: e.target.value }) },
            h('option', { value: 'off' }, t('settings.liveOff')),
            h('option', { value: 'idle' }, t('settings.liveIdle')),
            h('option', { value: 'save' }, t('settings.liveSave')),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.webTitle')),
            h('div', { style: { marginTop: 2, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.openHint')),
          ),
          h(
            'button',
            {
              style: btn,
              title: t('settings.openHint'),
              disabled: opening,
              onClick: openWeb,
            },
            (opening ? t('settings.opening') : t('settings.open')) + ' ↗',
          ),
        ),
      )
    }

    // ---------------------------------------------------------------- better-sidebar 文件预览
    // 注册进 dsh-better-sidebar：它的文件预览里多一个 LaTeX 项（编译 + PDF 页 + 源码）。
    // 只按扩展名 .tex 匹配，其它文件完全不受影响。
    function LatexFileViewer(props) {
      const filePath = props.path
      const [mode, setMode] = useState('source')
      const [phase, setPhase] = useState('idle')
      const [pdfName, setPdfName] = useState('')
      const [pages, setPages] = useState(0)
      const [log, setLog] = useState('')
      const [draft, setDraft] = useState(props.content ?? '')
      const [dirty, setDirty] = useState(false)
      const [saving, setSaving] = useState(false)
      const [stamp, setStamp] = useState(0)

      useEffect(() => {
        setDraft(props.content ?? '')
        setDirty(false)
      }, [props.content])

      const compilePdf = async () => {
        if (!filePath) return
        setPhase('compiling')
        setLog('')
        try {
          const r = await post('/api/compile', { path: filePath, engine: 'auto' })
          if (r.error) {
            setPhase('error')
            setLog(String(r.error))
            return
          }
          setPhase(r.ok ? 'ok' : 'error')
          setLog((r.log || '').split('\n').slice(-10).join('\n'))
          if (r.ok) {
            setPdfName(r.pdfName)
            setStamp(Date.now())
            const info = await api('/api/pdfinfo?name=' + encodeURIComponent(r.pdfName))
            setPages(info.ok ? info.pages : 1)
            setMode('preview')
          }
        } catch (err) {
          setPhase('error')
          setLog(String(err?.message ?? err))
        }
      }

      const save = async () => {
        if (!filePath) return
        setSaving(true)
        const r = await post('/api/save', { path: filePath, content: draft })
        setSaving(false)
        if (r.error) {
          setPhase('error')
          setLog(t('viewer.saveFailed', { error: r.error }))
          return
        }
        setDirty(false)
        await compilePdf()
      }

      const download = async () => {
        if (!pdfName) return
        try {
          const res = await fetch(API + '/api/pdf?name=' + encodeURIComponent(pdfName))
          if (!res.ok) throw new Error('HTTP ' + res.status)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = pdfName.split('/').pop() || 'document.pdf'
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 5000)
        } catch (err) {
          setLog(t('viewer.downloadFailed', { error: String(err?.message ?? err) }))
        }
      }

      const togglePreview = () => {
        if (mode === 'preview') {
          setMode('source')
          return
        }
        if (!pdfName) {
          compilePdf()
          return
        }
        setMode('preview')
      }

      const big = Boolean(props.largeFile)

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 6, padding: '8px 10px', boxSizing: 'border-box' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
          h(
            'span',
            { style: { flex: 1, minWidth: 80, fontSize: 12, color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            props.title || filePath,
          ),
          h('button', { style: btn, onClick: compilePdf, disabled: phase === 'compiling' }, phase === 'compiling' ? t('viewer.compiling') : pdfName ? t('viewer.recompile') : t('viewer.compilePreview')),
          h('button', { style: btn, onClick: download, disabled: !pdfName }, t('viewer.download')),
          big ? null : h('button', { style: btn, onClick: togglePreview }, mode === 'preview' ? t('viewer.source') : t('viewer.preview')),
        ),
        mode === 'source'
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 6 } },
              h('textarea', {
                value: draft,
                onChange: (e) => { setDraft(e.target.value); setDirty(true) },
                spellCheck: false,
                style: { flex: 1, minHeight: 0, resize: 'none', padding: 8, fontFamily: mono, fontSize: 12, lineHeight: 1.6, borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' },
              }),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('button', { style: btnPrimary, onClick: save, disabled: saving || !dirty }, saving ? t('viewer.saving') : t('viewer.save')),
                h('span', { style: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } }, dirty ? t('viewer.unsaved') : t('viewer.saved')),
              ),
            )
          : h(
              'div',
              { style: { flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', borderRadius: 8, padding: 6, background: 'rgba(127,127,127,.1)' } },
              pages > 0 && pdfName
                ? Array.from({ length: pages }, (_, i) =>
                    h('img', {
                      key: i + 1,
                      src: API + '/api/render?name=' + encodeURIComponent(pdfName) + '&page=' + (i + 1) + '&dpi=110&t=' + stamp,
                      loading: 'lazy',
                      alt: t('viewer.pageAlt', { n: i + 1 }),
                      style: { width: '100%', display: 'block', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.3)' },
                    }),
                  )
                : h(
                    'div',
                    { style: { padding: 16, textAlign: 'center', fontSize: 12, lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)' } },
                    phase === 'compiling' ? t('viewer.compiling') : phase === 'error' ? t('viewer.failed') : t('viewer.empty'),
                  ),
            ),
        log ? h('pre', { style: { margin: 0, maxHeight: 88, overflow: 'auto', fontSize: 11, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'pre-wrap' } }, log) : null,
      )
    }

    const inject = ['slots']

    function apply(ctx) {
      const locale = ctx.get('locale')
      if (locale && typeof locale.register === 'function' && typeof locale.bind === 'function') {
        try {
          ctx.effect(() => locale.register(NS, 'zh', DICT.zh), 'latex-studio: locale zh')
          ctx.effect(() => locale.register(NS, 'en', DICT.en), 'latex-studio: locale en')
          tr = locale.bind(NS)
        } catch (err) {
          console.warn('[latex-studio] locale 注册失败，用内置中文：', err)
        }
      }

      // 视图按开关动态挂载/卸载：关掉后页签直接消失，不用刷新页面。
      let viewEffect = null
      const mountView = () => {
        if (viewEffect) return
        viewEffect = ctx.effect(
          () =>
            ctx.slots.inject('conversation.view', () =>
              ctx.slots.register(
                { name: 'conversation.view', id: 'latex-studio', order: 30, label: () => t('view.label') },
                LatexView,
              ),
            ),
          'latex-studio: conversation view',
        )
      }
      const unmountView = () => {
        if (!viewEffect) return
        viewEffect()
        viewEffect = null
      }
      const sync = () => (prefs.viewEnabled ? mountView() : unmountView())

      ctx.effect(() => subscribe(sync), 'latex-studio: prefs -> view')

      // 设置里单独一页（左侧导航「LaTeX 工作室」），不再塞进「通用」。
      ctx.effect(
        () =>
          ctx.slots.inject('settings.section', () =>
            ctx.slots.register(
              { name: 'settings.section', id: 'latex-studio', order: 30, label: () => t('settings.title') },
              LatexSettingsSection,
            ),
          ),
        'latex-studio: settings section',
      )

      // dsh-better-sidebar 的 .tex 预览项；没装这个插件时 inject 不会触发，其它功能不受影响。
      ctx.inject(['betterSidebar'], (bctx) => {
        bctx.effect(
          () =>
            bctx.betterSidebar.registerFileViewer({
              id: 'latex-studio:latex',
              title: () => t('viewer.title'),
              icon: (size) =>
                h('span', { style: { fontSize: Math.max(9, size - 4), fontWeight: 700, lineHeight: 1, letterSpacing: '-.5px' } }, 'TeX'),
              exts: ['tex'],
              priority: 10,
              fetchStrategy: 'fsRead',
              component: LatexFileViewer,
            }),
          'latex-studio: better-sidebar viewer',
        )
      })

      ;(async () => {
        try {
          const r = await api('/api/prefs')
          if (typeof r?.viewEnabled === 'boolean') {
            setPrefs({
              viewEnabled: r.viewEnabled,
              preferTex: r.preferTex === true,
              docPdf: r.docPdf === true,
              docWorkspace: typeof r.docWorkspace === 'string' ? r.docWorkspace : '',
              liveCompile: typeof r.liveCompile === 'string' ? r.liveCompile : 'off',
            })
          }
        } catch {}
        sync()
      })()
    }

    exports.apply = apply
    exports.inject = inject
    exports.LatexView = LatexView
    exports.LatexSettingsSection = LatexSettingsSection
    return module.exports
  },
})
