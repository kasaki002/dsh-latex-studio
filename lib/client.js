// 客户端半边：会话里的「LaTeX」视图 + 设置 → 通用里的开关/打开网页。
// 数据流：这两个 UI ⇄ /dsh-latex/api/*（同源 fetch，带 DSH 登录 cookie）⇄ 服务端 lib/tex.mjs
window.__ModuleLoader__.load({
  id: 'dsh-latex-studio',
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
        'view.compile': '编译',
        'view.compiling': '编译中…',
        'view.pathPlaceholder': 'C:\\path\\to\\doc.tex（也可以直接拖进来）',
        'view.browse': '浏览…',
        'view.drop': '拖入…',
        'view.dropTitle': '开一个独立窗口接拖放，不会掉进对话里',
        'view.dialog': '对话框',
        'view.dialogTitle': '用 Windows 的文件对话框选',
        'view.load': '载入',
        'view.editorPlaceholder': '在这里写 LaTeX。拖文件进来、或点「浏览」选一个 .tex。',
        'view.pages': '{n} 页 · 直接往下滚',
        'view.pageAlt': '第 {n} 页',
        'view.emptyPreview': '编译后这里出预览',
        'view.lastCompile': '上次编译 {time}',
        'view.initialLog': '拖一个 .tex 进来，或者点「浏览」。',
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
        'view.waitDialog': '等系统对话框…',
        'view.dialogFailed': '系统对话框失败：{error}',
        'view.dialogCancelled': '没选文件（对话框被取消，或者没能弹到桌面上）',
        'view.needFile': '先选一个文件',
        'view.saved': '已保存 {path}（{bytes} 字节）',
        'view.saveFailed': '保存失败：{error}',
        'view.alreadyInstalling': '已经在装了',
        'view.compileFailed': '编译失败：{error}',
        'view.compileOk': '✓ 编译成功（{engine}，{passes} 遍，{sec}s）',
        'view.compileBad': '✗ 编译失败（{engine}，{passes} 遍，{sec}s）',
        'view.badFile': '只接 .tex / .bib / .sty / .cls，收到的是 {name}',
        'view.dropped': '已接收 {name} → 另存为 {path}（浏览器拿不到原路径，拖进来的是副本）',
        'view.droppedWithRels': '已接收 {name} → 另存为 {path}。这是副本，文档里的相对路径（figures/ 等）不会跟过来，编译会找不到图；建议点「浏览」直接打开原文件。',
        'view.dropFailed': '接收文件失败：{error}',
        'view.restoredDraft': '已恢复 {file}\n草稿里有未保存的修改，直接接着改；点「保存」才会写回磁盘。',
        'settings.title': 'LaTeX 工作室',
        'settings.desc': '在会话里显示「LaTeX」页签：写 .tex、编译、预览 PDF。',
        'settings.switchLabel': '启用会话里的 LaTeX 视图',
        'settings.on': '已开启',
        'settings.off': '已关闭',
        'settings.open': '打开网页',
        'settings.openHint': '用系统默认浏览器打开网页版 LaTeX 编辑器',
        'settings.opening': '正在打开…',
        'settings.opened': '已在系统浏览器里打开（没看到窗口的话，检查一下浏览器窗口或任务栏）。',
        'settings.openFailed': '打开失败：{error}',
        'settings.saveFailed': '保存失败，已恢复原状态',
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
        'view.compile': 'Compile',
        'view.compiling': 'Compiling…',
        'view.pathPlaceholder': 'C:\\path\\to\\doc.tex (or drop one here)',
        'view.browse': 'Browse…',
        'view.drop': 'Drop…',
        'view.dropTitle': 'Open a separate drop target so files do not land in the chat',
        'view.dialog': 'Dialog',
        'view.dialogTitle': 'Pick with the Windows file dialog',
        'view.load': 'Load',
        'view.editorPlaceholder': 'Write LaTeX here. Drop a .tex file or pick one with Browse.',
        'view.pages': '{n} pages · scroll down',
        'view.pageAlt': 'Page {n}',
        'view.emptyPreview': 'The preview appears after compiling',
        'view.lastCompile': 'Last build {time}',
        'view.initialLog': 'Drop a .tex file here, or click Browse.',
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
        'view.waitDialog': 'Waiting for the system dialog…',
        'view.dialogFailed': 'System dialog failed: {error}',
        'view.dialogCancelled': 'No file picked (dialog cancelled, or it could not appear)',
        'view.needFile': 'Pick a file first',
        'view.saved': 'Saved {path} ({bytes} bytes)',
        'view.saveFailed': 'Save failed: {error}',
        'view.alreadyInstalling': 'Already installing',
        'view.compileFailed': 'Compile failed: {error}',
        'view.compileOk': '✓ Compiled ({engine}, {passes} pass(es), {sec}s)',
        'view.compileBad': '✗ Compile failed ({engine}, {passes} pass(es), {sec}s)',
        'view.badFile': 'Only .tex / .bib / .sty / .cls are accepted, got {name}',
        'view.dropped': 'Received {name} → saved as {path} (the browser hides the original path, so this is a copy)',
        'view.droppedWithRels': 'Received {name} → saved as {path}. This is a copy, so relative paths such as figures/ are not copied with it and the build will miss them; use Browse to open the original file.',
        'view.dropFailed': 'Receiving the file failed: {error}',
        'view.restoredDraft': 'Restored {file}\nThe draft has unsaved edits; keep going, and press Save to write them back.',
        'settings.title': 'LaTeX studio',
        'settings.desc': 'Show a LaTeX tab in the conversation: write .tex, compile, preview the PDF.',
        'settings.switchLabel': 'Enable the LaTeX view in conversations',
        'settings.on': 'On',
        'settings.off': 'Off',
        'settings.open': 'Open web',
        'settings.openHint': 'Open the web LaTeX editor in your default browser',
        'settings.opening': 'Opening…',
        'settings.opened': 'Opened in your browser (check the browser window or taskbar if you do not see it).',
        'settings.openFailed': 'Could not open: {error}',
        'settings.saveFailed': 'Saving failed; reverted',
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
    const prefs = { viewEnabled: true }
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
      const [picker, setPicker] = useState(null)
      const [engine, setEngine] = useState('auto')
      const [dropOpen, setDropOpen] = useState(false)
      const poll = useRef(null)
      const saveTimer = useRef(null)
      const lastSaved = useRef(null)
      const restored = useRef(false)

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
      }

      const osPick = async () => {
        setLog(t('view.waitDialog'))
        const r = await post('/api/pick', {})
        if (r.error) {
          setLog(t('view.dialogFailed', { error: r.error }))
          return
        }
        if (!r.path) {
          setLog(t('view.dialogCancelled'))
          return
        }
        setPicker(null)
        await openPath(r.path)
      }

      const save = async () => {
        if (!file.trim()) {
          setLog(t('view.needFile'))
          return
        }
        const r = await post('/api/save', { path: file.trim(), content: text })
        setLog(r.error ? t('view.saveFailed', { error: r.error }) : t('view.saved', { path: r.path, bytes: r.bytes }))
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

      const compile = async () => {
        if (!file.trim()) {
          setLog(t('view.needFile'))
          return
        }
        setBusy(true)
        setLog(t('view.compiling'))
        const r = await post('/api/compile', { path: file.trim(), engine })
        setBusy(false)
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
        }
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
          h('button', { style: btn, onClick: download, disabled: !pdfName }, t('view.download')),
          h('button', { style: btnPrimary, onClick: compile, disabled: busy }, busy ? t('view.compiling') : t('view.compile')),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: 6, alignItems: 'center' } },
          h('input', { style: { ...input, flex: 1 }, placeholder: t('view.pathPlaceholder'), value: file, onChange: (e) => setFile(e.target.value), spellCheck: false }),
          h('button', { style: btn, onClick: () => browse(picker?.dir || '') }, t('view.browse')),
          h('button', { style: btn, onClick: () => setDropOpen(true), title: t('view.dropTitle') }, t('view.drop')),
          h('button', { style: btn, onClick: osPick, title: t('view.dialogTitle') }, t('view.dialog')),
          h('button', { style: btn, onClick: () => file && openPath(file) }, t('view.load')),
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
        picker
          ? h(
              'div',
              {
                onClick: (e) => {
                  if (e.target === e.currentTarget) setPicker(null)
                },
                style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
              },
              h(
                'div',
                { style: { ...card, width: 560, maxHeight: '70vh', display: 'flex', flexDirection: 'column', padding: 12, gap: 8, background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10 } },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('button', { style: { ...btn, height: 24, padding: '0 8px' }, onClick: () => browse(picker.parent ?? ''), disabled: !picker.parent }, t('view.up')),
                  h('span', { style: { flex: 1, fontFamily: mono, fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, picker.dir || t('view.computer')),
                  h('button', { style: { ...btn, height: 24, padding: '0 8px' }, onClick: () => setPicker(null) }, t('view.close')),
                ),
                h(
                  'div',
                  { style: { overflow: 'auto', flex: 1, minHeight: 0 } },
                  picker.entries.length
                    ? picker.entries.map((e) =>
                        h(
                          'div',
                          {
                            key: e.path,
                            onClick: async () => {
                              if (e.kind === 'dir') return browse(e.path)
                              setPicker(null)
                              await openPath(e.path)
                            },
                            style: { padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                            onMouseEnter: (ev) => (ev.currentTarget.style.background = 'rgba(127,127,127,.14)'),
                            onMouseLeave: (ev) => (ev.currentTarget.style.background = 'transparent'),
                          },
                          (e.kind === 'dir' ? '📁 ' : '📄 ') + e.name,
                        ),
                      )
                    : h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 } }, t('view.emptyDir')),
                ),
              ),
            )
          : null,
      )
    }

    // ---------------------------------------------------------------- 设置行
    // settings.general.item 的 owner 不传 props、不投影 label，整行由注册方自己画。
    function LatexSettingsRow() {
      const p = usePrefs()
      const [busy, setBusy] = useState(false)
      const [opening, setOpening] = useState(false)
      const [error, setError] = useState('')
      const [hint, setHint] = useState('')

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
        { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' } },
        h(
          'div',
          { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, t('settings.title')),
          h('div', { style: { marginTop: 2, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' } }, t('settings.desc')),
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

      // 设置行永远在：视图关掉之后，还得从这里再打开。
      ctx.effect(
        () =>
          ctx.slots.inject('settings.general.item', () =>
            ctx.slots.register({ name: 'settings.general.item', id: 'latex-studio', order: 25 }, LatexSettingsRow),
          ),
        'latex-studio: settings row',
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
          if (typeof r?.viewEnabled === 'boolean') setPrefs({ viewEnabled: r.viewEnabled })
        } catch {}
        sync()
      })()
    }

    exports.apply = apply
    exports.inject = inject
    exports.LatexView = LatexView
    return module.exports
  },
})
