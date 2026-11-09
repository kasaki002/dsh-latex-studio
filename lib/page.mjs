// 网页编辑器页面（纯字符串，不依赖前端框架，省掉打包）。
export const PAGE = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LaTeX 工作室</title>
<style>
  :root{
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --bg:#16181d; --panel:#1d2026; --panel2:#23272f; --line:#2c3038;
    --fg:#e6e8ec; --dim:#8b919c; --brand:#4d6bfe; --err:#e05a5a; --ok:#3fa860;
    --hover:rgba(127,127,127,.16); --shadow:0 12px 32px rgba(0,0,0,.45);
    --overlay:rgba(10,12,16,.55);
    color-scheme: dark;
  }
  :root[data-theme="light"]{
    --bg:#f4f6f9; --panel:#ffffff; --panel2:#eef1f5; --line:#d6dbe3;
    --fg:#1b1f27; --dim:#5d6573; --brand:#2f55d4; --err:#c0392b; --ok:#1f7a45;
    --hover:rgba(20,30,50,.08); --shadow:0 12px 32px rgba(20,30,50,.18);
    --overlay:rgba(20,30,50,.28);
    color-scheme: light;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;display:flex;flex-direction:column}
  header{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .morebar{display:flex;align-items:center;gap:6px;padding:6px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--panel2)}
  .iconbtn{width:26px;height:26px;padding:0;flex:0 0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1}
  .title{font-weight:600;margin-right:4px}
  .badge{font-size:11.5px;padding:2px 8px;border-radius:999px;background:var(--hover);color:var(--dim)}
  .badge.ok{color:var(--ok)} .badge.err{color:var(--err)}
  input,select,button,textarea{font:inherit;color:var(--fg);background:var(--panel);border:1px solid var(--line);border-radius:6px;outline:none}
  input,select{height:28px;padding:0 8px}
  input:focus,select:focus,textarea:focus{border-color:var(--brand)}
  button{height:28px;padding:0 10px;cursor:pointer}
  button:hover{background:var(--panel2)}
  button.primary{background:var(--brand);border-color:var(--brand);color:#fff}
  button.primary:hover{filter:brightness(1.08)}
  button:disabled{opacity:.5;cursor:default}
  .grow{flex:1}
  main{flex:1;display:flex;min-height:0;--left:52%}
  .pane{display:flex;flex-direction:column;min-width:0;min-height:0}
  .pane.left{flex:0 0 var(--left);min-width:140px}
  .pane.right{flex:1 1 0;min-width:180px}
  .splitter{flex:0 0 6px;cursor:col-resize;background:var(--line);position:relative;touch-action:none}
  #picker{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:var(--overlay)}
  .picker-card{width:min(600px,88vw);max-height:min(70vh,620px);display:flex;flex-direction:column;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);padding:12px}
  .picker-head{display:flex;align-items:center;gap:8px}
  #pk-dir{flex:1;min-width:0;font-family:var(--mono);font-size:12px;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .picker-list{overflow:auto;flex:1;min-height:120px;border:1px solid var(--line);border-radius:8px;padding:4px}
  .pk-row{padding:6px 8px;border-radius:6px;cursor:pointer;font-family:var(--mono);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pk-row:hover{background:var(--hover)}
  .pk-empty{padding:12px;color:var(--dim);font-size:12.5px}
  .picker-foot{padding-top:6px}
  #newdlg{position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;background:var(--overlay)}
  .new-card{width:min(560px,90vw);display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow)}
  .new-title{font-size:13px;font-weight:600}
  .new-row{display:flex;align-items:center;gap:8px}
  .new-row span{flex:0 0 auto;width:44px;font-size:12px;color:var(--dim)}
  .new-row input{flex:1;min-width:0;font-family:var(--mono);font-size:12px}
  .new-check{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim);cursor:pointer}
  .new-check input{height:auto;padding:0}
  .new-error{min-height:16px;font-size:12px;color:var(--err)}
  .new-actions{display:flex;justify-content:flex-end;gap:8px}
  .pathrow{display:flex;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line);align-items:center;flex-wrap:wrap}
  .pathrow input{flex:1;min-width:180px;font-family:var(--mono);font-size:12px}
  #editor{flex:1;resize:none;border:0;border-radius:0;background:transparent;padding:12px 14px;font-family:var(--mono);font-size:12.5px;line-height:1.65;tab-size:2}
  #pdf{flex:1;border:0;background:#fff}
  #empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dim);padding:20px;text-align:center}
  footer{border-top:1px solid var(--line);max-height:200px;overflow:auto;padding:8px 12px;font-family:var(--mono);font-size:11.5px;line-height:1.55;color:var(--dim);white-space:pre-wrap}
  .hidden{display:none!important}
  #fx{border-top:1px solid var(--line);height:250px;flex:0 0 auto;display:flex;flex-direction:column;min-height:0}
  .fx-tabs{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .fx-tabs button{height:24px;padding:0 8px;font-size:12px}
  .fx-tabs button.on{background:var(--brand);border-color:var(--brand);color:#fff}
  .fx-check{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--dim);cursor:pointer}
  .fx-check input{height:auto;padding:0}
  .fx-body{flex:1;min-height:0;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
  .fx-cats{display:flex;gap:4px;flex-wrap:wrap}
  .fx-cats button{height:22px;padding:0 8px;font-size:11.5px;border-radius:999px}
  .fx-cats button.on{background:var(--hover);border-color:var(--line)}
  .fx-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));gap:4px}
  .fx-tile{height:30px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-size:15px;border:1px solid var(--line);border-radius:6px;background:var(--panel);cursor:pointer;overflow:hidden}
  .fx-tile:hover{background:var(--panel2)}
  .fx-tile.wide{grid-column:span 3;justify-content:flex-start;padding:0 8px;font-size:11.5px;white-space:nowrap;text-overflow:ellipsis}
  #fx-preview{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding:8px}
  #fx-input{height:62px;resize:none;padding:6px 8px;font-family:var(--mono);font-size:12px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--fg)}
  .fx-actions{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--dim)}
  .fx-actions .link{color:var(--brand);text-decoration:none}
  .fx-img{flex:1;min-height:60px;display:flex;align-items:center;justify-content:center;background:var(--panel2);border-radius:8px;overflow:auto;padding:4px}
  .fx-img img{max-width:100%;max-height:110px}
  #drop{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:var(--overlay)}
  #drop.on{display:flex}
  #drop .box{border:2px dashed var(--brand);border-radius:14px;padding:34px 46px;background:var(--panel);box-shadow:var(--shadow);text-align:center;max-width:min(560px,86vw)}
  #drop .t{font-size:16px;font-weight:600}
  #drop .s{margin-top:8px;font-size:12px;color:var(--dim);line-height:1.6}
</style>
</head>
<body>
<header>
  <button id="reset" class="iconbtn" title="重置" aria-label="重置">↺</button>
  <span class="title">LaTeX 工作室</span>
  <span id="status" class="badge">检查中…</span>
  <button id="install" class="primary hidden">安装引擎（约 150 MB）</button>
  <span class="grow"></span>
  <button id="fx-toggle">∑ 公式</button>
  <select id="theme" title="主题">
    <option value="dark">深色</option>
    <option value="light">浅色</option>
    <option value="system">跟随系统</option>
  </select>
  <select id="engine" title="编译引擎">
    <option value="auto">自动</option>
    <option value="xelatex">xelatex</option>
    <option value="pdflatex">pdflatex</option>
  </select>
  <button id="compile" class="primary">编译</button>
  <button id="save">保存</button>
  <button id="more-toggle">更多 ▾</button>
</header>
<div id="more" class="morebar hidden">
  <button id="download" class="hidden">下载 PDF</button>
</div>

<main id="panes">
  <section class="pane left">
    <div class="pathrow">
      <input id="path" placeholder="C:\path\to\doc.tex" spellcheck="false">
      <button id="open">打开</button>
      <button id="newfile">新建</button>
      <button id="browse">导入文件</button>
    </div>
    <textarea id="editor" spellcheck="false" placeholder="左边写 LaTeX，右边出 PDF。先在上面填文件路径、点「导入文件」选文件，或把 .tex / 项目文件夹拖进窗口。"></textarea>
    <div id="fx" class="hidden">
      <div class="fx-tabs">
        <button id="fx-tab-symbols" class="on">符号</button>
        <button id="fx-tab-templates">模板</button>
        <button id="fx-tab-preview">预览</button>
        <label class="fx-check"><input type="checkbox" id="fx-wrap" checked> 包 $…$</label>
        <span class="grow"></span>
        <button id="fx-close">收起</button>
      </div>
      <div id="fx-symbols" class="fx-body"></div>
      <div id="fx-templates" class="fx-body hidden"></div>
      <div id="fx-preview" class="hidden">
        <textarea id="fx-input" spellcheck="false" placeholder="输入 LaTeX 公式，例如 \frac{a}{b} 或 \begin{aligned}...\end{aligned}；Ctrl+Enter 插入"></textarea>
        <div class="fx-actions">
          <button id="fx-insert" class="primary">插入到文档</button>
          <a id="fx-download" class="link" download="formula.png" href="#">下载图片</a>
          <span id="fx-status"></span>
        </div>
        <div class="fx-img"><img id="fx-preview-img" alt="公式预览"></div>
      </div>
    </div>
  </section>
  <div id="splitter" class="splitter" role="separator" aria-orientation="vertical" aria-label="拖动调整编辑区和预览区的宽度" aria-valuemin="15" aria-valuemax="85" aria-valuenow="52" tabindex="0"></div>
  <section class="pane right">
    <div id="empty">还没有 PDF。点「编译」。</div>
    <iframe id="pdf" class="hidden" title="PDF 预览"></iframe>
  </section>
</main>
<footer id="log">就绪。</footer>

<div id="drop">
  <div class="box">
    <div class="t">把 .tex 或整个项目文件夹拖到这里</div>
    <div class="s">拖文件夹：连同 figures/、.bib 一起按原结构存到 latex-studio/drop/，相对路径不会断。<br>拖单个 .tex：只能存副本，没有 figures/；也可以点「导入文件」直接打开原文件。</div>
  </div>
</div>

<div id="picker" class="hidden">
  <div class="picker-card">
    <div class="picker-head">
      <button id="pk-up">↑ 上一级</button>
      <span id="pk-dir"></span>
      <button id="pk-close">关闭</button>
    </div>
    <div id="pk-list" class="picker-list"></div>
    <div id="pk-foot" class="picker-foot hidden"><button id="pk-choose" class="primary">选择这个文件夹</button></div>
  </div>
</div>

<div id="newdlg" class="hidden">
  <div class="new-card">
    <div class="new-title">新建 LaTeX 文件</div>
    <div class="new-row">
      <span>目录</span>
      <input id="new-dir" spellcheck="false" placeholder="D:\papers">
      <button id="new-pickdir">选择…</button>
    </div>
    <div class="new-row">
      <span>文件名</span>
      <input id="new-name" spellcheck="false" value="untitled.tex">
    </div>
    <label class="new-check"><input type="checkbox" id="new-template" checked> 写入 ctexart 起始模板</label>
    <div id="new-error" class="new-error"></div>
    <div class="new-actions">
      <button id="new-cancel">取消</button>
      <button id="new-create" class="primary">创建</button>
    </div>
  </div>
</div>

<script>
const $ = (id) => document.getElementById(id);
const api = (p, opt) => fetch('/dsh-latex' + p, opt).then(async (r) => {
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { ok: false, error: t.slice(0, 300) }; }
});
const say = (msg) => { $('log').textContent = msg; };

let currentPdf = null;
let pollTimer = null;

// ---------------------------------------------------------------- 主题
const THEME_KEY = 'latex-studio-theme';
const THEME_VALUES = ['dark', 'light', 'system'];
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
let hostTheme = null;

function themeMode() {
  if (THEME_VALUES.indexOf(hostTheme) >= 0) return hostTheme;
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (THEME_VALUES.indexOf(v) >= 0) return v;
  } catch (e) {}
  return 'system';
}

function applyTheme() {
  const mode = themeMode();
  const dark = mode === 'dark' || (mode === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme').value = mode;
}

function saveTheme(mode) {
  hostTheme = mode;
  try { localStorage.setItem(THEME_KEY, mode); } catch (err) {}
  applyTheme();
  api('/api/prefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme: mode }) }).catch(function () {});
}

$('theme').onchange = (e) => saveTheme(e.target.value);

function onSchemeChange() { if (themeMode() === 'system') applyTheme(); }
if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSchemeChange);
else if (darkQuery.addListener) darkQuery.addListener(onSchemeChange);

applyTheme();

// ---------------------------------------------------------------- 左右分栏
const SPLIT_KEY = 'latex-studio-split';
const panes = $('panes');
const splitter = $('splitter');
let splitRatio = 0.52;

function setSplit(ratio) {
  splitRatio = Math.min(0.85, Math.max(0.15, Number(ratio) || 0.52));
  panes.style.setProperty('--left', (splitRatio * 100).toFixed(2) + '%');
  splitter.setAttribute('aria-valuenow', String(Math.round(splitRatio * 100)));
  return splitRatio;
}

function rememberSplit() {
  try { localStorage.setItem(SPLIT_KEY, String(splitRatio)); } catch (err) {}
  api('/api/prefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ split: splitRatio }) }).catch(function () {});
}

function moveSplit(clientX) {
  const rect = panes.getBoundingClientRect();
  if (!rect.width) return;
  setSplit((clientX - rect.left) / rect.width);
}

splitter.addEventListener('pointerdown', function (e) {
  if (e.button !== 0) return;
  e.preventDefault();
  if (splitter.setPointerCapture) splitter.setPointerCapture(e.pointerId);
  const onMove = function (ev) { moveSplit(ev.clientX); };
  const onUp = function (ev) {
    if (splitter.releasePointerCapture) { try { splitter.releasePointerCapture(ev.pointerId); } catch (err) {} }
    splitter.removeEventListener('pointermove', onMove);
    splitter.removeEventListener('pointerup', onUp);
    splitter.removeEventListener('pointercancel', onUp);
    rememberSplit();
  };
  splitter.addEventListener('pointermove', onMove);
  splitter.addEventListener('pointerup', onUp);
  splitter.addEventListener('pointercancel', onUp);
});

splitter.addEventListener('dblclick', function () { setSplit(0.52); rememberSplit(); });

splitter.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    setSplit(splitRatio + (e.key === 'ArrowRight' ? 0.02 : -0.02));
    rememberSplit();
  } else if (e.key === 'Home') {
    e.preventDefault();
    setSplit(0.52);
    rememberSplit();
  }
});

// 首屏偏好：localStorage 先顶上，再用 Host 的 prefs.json 对齐（端口每次启动都可能变）。
try {
  const cached = Number(localStorage.getItem(SPLIT_KEY));
  if (cached) setSplit(cached);
} catch (e) {}

api('/api/prefs').then(function (r) {
  if (!r) return;
  if (THEME_VALUES.indexOf(r.theme) >= 0) {
    hostTheme = r.theme;
    try { localStorage.setItem(THEME_KEY, r.theme); } catch (e) {}
    applyTheme();
  }
  if (typeof r.split === 'number') {
    setSplit(r.split);
    try { localStorage.setItem(SPLIT_KEY, String(r.split)); } catch (e) {}
  }
}).catch(function () {});

// ---------------------------------------------------------------- 拖入文件
let dragDepth = 0;
const dropMask = $('drop');
const hasFiles = (e) => !!e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;

function showDrop(on) {
  dropMask.classList.toggle('on', !!on);
  if (!on) dragDepth = 0;
}

async function saveDropped(name, content) {
  return api('/api/droptext', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: name, content: content }),
  });
}

async function acceptDropped(file) {
  if (!/\.(tex|bib|sty|cls)$/i.test(file.name)) {
    return say('只接 .tex / .bib / .sty / .cls，收到的是 ' + file.name);
  }
  const content = await file.text();
  const r = await saveDropped(file.name, content);
  if (r.error) return say('接收文件失败：' + r.error);

  if (!/\.tex$/i.test(file.name)) {
    return say('已接收 ' + file.name + ' → ' + r.path + '\n（只把 .tex 载入编辑区，其余文件按路径自己引用）');
  }

  $('path').value = r.path;
  $('editor').value = content;
  currentPdf = null;
  rightPdf();

  const rel = /\\(?:includegraphics|input|include|bibliography|bibliographystyle|graphicspath)\b/.test(content);
  say('已接收 ' + file.name + ' → ' + r.path + (rel ? '\n副本目录里没有 figures/ 等相对文件；要编译整篇文档，把「文件路径」改成原文件再点「打开」。' : ''));
}

// ---------------------------------------------------------------- 整目录拖入
// 浏览器拖单个文件只给内容、不给所在目录；拖「文件夹」才能拿到相对结构
// （webkitGetAsEntry），于是把整棵树按原样传上去，figures/ 才不会丢。
const MAX_TREE_FILES = 500;

function readTreeEntry(entry, prefix, out) {
  return new Promise(function (resolve, reject) {
    if (entry.isFile) {
      entry.file(function (file) { out.push({ file: file, rel: prefix + entry.name }); resolve(); }, reject);
      return;
    }
    if (!entry.isDirectory) { resolve(); return; }
    const reader = entry.createReader();
    const children = [];
    const next = function () {
      reader.readEntries(function (batch) {
        if (batch.length) {
          for (let i = 0; i < batch.length; i++) children.push(batch[i]);
          next();
          return;
        }
        let chain = Promise.resolve();
        children.forEach(function (child) {
          chain = chain.then(function () { return readTreeEntry(child, prefix + entry.name + '/', out); });
        });
        chain.then(resolve, reject);
      }, reject);
    };
    next();
  });
}

async function uploadTree(entries) {
  const files = [];
  for (let i = 0; i < entries.length; i++) await readTreeEntry(entries[i], '', files);
  if (!files.length) return say('这个文件夹是空的');
  if (files.length > MAX_TREE_FILES) return say('文件太多（' + files.length + ' 个，上限 ' + MAX_TREE_FILES + '），先只拖项目本身');

  const root = 'tree-' + Date.now().toString(36);
  const uploaded = {};
  let done = 0;
  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    done += 1;
    if (done % 5 === 1 || done === files.length) say('正在上传 ' + done + '/' + files.length + '：' + item.rel);
    const out = await api('/api/drop-file?root=' + encodeURIComponent(root) + '&path=' + encodeURIComponent(item.rel), {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: item.file,
    });
    if (!out.ok) return say('上传失败（' + item.rel + '）：' + (out.error || '未知错误'));
    uploaded[item.rel] = out.path;
  }

  const tex = files.filter(function (f) { return /\.tex$/i.test(f.rel); });
  if (!tex.length) return say('已上传 ' + files.length + ' 个文件，但里面没有 .tex');
  const shallow = tex.filter(function (f) { return f.rel.split('/').length <= 2; });
  const main = tex.length === 1 ? tex[0] : (shallow[0] || tex[0]);
  $('path').value = uploaded[main.rel];
  $('editor').value = await main.file.text();
  currentPdf = null;
  rightPdf();
  say('已上传整个文件夹（' + files.length + ' 个文件）→ ' + uploaded[main.rel] +
    (tex.length > 1 ? '\n里面有 ' + tex.length + ' 个 .tex，默认打开 ' + main.rel + '，可在路径框里换。' : '') +
    '\nfigures/ 等相对文件一起带过来了，可以直接编译。');
}

window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth += 1;
  showDrop(true);
});

window.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  dragDepth -= 1;
  if (dragDepth <= 0) showDrop(false);
});

window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  showDrop(false);
  const dt = e.dataTransfer;

  // DataTransferItemList 只在 drop 事件同步阶段有效，必须先把 entry 全取出来。
  const entries = [];
  if (dt.items && dt.items.length) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind !== 'file' || !item.webkitGetAsEntry) continue;
      const entry = item.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
  }
  if (entries.some(function (en) { return en.isDirectory; })) {
    uploadTree(entries);
    return;
  }
  const file = dt.files && dt.files[0];
  if (file) acceptDropped(file);
});

// ---------------------------------------------------------------- 公式面板
// 参考 dsh-latex-formula-editor 的交互（符号/模板/预览），但预览走本地引擎编译，
// 不引入 MathJax；点击符号把 LaTeX 插到编辑区光标处。
const FX_SYMBOLS = [
  ['常用', [
    ['±', '\\pm'], ['∓', '\\mp'], ['×', '\\times'], ['÷', '\\div'], ['·', '\\cdot'],
    ['≤', '\\leq'], ['≥', '\\geq'], ['≠', '\\neq'], ['≈', '\\approx'], ['≡', '\\equiv'],
    ['∝', '\\propto'], ['∞', '\\infty'], ['∂', '\\partial'], ['∇', '\\nabla'], ['∅', '\\varnothing'],
  ]],
  ['希腊字母', [
    ['α', '\\alpha'], ['β', '\\beta'], ['γ', '\\gamma'], ['δ', '\\delta'], ['ε', '\\varepsilon'],
    ['ζ', '\\zeta'], ['η', '\\eta'], ['θ', '\\theta'], ['κ', '\\kappa'], ['λ', '\\lambda'],
    ['μ', '\\mu'], ['ν', '\\nu'], ['ξ', '\\xi'], ['π', '\\pi'], ['ρ', '\\rho'],
    ['σ', '\\sigma'], ['τ', '\\tau'], ['φ', '\\varphi'], ['χ', '\\chi'], ['ψ', '\\psi'], ['ω', '\\omega'],
    ['Γ', '\\Gamma'], ['Δ', '\\Delta'], ['Θ', '\\Theta'], ['Λ', '\\Lambda'], ['Π', '\\Pi'],
    ['Σ', '\\Sigma'], ['Φ', '\\Phi'], ['Ψ', '\\Psi'], ['Ω', '\\Omega'],
  ]],
  ['分数/根式', [
    ['a/b', '\\frac{a}{b}'], ['aᵇ', 'a^{b}'], ['a_b', 'a_{b}'], ['√', '\\sqrt{x}'],
    ['ⁿ√', '\\sqrt[n]{x}'], ['x̄', '\\overline{x}'], ['x̲', '\\underline{x}'],
    ['x⃗', '\\vec{x}'], ['x̂', '\\hat{x}'], ['x̃', '\\tilde{x}'],
  ]],
  ['关系', [
    ['∈', '\\in'], ['∉', '\\notin'], ['⊂', '\\subset'], ['⊆', '\\subseteq'], ['⊃', '\\supset'],
    ['∪', '\\cup'], ['∩', '\\cap'], ['∖', '\\setminus'], ['∀', '\\forall'], ['∃', '\\exists'],
    ['∴', '\\therefore'], ['∵', '\\because'], ['∣', '\\mid'], ['∥', '\\parallel'], ['⊥', '\\perp'],
  ]],
  ['箭头', [
    ['→', '\\to'], ['←', '\\leftarrow'], ['↔', '\\leftrightarrow'], ['⇒', '\\Rightarrow'],
    ['⇐', '\\Leftarrow'], ['⇔', '\\Leftrightarrow'], ['↦', '\\mapsto'], ['↑', '\\uparrow'],
    ['↓', '\\downarrow'], ['⟶', '\\longrightarrow'], ['⟹', '\\Longrightarrow'],
  ]],
  ['大型运算', [
    ['∑', '\\sum_{i=1}^{n}'], ['∏', '\\prod_{i=1}^{n}'], ['∫', '\\int_{a}^{b}'], ['∬', '\\iint'],
    ['∭', '\\iiint'], ['∮', '\\oint'], ['⋃', '\\bigcup_{i=1}^{n}'], ['⋂', '\\bigcap_{i=1}^{n}'],
    ['lim', '\\lim_{x \\to 0}'], ['max', '\\max'], ['min', '\\min'],
  ]],
  ['括号', [
    ['( )', '\\left( x \\right)'], ['[ ]', '\\left[ x \\right]'], ['{ }', '\\left\\{ x \\right\\}'],
    ['⟨ ⟩', '\\langle x \\rangle'], ['⌊ ⌋', '\\lfloor x \\rfloor'], ['⌈ ⌉', '\\lceil x \\rceil'],
    ['| |', '\\left| x \\right|'], ['‖ ‖', '\\left\\| x \\right\\|'],
  ]],
  ['函数', [
    ['sin', '\\sin'], ['cos', '\\cos'], ['tan', '\\tan'], ['cot', '\\cot'], ['log', '\\log'],
    ['ln', '\\ln'], ['exp', '\\exp'], ['det', '\\det'], ['gcd', '\\gcd'], ['mod', '\\bmod'],
  ]],
  ['微积分', [
    ['dy/dx', '\\frac{\\mathrm{d}y}{\\mathrm{d}x}'], ['f′(x)', "f'(x)"],
    ['∫f', '\\int f(x)\\,\\mathrm{d}x'], ['∑', '\\sum_{k=0}^{n} a_k'], ['Δx', '\\Delta x'],
    ['∂f/∂x', '\\frac{\\partial f}{\\partial x}'],
  ]],
  ['矩阵/数组', [
    ['matrix', '\\begin{matrix} a & b \\\\ c & d \\end{matrix}'],
    ['pmatrix', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'],
    ['bmatrix', '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}'],
    ['vmatrix', '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}'],
    ['cases', '\\begin{cases} a & x > 0 \\\\ b & x \\leq 0 \\end{cases}'],
    ['⋯', '\\cdots'], ['⋮', '\\vdots'], ['⋱', '\\ddots'],
  ]],
]

const FX_TEMPLATES = [
  ['代数', [
    ['二次方程', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'],
    ['完全平方', '(a+b)^2 = a^2 + 2ab + b^2'],
    ['平方差', 'a^2 - b^2 = (a-b)(a+b)'],
    ['二项式', '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k'],
  ]],
  ['几何', [
    ['圆', '(x-a)^2 + (y-b)^2 = r^2'],
    ['三角形面积', 'S = \\frac{1}{2}ab\\sin C'],
    ['两点距离', 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}'],
  ]],
  ['不等式', [
    ['三角不等式', '|a+b| \\leq |a| + |b|'],
    ['均值不等式', '\\frac{a+b}{2} \\geq \\sqrt{ab}'],
    ['柯西不等式', '\\left(\\sum_{i=1}^{n} a_i b_i\\right)^2 \\leq \\left(\\sum_{i=1}^{n} a_i^2\\right)\\left(\\sum_{i=1}^{n} b_i^2\\right)'],
  ]],
  ['微积分', [
    ['定积分', '\\int_{a}^{b} f(x)\\,\\mathrm{d}x'],
    ['导数定义', '\\frac{\\mathrm{d}y}{\\mathrm{d}x} = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}'],
    ['重要极限', '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1'],
    ['泰勒展开', 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n'],
  ]],
  ['线性代数', [
    ['2×2 矩阵', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'],
    ['行列式', '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc'],
    ['方程组', '\\begin{cases} a_{11}x_1 + a_{12}x_2 = b_1 \\\\ a_{21}x_1 + a_{22}x_2 = b_2 \\end{cases}'],
    ['对齐推导', '\\begin{aligned} a &= b + c \\\\ &= d \\end{aligned}'],
  ]],
  ['统计', [
    ['均值', '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i'],
    ['方差', '\\sigma^2 = \\frac{1}{n}\\sum_{i=1}^{n}(x_i - \\bar{x})^2'],
    ['正态分布', 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}'],
  ]],
  ['数列', [
    ['等差数列', 'a_n = a_1 + (n-1)d'],
    ['等比数列', 'a_n = a_1 q^{n-1}'],
    ['前 n 项和', 'S_n = \\frac{n(a_1 + a_n)}{2}'],
  ]],
  ['物理', [
    ['牛顿第二定律', 'F = ma'],
    ['万有引力', 'F = G\\frac{m_1 m_2}{r^2}'],
    ['质能方程', 'E = mc^2'],
    ['麦克斯韦方程', '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}'],
  ]],
  ['逻辑', [
    ['蕴含', 'P \\Rightarrow Q'],
    ['等价', 'P \\Leftrightarrow Q'],
    ['量词', '\\forall x \\in A,\\ \\exists y \\in B'],
  ]],
]

const FX_TOP_ENV = /^\s*\\begin\{(align\*?|equation\*?|gather\*?|multline\*?|flalign\*?|eqnarray\*?|displaymath)\}/
let fxSymCat = 0
let fxTplCat = 0
let fxMounted = false
let fxTimer = null
let fxSeq = 0

function fxInsert(tex, inline) {
  const el = $('editor')
  const start = el.selectionStart === null ? el.value.length : el.selectionStart
  const end = el.selectionEnd === null ? start : el.selectionEnd
  let snippet
  if (inline) snippet = $('fx-wrap').checked ? '$' + tex + '$' : tex
  else snippet = FX_TOP_ENV.test(tex) ? tex : '\\[\n' + tex + '\n\\]'
  el.value = el.value.slice(0, start) + snippet + el.value.slice(end)
  const hole = snippet.indexOf('{}')
  const caret = hole >= 0 ? start + hole + 1 : start + snippet.length
  el.selectionStart = el.selectionEnd = caret
  el.focus()
}

function fxRenderSymbols() {
  const host = $('fx-symbols')
  host.textContent = ''
  const cats = document.createElement('div')
  cats.className = 'fx-cats'
  FX_SYMBOLS.forEach(function (group, idx) {
    const b = document.createElement('button')
    b.textContent = group[0]
    b.className = idx === fxSymCat ? 'on' : ''
    b.onclick = function () { fxSymCat = idx; fxRenderSymbols() }
    cats.appendChild(b)
  })
  const tiles = document.createElement('div')
  tiles.className = 'fx-tiles'
  FX_SYMBOLS[fxSymCat][1].forEach(function (pair) {
    const b = document.createElement('button')
    b.className = 'fx-tile' + (pair[0].length > 2 ? ' wide' : '')
    b.textContent = pair[0]
    b.title = pair[1]
    b.onclick = function () { fxInsert(pair[1], true) }
    tiles.appendChild(b)
  })
  host.appendChild(cats)
  host.appendChild(tiles)
}

function fxRenderTemplates() {
  const host = $('fx-templates')
  host.textContent = ''
  const cats = document.createElement('div')
  cats.className = 'fx-cats'
  FX_TEMPLATES.forEach(function (group, idx) {
    const b = document.createElement('button')
    b.textContent = group[0]
    b.className = idx === fxTplCat ? 'on' : ''
    b.onclick = function () { fxTplCat = idx; fxRenderTemplates() }
    cats.appendChild(b)
  })
  const tiles = document.createElement('div')
  tiles.className = 'fx-tiles'
  FX_TEMPLATES[fxTplCat][1].forEach(function (item) {
    const b = document.createElement('button')
    b.className = 'fx-tile wide'
    b.textContent = item[0]
    b.title = item[1]
    b.onclick = function () { fxInsert(item[1], false) }
    tiles.appendChild(b)
  })
  host.appendChild(cats)
  host.appendChild(tiles)
}

function fxShowTab(name) {
  ;[['symbols', 'fx-symbols'], ['templates', 'fx-templates'], ['preview', 'fx-preview']].forEach(function (pair) {
    $(pair[1]).classList.toggle('hidden', pair[0] !== name)
    $('fx-tab-' + pair[0]).classList.toggle('on', pair[0] === name)
  })
}

$('fx-toggle').onclick = function () {
  const panel = $('fx')
  panel.classList.toggle('hidden')
  if (!panel.classList.contains('hidden') && !fxMounted) {
    fxMounted = true
    fxRenderSymbols()
    fxRenderTemplates()
  }
}
$('fx-close').onclick = function () { $('fx').classList.add('hidden') }
$('fx-tab-symbols').onclick = function () { fxShowTab('symbols') }
$('fx-tab-templates').onclick = function () { fxShowTab('templates') }
$('fx-tab-preview').onclick = function () { fxShowTab('preview') }

function fxSchedulePreview() {
  if (fxTimer) clearTimeout(fxTimer)
  const tex = $('fx-input').value.trim()
  if (!tex) {
    $('fx-status').textContent = ''
    $('fx-preview-img').removeAttribute('src')
    return
  }
  $('fx-status').textContent = '等待编译…'
  fxTimer = setTimeout(fxRunPreview, 700)
}

async function fxRunPreview() {
  const tex = $('fx-input').value.trim()
  if (!tex) return
  const seq = ++fxSeq
  $('fx-status').textContent = '编译中…'
  const r = await api('/api/formula', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tex: tex }),
  })
  if (seq !== fxSeq) return
  if (!r.ok) {
    $('fx-status').textContent = String(r.error || '编译失败').split('\n').slice(-2).join(' ')
    $('fx-preview-img').removeAttribute('src')
    $('fx-download').removeAttribute('href')
    return
  }
  $('fx-status').textContent = ''
  $('fx-preview-img').src = r.url + '&t=' + Date.now()
  $('fx-download').href = r.url
  $('fx-download').setAttribute('download', 'formula.png')
}

$('fx-input').addEventListener('input', fxSchedulePreview)
$('fx-input').addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    const tex = $('fx-input').value.trim()
    if (tex) fxInsert(tex, false)
  }
})
$('fx-insert').onclick = function () {
  const tex = $('fx-input').value.trim()
  if (tex) fxInsert(tex, false)
}

// ---------------------------------------------------------------- 引擎状态
function setStatus(st) {
  const b = $('status');
  if (st.installed) {
    b.textContent = '引擎就绪 ' + (st.version || '');
    b.className = 'badge ok';
    $('install').classList.add('hidden');
  } else if (st.installing) {
    b.textContent = '正在装：' + st.phase;
    b.className = 'badge';
    $('install').classList.add('hidden');
    startPoll();
  } else {
    b.textContent = '未安装引擎';
    b.className = 'badge err';
    $('install').classList.remove('hidden');
  }
}

async function refresh() {
  const st = await api('/api/status');
  setStatus(st);
  if (st.log && st.log.length) say(st.log.join('\n'));
  rightPdf();
  return st;
}

function rightPdf() {
  const f = $('pdf');
  if (currentPdf) { f.src = '/dsh-latex/api/pdf?name=' + encodeURIComponent(currentPdf); f.classList.remove('hidden'); $('empty').classList.add('hidden'); }
  else { $('empty').classList.remove('hidden'); f.classList.add('hidden'); }
}

function startPoll() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const st = await api('/api/status');
    setStatus(st);
    if (st.log && st.log.length) say(st.log.join('\n'));
    if (!st.installing) { clearInterval(pollTimer); pollTimer = null; refresh(); }
  }, 2000);
}

$('install').onclick = async () => {
  $('install').disabled = true;
  const r = await api('/api/install', { method: 'POST' });
  $('install').disabled = false;
  if (!r.started) say(r.error || '已经在装了');
  setStatus({ installing: true, phase: 'starting' });
  startPoll();
};

$('open').onclick = async () => {
  const p = $('path').value.trim();
  if (!p) return say('先填文件路径');
  const r = await api('/api/file?path=' + encodeURIComponent(p));
  if (r.error) return say('打开失败：' + r.error);
  $('editor').value = r.content;
  say('已打开 ' + p + '（' + r.content.length + ' 字符）');
};

$('more-toggle').onclick = function () { $('more').classList.toggle('hidden') };

// 重置：清空页面状态，顺便删掉插件缓存的副本（drop/ 下），原文件不动。
$('reset').onclick = async function () {
  const p = $('path').value.trim();
  const extra = p ? '，并删除插件缓存的副本（drop/ 下的那一份，如果有）' : '';
  if (!confirm('重置：清空编辑区、预览和路径' + extra + '。\n\n不会删除你的原文件。继续？')) return;
  let removed = false;
  if (p) {
    const r = await api('/api/reset-cache', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p }),
    });
    if (r.error) return say('恢复默认失败：' + r.error);
    removed = !!r.removed;
  }
  $('path').value = '';
  $('editor').value = '';
  currentPdf = null;
  rightPdf();
  $('download').classList.add('hidden');
  say(removed ? '已重置，缓存副本已删除（原文件未动）。' : '已重置（当前不是插件缓存，没有删除任何文件）。');
};

// ---------------------------------------------------------------- 浏览文件
const pickerEl = $('picker');
let pickerParent = null;
let pickerDir = '';
let pickerMode = 'file';

async function browse(dir) {
  const r = await api('/api/list' + (dir ? '?dir=' + encodeURIComponent(dir) : ''));
  if (r.error) return say('列目录失败：' + r.error);
  pickerParent = r.parent;
  pickerDir = r.dir || '';
  $('pk-dir').textContent = r.dir || '这台电脑';
  $('pk-up').disabled = !r.parent;
  $('pk-foot').classList.toggle('hidden', pickerMode !== 'dir');
  const list = $('pk-list');
  list.textContent = '';
  const entries = pickerMode === 'dir' ? r.entries.filter(function (e) { return e.kind === 'dir'; }) : r.entries;
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'pk-empty';
    empty.textContent = pickerMode === 'dir' ? '这个目录下没有子目录' : '这个目录里没有子目录和 .tex 文件';
    list.appendChild(empty);
  } else {
    entries.forEach(function (entry) {
      const row = document.createElement('div');
      row.className = 'pk-row';
      row.textContent = (entry.kind === 'dir' ? '📁 ' : '📄 ') + entry.name;
      row.onclick = function () {
        if (entry.kind === 'dir') { browse(entry.path); return; }
        pickerEl.classList.add('hidden');
        $('path').value = entry.path;
        $('open').click();
      };
      list.appendChild(row);
    });
  }
  pickerEl.classList.remove('hidden');
}

function openPicker(mode, start) {
  pickerMode = mode === 'dir' ? 'dir' : 'file';
  $('pk-foot').classList.toggle('hidden', pickerMode !== 'dir');
  browse(start || '');
}

$('browse').onclick = function () { openPicker('file', ''); };
$('pk-up').onclick = function () { if (pickerParent) browse(pickerParent); };
$('pk-close').onclick = function () { pickerEl.classList.add('hidden'); };
$('pk-choose').onclick = function () {
  if (pickerMode !== 'dir') return;
  $('new-dir').value = pickerDir;
  pickerEl.classList.add('hidden');
};
pickerEl.addEventListener('click', function (e) { if (e.target === pickerEl) pickerEl.classList.add('hidden'); });

// ---------------------------------------------------------------- 新建文件
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
].join('\n');

function newDialogDir() {
  const p = $('path').value.trim();
  if (p) {
    const cut = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    if (cut > 0) return p.slice(0, cut);
  }
  try { return localStorage.getItem('latex-studio-newdir') || ''; } catch (e) { return ''; }
}

$('newfile').onclick = function () {
  $('new-dir').value = newDialogDir();
  $('new-name').value = 'untitled.tex';
  $('new-error').textContent = '';
  $('newdlg').classList.remove('hidden');
  $('new-name').focus();
};

$('new-cancel').onclick = function () { $('newdlg').classList.add('hidden'); };
$('new-pickdir').onclick = function () { openPicker('dir', $('new-dir').value.trim()); };

$('new-create').onclick = async function () {
  const dir = $('new-dir').value.trim().replace(/[\\/]+$/, '');
  let name = $('new-name').value.trim();
  if (!dir) { $('new-error').textContent = '先选一个目录'; return; }
  if (!name) { $('new-error').textContent = '先填文件名'; return; }
  if (/[\\/:*?"<>|]/.test(name)) { $('new-error').textContent = '文件名不能包含 \\ / : * ? " < > |'; return; }
  if (!/\.tex$/i.test(name)) name = name + '.tex';
  const full = dir + '\\' + name;
  const content = $('new-template').checked ? NEW_TEMPLATE : '';
  $('new-create').disabled = true;
  const r = await api('/api/new', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: full, content: content }),
  });
  $('new-create').disabled = false;
  if (r.error) { $('new-error').textContent = r.error; return; }
  try { localStorage.setItem('latex-studio-newdir', dir); } catch (e) {}
  $('newdlg').classList.add('hidden');
  $('path').value = r.path;
  $('editor').value = content;
  currentPdf = null;
  rightPdf();
  say('已新建 ' + r.path);
};

$('newdlg').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target && e.target.id !== 'new-cancel') {
    e.preventDefault();
    $('new-create').onclick();
  } else if (e.key === 'Escape') {
    $('newdlg').classList.add('hidden');
  }
});
$('newdlg').addEventListener('click', function (e) { if (e.target === $('newdlg')) $('newdlg').classList.add('hidden'); });

$('save').onclick = async () => {
  const p = $('path').value.trim();
  if (!p) return say('先填文件路径');
  const r = await api('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p, content: $('editor').value }) });
  say(r.error ? '保存失败：' + r.error : '已保存 ' + p + '（' + r.bytes + ' 字节）');
};

$('download').onclick = function () {
  if (!currentPdf) return;
  window.location.href = '/dsh-latex/api/pdf?name=' + encodeURIComponent(currentPdf) + '&download=1';
};

$('compile').onclick = async () => {
  const p = $('path').value.trim();
  if (!p) return say('先填文件路径');
  $('compile').disabled = true;
  say('编译中…');
  const r = await api('/api/compile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p, engine: $('engine').value }) });
  $('compile').disabled = false;
  if (r.error) return say('编译失败：' + r.error);
  currentPdf = r.ok ? r.pdfName : null;
  rightPdf();
  if (currentPdf) $('download').classList.remove('hidden'); else $('download').classList.add('hidden');
  const bib = r.bibtex ? (r.bibtex.ok ? '，bibtex ✓' : '，bibtex ✗') : '';
  say((r.ok ? '✓ 编译成功（' : '✗ 编译失败（') + r.engine + '，' + r.passes + ' 遍' + bib + '，' + r.ms + 'ms）\n\n' + (r.log || '').split('\n').slice(-25).join('\n'));
};

$('editor').addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const el = e.target, s = el.selectionStart, t = el.selectionEnd;
  el.value = el.value.slice(0, s) + '  ' + el.value.slice(t);
  el.selectionStart = el.selectionEnd = s + 2;
});

refresh();
</script>
</body>
</html>`
