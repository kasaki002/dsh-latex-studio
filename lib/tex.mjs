// MiKTeX 便携安装 + LaTeX 编译。
// 设计取舍：不碰系统 PATH、不写注册表、不需要管理员权限，全在 $DSH_HOME/latex-studio 里。
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import crypto from 'node:crypto'
import { ROOT, TEX_DIR, REPO_DIR, SETUP_DIR, OUT_DIR, SETUP_ZIP, SETUP_EXE, REMOTE_REPOS } from './paths.mjs'

const run = promisify(execFile)
const ENGINES = ['xelatex', 'pdflatex', 'lualatex']

// 日志里出现这些才需要再跑一遍：目录、交叉引用、citation 都等第二遍才稳定。
const RERUN = /Rerun to get|undefined references|Label\(s\) may have changed|There were undefined citations/iu

export const state = {
  installing: false,
  phase: 'idle',
  log: [],
  error: null,
  startedAt: 0,
  finishedAt: 0,
}

function note(line) {
  const s = String(line ?? '').trim()
  if (!s) return
  state.log.push(s)
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400)
}

async function ensureDir(d) {
  await fsp.mkdir(d, { recursive: true })
}

/** 在 TEX_DIR 里递归找某个引擎的 exe（便携安装的 bin 目录层级不稳定，不写死）。 */
async function findExe(name, root = TEX_DIR, depth = 6) {
  if (depth < 0) return null
  let entries
  try {
    entries = await fsp.readdir(root, { withFileTypes: true })
  } catch {
    return null
  }
  for (const e of entries) {
    const p = path.join(root, e.name)
    if (e.isFile() && e.name.toLowerCase() === `${name}.exe`) return p
    if (e.isDirectory()) {
      const hit = await findExe(name, p, depth - 1)
      if (hit) return hit
    }
  }
  return null
}

// 引擎探测要递归扫 texmfs（几万个文件），而安装时前端每 2 秒轮询一次状态，
// 所以结果缓存 2 秒；安装流程里用 forgetEngines() 主动失效。
let engineCache = { at: 0, value: null }

export function forgetEngines() {
  engineCache = { at: 0, value: null }
}

export async function engines() {
  if (engineCache.value && Date.now() - engineCache.at < 2000) return engineCache.value
  const out = {}
  for (const name of ENGINES) {
    const p = await findExe(name)
    out[name] = p || null
  }
  engineCache = { at: Date.now(), value: out }
  return out
}

export async function status() {
  const e = await engines()
  const installed = Boolean(e.xelatex || e.pdflatex)
  let version = null
  if (installed) {
    try {
      const bin = path.dirname(e.xelatex || e.pdflatex)
      const { stdout } = await run(path.join(bin, e.xelatex ? 'xelatex.exe' : 'pdflatex.exe'), ['--version'], { timeout: 15000, windowsHide: true })
      version = String(stdout).split('\n')[0]?.trim() || null
    } catch {}
  }
  return { installed, engines: e, version, texDir: TEX_DIR, installing: state.installing, phase: state.phase, error: state.error, log: state.log.slice(-25) }
}

async function download(url, dest) {
  note(`下载 ${url}`)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}：${url}`)
  const total = Number(res.headers.get('content-length') || 0)
  const buf = Buffer.from(await res.arrayBuffer())
  await fsp.mkdir(path.dirname(dest), { recursive: true })
  await fsp.writeFile(dest, buf)
  note(`  ${(buf.length / 1048576).toFixed(1)} MB${total ? ` / ${(total / 1048576).toFixed(1)} MB` : ''}`)
}

async function ensureSetup() {
  const exe = path.join(SETUP_DIR, SETUP_EXE)
  if (fs.existsSync(exe)) return exe
  await ensureDir(SETUP_DIR)
  const zip = path.join(SETUP_DIR, 'miktexsetup.zip')
  await download(SETUP_ZIP, zip)
  note('解压 miktexsetup')
  const ps = `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${SETUP_DIR.replace(/'/g, "''")}' -Force`
  await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 120000, windowsHide: true })
  if (!fs.existsSync(exe)) throw new Error('解压后找不到 miktexsetup_standalone.exe')
  return exe
}

async function setupTask(exe, args) {
  note(`miktexsetup ${args.join(' ')}`)
  try {
    const { stdout, stderr } = await run(exe, args, { timeout: 1800000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
    const tail = String(stdout || stderr || '').trim().split('\n').slice(-6)
    for (const line of tail) note(`  ${line}`)
  } catch (e) {
    // miktexsetup 有时在进度条上返回非 0，但产物是好的 —— 交给上层按结果判断
    note(`  退出码 ${e.code ?? '?'}：${String(e.message).slice(0, 300)}`)
  }
}

async function firstReachableRemote() {
  for (const url of REMOTE_REPOS) {
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
      if (r.ok) return url
    } catch {}
  }
  return REMOTE_REPOS[0]
}

export async function install() {
  if (state.installing) return { started: false, alreadyRunning: true }
  state.installing = true
  state.phase = 'starting'
  state.error = null
  state.log = []
  state.startedAt = Date.now()
  state.finishedAt = 0
  forgetEngines()
  ;(async () => {
    try {
      await ensureDir(ROOT)
      await ensureDir(TEX_DIR)
      const exe = await ensureSetup()

      state.phase = 'download'
      const remote = await firstReachableRemote()
      note(`包源：${remote}`)
      await setupTask(exe, [
        '--verbose',
        `--local-package-repository=${REPO_DIR}`,
        '--package-set=basic',
        `--remote-package-repository=${remote}`,
        'download',
      ])

      state.phase = 'install'
      await setupTask(exe, [
        '--verbose',
        `--local-package-repository=${REPO_DIR}`,
        `--portable=${TEX_DIR}`,
        '--package-set=basic',
        // 注意：--portable 与 --shared 互斥，带上 --shared=no 会被 miktexsetup 直接拒掉。
        '--modify-path=no',
        'install',
      ])

      forgetEngines()
      const e = await engines()
      if (!e.xelatex && !e.pdflatex) throw new Error('装完了但没找到 xelatex / pdflatex，看 log')

      // 让 MiKTeX 缺包时自己装（ctex 之类不在 basic 里）
      state.phase = 'configure'
      const bin = path.dirname(e.xelatex || e.pdflatex)
      const ini = path.join(bin, 'initexmf.exe')
      if (fs.existsSync(ini)) {
        for (const kv of ['[MPM]AutoInstall=1', `[MPM]RemoteRepository=${remote}`]) {
          try {
            await run(ini, [`--set-config-value=${kv}`], { timeout: 60000, windowsHide: true })
            note(`配置 ${kv}`)
          } catch (err) {
            note(`配置失败 ${kv}：${String(err.message).slice(0, 160)}`)
          }
        }
      }

      state.phase = 'done'
      state.finishedAt = Date.now()
      note('安装完成')
    } catch (err) {
      state.phase = 'failed'
      state.error = String(err?.message ?? err)
      state.finishedAt = Date.now()
      note(`失败：${state.error}`)
    } finally {
      state.installing = false
    }
  })()
  return { started: true }
}

const BIBTEX_EXE = process.platform === 'win32' ? 'bibtex.exe' : 'bibtex'

/** 主 aux 里有 \bibdata{...} 才需要跑 bibtex；thebibliography 的文档没有，不会误触发。 */
async function bibDataOf(outDir, base) {
  try {
    const aux = await fsp.readFile(path.join(outDir, `${base}.aux`), 'utf8')
    const hit = /\\bibdata\{([^}]*)\}/u.exec(aux)
    return hit ? hit[1].trim() : null
  } catch {
    return null
  }
}

/** 跑 bibtex：cwd 用源码目录（.bib 通常在那），参数给 out 目录里的 aux（不带扩展名）。 */
async function runBibtex(bin, srcDir, outDir, base) {
  const started = Date.now()
  const exe = path.join(path.dirname(bin), BIBTEX_EXE)
  try {
    const { stdout, stderr } = await run(exe, [path.join(outDir, base)], {
      timeout: 120000,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
      cwd: srcDir,
    })
    return {
      ran: true,
      ok: true,
      ms: Date.now() - started,
      log: (String(stdout || '') + String(stderr || '')).trim().split('\n').slice(-12).join('\n'),
    }
  } catch (err) {
    // bibtex 以退出码判断成败：缺 .bib、缺条目、.bst 有问题都会返回非 0（MiKTeX 的
    // “not checked for updates” 只是 stderr 噪音，成功时退出码仍然是 0）。
    const text = String(err.stdout || '') + String(err.stderr || '') || String(err.message)
    return {
      ran: true,
      ok: false,
      ms: Date.now() - started,
      log: text.trim().split('\n').slice(-12).join('\n'),
    }
  }
}

/** 编译：默认跑一遍，日志要求补第二遍时（目录、交叉引用）才再跑；需要 bibtex 时自动补跑。 */
export async function compile({ file, engine = 'auto', passes = 1 }) {
  const src = path.resolve(file)
  if (!fs.existsSync(src)) throw new Error(`找不到文件：${src}`)
  if (!/\.tex$/i.test(src)) throw new Error('只编译 .tex 文件')

  const e = await engines()
  let bin
  let engineName = engine
  if (engine === 'auto') {
    // 有 ctex / xeCJK / 中文 时用 xelatex，否则 pdflatex
    const text = await fsp.readFile(src, 'utf8').catch(() => '')
    const wantsXe = /\\(documentclass(?:\[[^\]]*\])?\{ctex|usepackage(?:\[[^\]]*\])?\{ctex|usepackage(?:\[[^\]]*\])?\{xeCJK|setCJKmainfont)/u.test(text)
    engineName = wantsXe ? 'xelatex' : 'pdflatex'
  }
  bin = e[engineName]
  if (!bin) {
    const fallback = e.xelatex || e.pdflatex
    if (!fallback) throw new Error('还没装 TeX 引擎，先在页面上点「安装」')
    bin = fallback
    engineName = fallback.includes('xelatex') ? 'xelatex' : 'pdflatex'
  }

  const id = crypto.createHash('sha1').update(src).digest('hex').slice(0, 12)
  const outDir = path.join(OUT_DIR, id)
  await fsp.mkdir(outDir, { recursive: true })

  const base = path.basename(src, path.extname(src))
  const srcDir = path.dirname(src)
  const started = Date.now()
  let log = ''
  let ok = false
  let used = 0

  const runPass = async () => {
    try {
      const { stdout, stderr } = await run(
        bin,
        ['-interaction=nonstopmode', '-halt-on-error', '-synctex=1', `-output-directory=${outDir}`, src],
        { timeout: 300000, windowsHide: true, maxBuffer: 16 * 1024 * 1024, cwd: srcDir },
      )
      log = String(stdout || '') + String(stderr || '')
      return true
    } catch (err) {
      log = String(err.stdout || '') + String(err.stderr || '') || String(err.message)
      return false
    }
  }

  // 默认至少跑一遍；日志里明确要再跑（目录、交叉引用、longtable 之类）才补第二遍。
  // 每次 xelatex 启动 + 中文字体加载稳定在 1.7~2 秒，所以第二遍只在必要时花钱。
  const minPasses = Math.max(1, passes)
  let required = minPasses
  let budget = minPasses === 1 ? 2 : minPasses
  let bibtex = null
  for (let i = 0; i < budget; i++) {
    used = i + 1
    ok = await runPass()
    if (!ok) break

    // 第一遍之后看一眼 aux：\bibliography{refs} 会留下 \bibdata，此时先跑 bibtex，
    // 后面两遍才有 .bbl 可读；否则第二遍白跑（引用仍然全是 ?）。
    if (used === 1 && !bibtex) {
      const data = await bibDataOf(outDir, base)
      if (data) {
        bibtex = await runBibtex(bin, srcDir, outDir, base)
        // bibtex 之后至少再跑两遍：一遍读 .bbl，一遍把 \bibcite / 引用编号写定。
        required = Math.max(required, 3)
        budget = Math.max(budget, required)
        continue
      }
    }

    // 够遍数、且日志没要求重跑 → 收工；要求重跑 → 允许补一遍。
    if (used >= required && !(used === 1 && RERUN.test(log))) break
  }

  const pdf = path.join(outDir, `${base}.pdf`)
  const pdfOk = fs.existsSync(pdf)
  let tail = log.split('\n').slice(-40).join('\n')

  // 图片 / 子文件找不到时，十有八九是「拖进来的副本」：浏览器只给文件内容，不给所在的文件夹，
  // 于是副本落进 latex-studio/drop，旁边没有 figures/ 之类的兄弟目录。
  if (!ok && /Unable to load picture or PDF file|File `[^']+' not found/u.test(log)) {
    const missing = []
    for (const m of log.matchAll(/File `([^']+)' not found/gu)) missing.push(m[1])
    for (const m of log.matchAll(/Unable to load picture or PDF file '([^']+)'/gu)) if (!missing.includes(m[1])) missing.push(m[1])
    const inDrop = src.includes(`${path.sep}drop${path.sep}`)
    tail +=
      '\n\n--- 找不到的文件 ---\n' +
      (missing.length ? missing.map((m) => `  ${m}`).join('\n') : '  （日志里没解析出文件名）') +
      '\n' +
      (inDrop
        ? `这个 .tex 在 ${path.join(ROOT, 'drop')} 里，是拖进来的副本。\n` +
          '浏览器只把文件内容交出来，不告诉所在文件夹，所以 figures/ 这些兄弟目录没跟过来。\n' +
          '改用「浏览…」打开原文件（真路径），或者把图片一起拖进来。'
        : `编译时的工作目录是 ${srcDir}，相对路径的图片要从这里能找到才行。\n` +
          '要么把图片放到这个目录下，要么在导言区加 \\graphicspath{{<图片目录>/}}。')
  }

  return {
    ok: ok && pdfOk,
    engine: engineName,
    pdf: pdfOk ? pdf : null,
    pdfName: `${id}/${base}.pdf`,
    outDir,
    ms: Date.now() - started,
    passes: used,
    bibtex,
    log: bibtex && !bibtex.ok ? `${tail}\n\n--- bibtex（失败）---\n${bibtex.log}` : tail,
  }
}

/** 公式预览：把一段 LaTeX 编译成 PNG（按内容哈希缓存），给网页端的公式面板用。 */
export async function previewFormula(input, dpi = 150) {
  const tex = String(input ?? '').trim()
  if (!tex) throw new Error('公式为空')
  const id = crypto.createHash('sha1').update(tex).digest('hex').slice(0, 12)
  const dir = path.join(OUT_DIR, '_formula', id)
  await fsp.mkdir(dir, { recursive: true })
  const png = path.join(dir, 'formula.png')
  if (fs.existsSync(png)) return { png, id, cached: true }

  const e = await engines()
  const nonAscii = /[^\x00-\x7f]/u.test(tex)
  const bin = nonAscii && e.xelatex ? e.xelatex : e.pdflatex || e.xelatex
  if (!bin) throw new Error('还没装 TeX 引擎')
  const engineName = bin.toLowerCase().includes('xelatex') ? 'xelatex' : 'pdflatex'
  // 顶层 align/equation 这类环境不能直接塞进 standalone 的正文里（会报 Missing \endgroup），
  // 预览只需要看排版效果，所以换成对应的内层环境再用行内数学包起来。
  const top = /^\s*\\begin\{(align\*?|flalign\*?|gather\*?|multline\*?|eqnarray\*?|equation\*?|displaymath)\}([\s\S]*)\\end\{[^}]+\}\s*$/u
  let body
  const hit = top.exec(tex)
  if (hit) {
    const env = hit[1]
    const inner = env.startsWith('align') || env.startsWith('flalign') || env.startsWith('eqnarray')
      ? 'aligned'
      : env.startsWith('gather') || env.startsWith('multline')
        ? 'gathered'
        : null
    body = inner ? `$\\displaystyle \\begin{${inner}}${hit[2]}\\end{${inner}}$` : `$\\displaystyle ${hit[2]}$`
  } else {
    body = `$\\displaystyle ${tex}$`
  }
  // standalone 会把版面裁到内容边界，预览图不带整页白边（pdfcrop 需要 perl，这台机器没有）。
  const lines = ['\\documentclass[border=4pt]{standalone}', '\\usepackage{amsmath,amssymb}']
  if (engineName === 'xelatex' && nonAscii) lines.push('\\usepackage{ctex}')
  lines.push('\\begin{document}', body, '\\end{document}')

  const texFile = path.join(dir, 'formula.tex')
  await fsp.writeFile(texFile, lines.join('\n'), 'utf8')
  try {
    await run(bin, ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${dir}`, texFile], {
      timeout: 120000,
      windowsHide: true,
      cwd: dir,
      maxBuffer: 8 * 1024 * 1024,
    })
  } catch (err) {
    const log = String(err.stdout || '') + String(err.stderr || '')
    const reason = log
      .split('\n')
      .filter((line) => /^!|undefined control|missing|not found/iu.test(line))
      .slice(0, 3)
      .join(' / ')
    throw new Error(reason || String(err.message).slice(0, 240))
  }
  const pdf = path.join(dir, 'formula.pdf')
  if (!fs.existsSync(pdf)) throw new Error('没有产出 PDF')

  await run(path.join(path.dirname(bin), 'pdftoppm.exe'), ['-png', '-r', String(dpi), '-singlefile', pdf, path.join(dir, 'formula')], {
    timeout: 60000,
    windowsHide: true,
    cwd: dir,
  })
  if (!fs.existsSync(png)) throw new Error('渲染失败')
  return { png, id, cached: false, engine: engineName }
}

export async function readPdf(name) {
  const safe = name.replace(/\\/g, '/').split('/').filter((s) => s && s !== '..')
  const p = path.join(OUT_DIR, ...safe)
  if (!p.startsWith(OUT_DIR)) throw new Error('路径非法')
  return fsp.readFile(p)
}

// ---------------------------------------------------------------- PDF 预览 / 双向定位
// 预览不用浏览器自带 PDF 阅读器，而是把某一页渲染成 PNG：这样才能拿到点击坐标，
// 交给 synctex 反查源码行（浏览器 PDF 阅读器拿不到点击位置）。

async function binDir() {
  const e = await engines()
  const any = e.xelatex || e.pdflatex
  if (!any) throw new Error('还没装 TeX 引擎')
  return path.dirname(any)
}

function pdfAbs(name) {
  const safe = String(name).replace(/\\/g, '/').split('/').filter((s) => s && s !== '..' && s !== '.')
  const p = path.join(OUT_DIR, ...safe)
  if (!p.startsWith(OUT_DIR)) throw new Error('路径非法')
  return p
}

export async function pdfInfo(name) {
  const pdf = pdfAbs(name)
  if (!fs.existsSync(pdf)) throw new Error(`找不到 PDF：${name}`)
  const bin = await binDir()
  const info = { pages: 1, width: 595.28, height: 841.89 }
  try {
    const { stdout } = await run(path.join(bin, 'pdfinfo.exe'), [pdf], { timeout: 30000, windowsHide: true })
    const pages = /Pages:\s+(\d+)/u.exec(stdout)
    const size = /Page size:\s+([\d.]+)\s+x\s+([\d.]+)/u.exec(stdout)
    if (pages) info.pages = Number(pages[1])
    if (size) {
      info.width = Number(size[1])
      info.height = Number(size[2])
    }
  } catch {}
  return info
}

export async function renderPage(name, page = 1, dpi = 110) {
  const pdf = pdfAbs(name)
  if (!fs.existsSync(pdf)) throw new Error(`找不到 PDF：${name}`)
  const bin = await binDir()
  const pagesDir = path.join(path.dirname(pdf), 'pages')
  await fsp.mkdir(pagesDir, { recursive: true })
  // 缓存键要带上 PDF 的修改时间：重新编译后同一页必须重渲染，否则一直是旧图。
  const mtime = Math.round((await fsp.stat(pdf)).mtimeMs)
  const out = path.join(pagesDir, `p${page}-${dpi}-${mtime}.png`)
  if (fs.existsSync(out)) return { path: out, cached: true }
  const prefix = path.join(pagesDir, `p${page}-${dpi}-${mtime}`)
  await run(path.join(bin, 'pdftoppm.exe'), ['-png', '-r', String(dpi), '-f', String(page), '-l', String(page), pdf, prefix], {
    timeout: 120000,
    windowsHide: true,
  })
  // pdftoppm 对单页会输出 <prefix>-1.png 或 <prefix>.png，找一下
  const candidates = (await fsp.readdir(pagesDir)).filter((f) => f.startsWith(`p${page}-${dpi}-${mtime}`) && f.endsWith('.png'))
  if (!candidates.length) throw new Error('渲染失败：pdftoppm 没有产出图片')
  const hit = path.join(pagesDir, candidates[0])
  if (hit !== out) await fsp.rename(hit, out).catch(() => {})
  return { path: out, cached: false }
}

/** PDF 上点一下 → 源码行（synctex 反向查找）。x/y 用 PDF 点（pt），原点左上。 */
export async function inverseSearch(name, page, x, y) {
  const pdf = pdfAbs(name)
  const bin = await binDir()
  const { stdout } = await run(path.join(bin, 'synctex.exe'), ['edit', '-o', `${page}:${x}:${y}:${pdf}`], { timeout: 60000, windowsHide: true })
  const input = /Input:(.+)/u.exec(stdout)
  const line = /Line:(\d+)/u.exec(stdout)
  const column = /Column:(-?\d+)/u.exec(stdout)
  if (!input || !line) throw new Error('这一处没有对应源码（可能落在图片、页边或没有 synctex 信息的区域）')
  return { file: input[1].trim(), line: Number(line[1]), column: Number(column?.[1] ?? -1) }
}

/** 源码第 line 行 → PDF 的页与坐标（synctex 正向查找）。 */
export async function forwardSearch(file, line, column = 1) {
  const src = path.resolve(file)
  const id = crypto.createHash('sha1').update(src).digest('hex').slice(0, 12)
  const outDir = path.join(OUT_DIR, id)
  const base = path.basename(src, path.extname(src))
  const pdf = path.join(outDir, `${base}.pdf`)
  if (!fs.existsSync(pdf)) throw new Error('这个文件还没编译过（先编译一次，才有时源码信息）')
  const bin = await binDir()
  const { stdout } = await run(path.join(bin, 'synctex.exe'), ['view', '-i', `${line}:${column}:${src}`, '-o', pdf], { timeout: 60000, windowsHide: true })
  const page = /Page:(\d+)/u.exec(stdout)
  const x = /x:([\d.]+)/u.exec(stdout)
  const y = /y:([\d.]+)/u.exec(stdout)
  if (!page) throw new Error('这一行没有出现在 PDF 里')
  return { page: Number(page[1]), x: Number(x?.[1] ?? 0), y: Number(y?.[1] ?? 0), pdfName: `${id}/${base}.pdf` }
}

/** 用系统默认浏览器打开一个 URL（桌面端 window.open 会被 Electron 拦掉）。 */
export async function openExternal(url) {
  const target = String(url)
  if (process.platform === 'win32') {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${target.replace(/'/g, "''")}'`], {
      timeout: 20000,
      windowsHide: true,
    })
    return
  }
  if (process.platform === 'darwin') {
    await run('open', [target], { timeout: 20000 })
    return
  }
  await run('xdg-open', [target], { timeout: 20000 })
}

/** 系统文件对话框：返回选中文件绝对路径（取消返回 null）。 */
export async function pickFile() {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms | Out-Null',
    '$d = New-Object System.Windows.Forms.OpenFileDialog',
    "$d.Filter = 'LaTeX 文件 (*.tex)|*.tex|所有文件 (*.*)|*.*'",
    "$d.Title = '选择 .tex 文件'",
    "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName }",
  ].join('; ')
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { timeout: 300000, windowsHide: true })
  const picked = String(stdout || '').trim().split(/\r?\n/u).pop()?.trim()
  return picked || null
}

/** 拖进来的文件（浏览器拿不到绝对路径时）：存到 drop 目录再当普通文件用。 */
export async function saveDropped(name, content) {
  const dir = path.join(ROOT, 'drop')
  await fsp.mkdir(dir, { recursive: true })
  const safe = String(name || 'dropped.tex').replace(/[\\/:*?"<>|]/g, '_')
  const p = path.join(dir, safe)
  await fsp.writeFile(p, String(content ?? ''), 'utf8')
  return p
}

/** 内置文件浏览器：不依赖系统对话框，列目录用。dir 为空时列盘符。 */
export async function listDir(dir) {
  if (!dir) {
    const drives = []
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
      const root = `${letter}:\\`
      try {
        await fsp.access(root)
        drives.push({ name: root, path: root, kind: 'dir' })
      } catch {}
    }
    return { dir: '', parent: null, entries: drives }
  }
  const target = path.resolve(String(dir).replace(/^["']|["']$/g, ''))
  const entries = []
  let dirents = []
  try {
    dirents = await fsp.readdir(target, { withFileTypes: true })
  } catch (err) {
    throw new Error(`打不开目录：${target}（${err.code ?? err.message}）`)
  }
  for (const d of dirents) {
    if (d.name.startsWith('.')) continue
    const full = path.join(target, d.name)
    if (d.isDirectory()) entries.push({ name: d.name, path: full, kind: 'dir' })
    else if (/\.(tex|bib|sty|cls|txt)$/i.test(d.name)) entries.push({ name: d.name, path: full, kind: 'file' })
  }
  entries.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1))
  const parent = path.dirname(target)
  return { dir: target, parent: parent === target ? null : parent, entries: entries.slice(0, 400) }
}
