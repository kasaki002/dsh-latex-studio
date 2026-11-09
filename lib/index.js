// dsh-latex-studio：便携 MiKTeX（xelatex + pdflatex）+ 网页编辑器 + 编译工具。
// 只要两件事：能在网页里写 .tex 并编译出 PDF；我能用工具在会话里编译。
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { PAGE } from './page.mjs'
import { compile, forwardSearch, install, inverseSearch, listDir, openExternal, pdfInfo, pickFile, previewFormula, readPdf, renderPage, saveDropped, status } from './tex.mjs'
import { OUT_DIR, PREFS_FILE, ROOT } from './paths.mjs'

export const name = 'latex-studio'
export const inject = ['tools']

const TEXT_OUT = {
  schema: { type: 'object', additionalProperties: true, properties: { text: { type: 'string', required: true } } },
  render: (_args, v) => [{ type: 'text', text: v.text }],
}

const PREFIX = '/dsh-latex'
const STATE_FILE = path.join(ROOT, 'state.json')

// ---------------------------------------------------------------- 界面状态
// 按 session 分开存：切会话/关窗口回来能接着干，两个会话也不会互相覆盖草稿。
async function readAllState() {
  try {
    return JSON.parse(await fsp.readFile(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

async function getUiState(key) {
  const all = await readAllState()
  return all[key] ?? null
}

async function putUiState(key, patch) {
  const all = await readAllState()
  const prev = all[key] ?? {}
  const next = { ...prev }
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === undefined) continue
    next[k] = v
  }
  all[key] = next
  // 只保留最近 20 个会话的状态，别无限长
  const keys = Object.keys(all)
  if (keys.length > 20) {
    for (const k of keys.slice(0, keys.length - 20)) delete all[k]
  }
  await fsp.mkdir(ROOT, { recursive: true })
  await fsp.writeFile(STATE_FILE, JSON.stringify(all), 'utf8')
  return next
}

// ---------------------------------------------------------------- 偏好
// 全局偏好存 prefs.json（跟按会话的 state.json 分开，避免被 20 条上限清理掉）。
// viewEnabled 管会话视图，theme 管网页端的主题（端口每次启动都变，localStorage 靠不住）。
const THEMES = new Set(['system', 'light', 'dark'])
const DEFAULT_PREFS = { viewEnabled: true, theme: 'system', split: 0.52 }
const SPLIT_MIN = 0.15
const SPLIT_MAX = 0.85

function clampSplit(value) {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value))
}

function normalizePrefs(raw) {
  return {
    viewEnabled: raw?.viewEnabled !== false,
    theme: THEMES.has(raw?.theme) ? raw.theme : 'system',
    split: typeof raw?.split === 'number' && Number.isFinite(raw.split) ? clampSplit(raw.split) : DEFAULT_PREFS.split,
  }
}

async function readPrefs() {
  try {
    return normalizePrefs(JSON.parse(await fsp.readFile(PREFS_FILE, 'utf8')))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

async function writePrefs(patch) {
  const next = { ...(await readPrefs()), ...patch }
  await fsp.mkdir(ROOT, { recursive: true })
  await fsp.writeFile(PREFS_FILE, JSON.stringify(next, null, 2), 'utf8')
  return next
}

// ---------------------------------------------------------------- 一次性票据
// 桌面端界面跑在 dsh-app://app 里，window.open 会被 Electron 直接拦掉，所以设置里的
// 「打开网页」改成由 Host 用系统浏览器打开 http://127.0.0.1:<port>/dsh-latex/。
// 系统浏览器没有 DSH 的登录 cookie，于是发一张 2 分钟、一次性的票据，换来本站点
// 自己的 session cookie（Path 限定在 /dsh-latex，不碰 DSH 的其他路由）。
const TICKET_TTL = 2 * 60 * 1000
const SESSION_TTL = 12 * 60 * 60 * 1000
const SESSION_COOKIE = 'dsh_latex_sid'
const tickets = new Map()
const sessions = new Map()

function newSecret() {
  return crypto.randomBytes(24).toString('base64url')
}

function sweep(map, now) {
  for (const [key, expiresAt] of map) if (expiresAt <= now) map.delete(key)
}

function issueTicket() {
  const now = Date.now()
  sweep(tickets, now)
  if (tickets.size > 32) tickets.clear()
  const ticket = newSecret()
  tickets.set(ticket, now + TICKET_TTL)
  return ticket
}

/** 一次性：取出即删；过期也算失败。 */
function consumeTicket(ticket) {
  const expiresAt = tickets.get(ticket)
  if (!expiresAt) return false
  tickets.delete(ticket)
  return expiresAt > Date.now()
}

function createSession() {
  const now = Date.now()
  sweep(sessions, now)
  if (sessions.size > 32) sessions.clear()
  const sid = newSecret()
  sessions.set(sid, now + SESSION_TTL)
  return sid
}

function readCookie(req, name) {
  const raw = req.headers?.cookie
  if (typeof raw !== 'string' || !raw) return null
  for (const part of raw.split(';')) {
    const at = part.indexOf('=')
    if (at < 0) continue
    if (part.slice(0, at).trim() === name) return part.slice(at + 1).trim()
  }
  return null
}

function hasSession(req) {
  const sid = readCookie(req, SESSION_COOKIE)
  if (!sid) return false
  const expiresAt = sessions.get(sid)
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(sid)
    return false
  }
  return true
}

function sessionCookie(sid) {
  return `${SESSION_COOKIE}=${sid}; Path=${PREFIX}; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL / 1000)}`
}

// ---------------------------------------------------------------- 鉴权
// /dsh-latex/* 注册在 dsh 的 webServer 上，不是 dsh-client-connection 的受保护
// 路由：同一端口上 `/` 要登录，而裸 handler 不会，所以这里自己过一遍同一套
// Host/Origin + 浏览器 cookie 校验，否则本机任何程序都能读写任意文件。
const LOGIN_PAGE = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>LaTeX 工作室 · 需要登录</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#16181d;color:#e6e8ec;font:14px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
main{max-width:520px;padding:28px;border:1px solid #2c3038;border-radius:12px;background:#1d2026}
h1{margin:0 0 12px;font-size:16px}p{margin:0;color:#a8adb7}code{color:#8ab4ff}</style></head>
<body><main><h1>需要登录 DSH 网页</h1>
<p>这个地址要一份有效会话才能打开。请回到 DSH，在 <b>设置 → 通用 → LaTeX 工作室</b> 里点
「打开网页」：Host 会用系统浏览器打开这里，并带一张 2 分钟内有效的一次性票据。
票据或会话过期了就再点一次。</p></main></body></html>`

const FORBIDDEN_PAGE = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>LaTeX 工作室 · 来源不被信任</title></head><body style="background:#16181d;color:#e6e8ec;
font:14px/1.6 sans-serif;padding:28px">请求来源不被信任（Host/Origin 校验失败），已拒绝。</body></html>`

function toHeaders(raw) {
  const headers = new Headers()
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (v === undefined) continue
    try {
      headers.set(k, Array.isArray(v) ? v.join(', ') : String(v))
    } catch {}
  }
  return headers
}

/**
 * 返回 401 / 403 / 503（要拒绝），或 undefined（放行）。
 * 用 connection.requestRejection 复用 DSH 自己的浏览器认证与 Host/Origin 校验。
 */
function rejectStatus(ctx, req) {
  const conn = ctx.get('connection')
  if (!conn || typeof conn.requestRejection !== 'function') return 503
  return conn.requestRejection({ headers: toHeaders(req.headers) })
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('请求体太大'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 二进制版本：整目录拖进来时按原始字节写盘，不经过 JSON/base64。 */
function readBodyBuffer(req, limit = 64 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('单个文件太大（超过 64 MB）'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * 把浏览器给的相对路径落到 ROOT/drop/<root>/ 下面：拒绝绝对路径、盘符、.. 和保留字符，
 * 保证不会因为一个伪造的 path 参数写到目录外面去。
 */
function resolveDropPath(root, rel) {
  const rootText = String(root || '')
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(rootText) || rootText === '.' || rootText === '..') throw new Error('root 非法')
  const parts = String(rel || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
  if (!parts.length) throw new Error('path 为空')
  for (const part of parts) {
    if (part === '.' || part === '..' || /[:*?"<>|]/u.test(part)) throw new Error(`路径非法：${rel}`)
  }
  const dropRoot = path.join(ROOT, 'drop')
  const base = path.join(dropRoot, rootText)
  if (!base.startsWith(dropRoot + path.sep)) throw new Error('root 非法')
  const target = path.join(base, ...parts)
  if (!target.startsWith(base + path.sep)) throw new Error('路径非法')
  return target
}

function json(res, code, value) {
  const body = JSON.stringify(value)
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

/**
 * Content-Disposition 的 header 值只能是 latin1；中文文件名直接塞进去会让 Node 抛
 * ERR_INVALID_CHAR（页面 iframe 里就变成了那串 JSON 错误）。按 RFC 5987 用 filename*
 * 带 UTF-8 名字，filename 留一个 ASCII 兜底。
 */
function pdfDisposition(name, download = false) {
  const base = path.basename(name)
  const ascii = base.replace(/[^\x20-\x7e]/gu, '_').replace(/["\\]/g, '_')
  const utf8 = encodeURIComponent(base).replace(/['()*]/gu, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  const kind = download ? 'attachment' : 'inline'
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${utf8}`
}

export function apply(ctx) {
  // ---------------------------------------------------------------- agent 工具
  ctx.inject(['tools'], (actx) => {
    actx.effect(
      () =>
        actx.tools.register(
          defineTool({
            name: 'latex_status',
            description: '检查 LaTeX 引擎（xelatex / pdflatex）是否已装好，返回路径、版本、安装进度。',
            parameters: {},
            output: TEXT_OUT,
            isConcurrencySafe: () => true,
            async execute() {
              const st = await status()
              const lines = [
                st.installed ? `引擎就绪：${st.version ?? ''}` : '引擎还没装',
                `xelatex: ${st.engines.xelatex ?? '无'}`,
                `pdflatex: ${st.engines.pdflatex ?? '无'}`,
                `目录: ${st.texDir}`,
              ]
              if (st.installing) lines.push(`正在安装：${st.phase}`)
              if (st.error) lines.push(`上次安装失败：${st.error}`)
              return { text: lines.join('\n') }
            },
          }),
        ),
      'latex-studio: latex_status',
    )

    actx.effect(
      () =>
        actx.tools.register(
          defineTool({
            name: 'latex_compile',
            description:
              '编译一个 .tex 文件成 PDF。engine 可选 auto / xelatex / pdflatex；中文文档用 xelatex（auto 会自己判断）。需要时自动补 LaTeX 第二遍；文档用 \\bibliography 时自动跑 bibtex。返回 PDF 绝对路径和日志尾部。',
            parameters: {
              path: { type: 'string', required: true, description: '.tex 文件绝对路径' },
              engine: { type: 'string', enum: ['auto', 'xelatex', 'pdflatex'] },
            },
            output: TEXT_OUT,
            timeoutMs: 320000,
            async execute(args) {
              const r = await compile({ file: args.path, engine: args.engine ?? 'auto' })
              const head = r.ok
                ? `✓ 编译成功（${r.engine}，${r.passes} 遍，${r.ms}ms）`
                : `✗ 编译失败（${r.engine}，${r.passes} 遍，${r.ms}ms）`
              const bib = r.bibtex ? (r.bibtex.ok ? `bibtex ✓（${r.bibtex.ms}ms）` : 'bibtex ✗（见日志）') : null
              return {
                text: [head, bib, r.pdf ? `PDF: ${r.pdf}` : '没有产出 PDF', '', '--- 日志尾部 ---', r.log].filter(Boolean).join('\n'),
              }
            },
          }),
        ),
      'latex-studio: latex_compile',
    )
  })

  // ---------------------------------------------------------------- 网页
  ctx.inject(['webServer'], (wctx) => {
    wctx.effect(
      () =>
        wctx.webServer.register({
          kind: 'prefix',
          path: PREFIX,
          handler: async (req, res) => {
            const url = new URL(req.url ?? '/', 'http://x')
            const rest = url.pathname.slice(PREFIX.length) || '/'
            const isApi = rest.startsWith('/api')

            // 先过鉴权：没登录、来源不信任、或本组成没有认证服务，一律不往下走。
            let blocked
            try {
              blocked = rejectStatus(wctx, req)
            } catch (err) {
              json(res, 500, { ok: false, error: `认证检查失败：${String(err?.message ?? err)}` })
              return
            }
            // 系统浏览器首次打开时没有 DSH cookie：用一次性票据换本站自己的 session。
            if (blocked === 401) {
              if (hasSession(req)) {
                const stale = url.searchParams.get('t')
                if (stale) tickets.delete(stale)
                blocked = undefined
              } else {
                const ticket = url.searchParams.get('t')
                if (!isApi && req.method === 'GET' && ticket && consumeTicket(ticket)) {
                  res.statusCode = 303
                  res.setHeader('Set-Cookie', sessionCookie(createSession()))
                  res.setHeader('Location', `${PREFIX}/`)
                  res.setHeader('Cache-Control', 'no-store')
                  res.end()
                  return
                }
              }
            }
            if (blocked) {
              if (isApi) {
                const message =
                  blocked === 403
                    ? '请求来源不被信任（Host/Origin 校验失败）'
                    : blocked === 503
                      ? '网页认证服务不可用'
                      : '未登录或登录已过期，请在 设置 → 通用 → LaTeX 工作室 里点「打开网页」'
                json(res, blocked, { ok: false, error: message })
              } else {
                res.statusCode = blocked
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                res.setHeader('Cache-Control', 'no-store')
                res.end(blocked === 403 ? FORBIDDEN_PAGE : LOGIN_PAGE)
              }
              return
            }

            try {
              if (req.method === 'GET' && (rest === '/' || rest === '')) {
                res.statusCode = 200
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                res.setHeader('Cache-Control', 'no-store')
                res.end(PAGE)
                return
              }
              if (rest === '/api/status' && req.method === 'GET') {
                json(res, 200, await status())
                return
              }
              if (rest === '/api/install' && req.method === 'POST') {
                const r = await install()
                json(res, 200, { ok: true, ...r })
                return
              }
              if (rest === '/api/prefs' && req.method === 'GET') {
                json(res, 200, { ok: true, ...(await readPrefs()) })
                return
              }
              if (rest === '/api/prefs' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                const patch = {}
                if (typeof body?.viewEnabled === 'boolean') patch.viewEnabled = body.viewEnabled
                if (THEMES.has(body?.theme)) patch.theme = body.theme
                if (typeof body?.split === 'number' && Number.isFinite(body.split)) patch.split = clampSplit(body.split)
                if (Object.keys(patch).length === 0) throw new Error('没有可保存的偏好字段（viewEnabled / theme / split）')
                const prefs = await writePrefs(patch)
                json(res, 200, { ok: true, ...prefs })
                return
              }
              if (rest === '/api/open-url' && req.method === 'POST') {
                const origin = String(wctx.webServer.getOrigin?.() ?? '').replace(/\/+$/, '')
                if (!origin) throw new Error('还没监听端口，拿不到网页地址')
                await openExternal(`${origin}${PREFIX}/?t=${issueTicket()}`)
                json(res, 200, { ok: true })
                return
              }
              if (rest === '/api/formula' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req, 2 * 1024 * 1024))
                try {
                  const r = await previewFormula(body?.tex)
                  json(res, 200, { ok: true, url: `${PREFIX}/api/formula?h=${r.id}`, cached: r.cached })
                } catch (err) {
                  json(res, 200, { ok: false, error: String(err?.message ?? err) })
                }
                return
              }
              if (rest === '/api/formula' && req.method === 'GET') {
                const h = String(url.searchParams.get('h') || '')
                if (!/^[0-9a-f]{12}$/u.test(h)) throw new Error('h 非法')
                const p = path.join(OUT_DIR, '_formula', h, 'formula.png')
                if (!fs.existsSync(p)) throw new Error('预览不存在')
                res.statusCode = 200
                res.setHeader('Content-Type', 'image/png')
                res.setHeader('Cache-Control', 'no-store')
                res.end(await fsp.readFile(p))
                return
              }
              if (rest === '/api/file' && req.method === 'GET') {
                const p = (url.searchParams.get('path') ?? '').trim().replace(/^["']|["']$/g, '')
                if (!p) throw new Error('缺少 path 参数')
                const abs = path.resolve(p)
                if (!fs.existsSync(abs)) throw new Error(`文件不存在：${abs}`)
                let content = await fsp.readFile(abs, 'utf8')
                if (content.charCodeAt(0) === 0xfeff) content = content.slice(1)
                json(res, 200, { ok: true, path: abs, content })
                return
              }
              if (rest === '/api/list' && req.method === 'GET') {
                json(res, 200, { ok: true, ...(await listDir(url.searchParams.get('dir') ?? '')) })
                return
              }
              if (rest === '/api/state' && req.method === 'GET') {
                const key = url.searchParams.get('key') || 'default'
                json(res, 200, { ok: true, state: await getUiState(key) })
                return
              }
              if (rest === '/api/state' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                const key = String(body.key || 'default')
                const state = await putUiState(key, body.state ?? {})
                json(res, 200, { ok: true, state })
                return
              }
              if (rest === '/api/save' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                if (!body?.path) throw new Error('缺少 path')
                const p = path.resolve(body.path)
                await fsp.mkdir(path.dirname(p), { recursive: true })
                const content = String(body.content ?? '')
                await fsp.writeFile(p, content, 'utf8')
                json(res, 200, { ok: true, path: p, bytes: Buffer.byteLength(content) })
                return
              }
              if (rest === '/api/new' && req.method === 'POST') {
                // 真正的「新建」：拒绝覆盖已有文件，父目录不存在就建出来。
                const body = JSON.parse(await readBody(req))
                if (!body?.path) throw new Error('缺少 path')
                const p = path.resolve(body.path)
                if (fs.existsSync(p)) throw new Error(`文件已存在：${p}`)
                await fsp.mkdir(path.dirname(p), { recursive: true })
                const content = String(body.content ?? '')
                await fsp.writeFile(p, content, 'utf8')
                json(res, 200, { ok: true, path: p, bytes: Buffer.byteLength(content) })
                return
              }
              if (rest === '/api/compile' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                if (!body?.path) throw new Error('缺少 path')
                json(res, 200, await compile({ file: body.path, engine: body.engine ?? 'auto' }))
                return
              }
              if (rest === '/api/pdf' && req.method === 'GET') {
                const name = url.searchParams.get('name') ?? ''
                if (!name) throw new Error('缺少 name')
                const buf = await readPdf(name)
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', pdfDisposition(name, url.searchParams.get('download') === '1'))
                res.end(buf)
                return
              }
              if (rest === '/api/pdfinfo' && req.method === 'GET') {
                json(res, 200, { ok: true, ...(await pdfInfo(url.searchParams.get('name') ?? '')) })
                return
              }
              if (rest === '/api/render' && req.method === 'GET') {
                const name = url.searchParams.get('name') ?? ''
                const page = Number(url.searchParams.get('page') ?? 1)
                const dpi = Number(url.searchParams.get('dpi') ?? 110)
                const { path: png } = await renderPage(name, page, dpi)
                const buf = await fsp.readFile(png)
                res.statusCode = 200
                res.setHeader('Content-Type', 'image/png')
                res.setHeader('Cache-Control', 'no-cache')
                res.end(buf)
                return
              }
              if (rest === '/api/locate' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                const hit = await inverseSearch(body.name, Number(body.page ?? 1), Number(body.x ?? 0), Number(body.y ?? 0))
                json(res, 200, { ok: true, ...hit })
                return
              }
              if (rest === '/api/forward' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                const hit = await forwardSearch(body.path, Number(body.line ?? 1), Number(body.column ?? 1))
                json(res, 200, { ok: true, ...hit })
                return
              }
              if (rest === '/api/pick' && req.method === 'POST') {
                const picked = await pickFile()
                json(res, 200, { ok: true, path: picked })
                return
              }
              if (rest === '/api/droptext' && req.method === 'POST') {
                const body = JSON.parse(await readBody(req))
                const p = await saveDropped(body.name, body.content)
                json(res, 200, { ok: true, path: p })
                return
              }
              if (rest === '/api/drop-file' && req.method === 'POST') {
                // 拖整个文件夹时，每个文件一条请求：?root=<批次>&path=<相对路径>，body 是原始字节。
                const target = resolveDropPath(url.searchParams.get('root'), url.searchParams.get('path'))
                const buf = await readBodyBuffer(req, 64 * 1024 * 1024)
                await fsp.mkdir(path.dirname(target), { recursive: true })
                await fsp.writeFile(target, buf)
                json(res, 200, { ok: true, path: target })
                return
              }
              json(res, 404, { ok: false, error: `未知路径 ${req.method} ${rest}` })
            } catch (err) {
              json(res, 500, { ok: false, error: String(err?.message ?? err) })
            }
          },
        }),
      'latex-studio: web routes',
    )
    wctx.logger?.info?.('latex-studio: UI at %s/', PREFIX)
  })
}

export { ROOT }
