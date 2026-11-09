// 路径与常量：TeX 引擎、编译产物、界面偏好都放在 ~/.dsh/latex-studio。
// 想换地方就设 DSH_LATEX_HOME 环境变量，不用改代码。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

// 引擎 + 产物约 1.5 GB。默认放 ~/.dsh/latex-studio，换了机器也能直接用；
// 老位置（开发机的 D 盘）如果还在就继续用，免得把已经装好的引擎再下一遍。
// 想放别处设 DSH_LATEX_HOME 就行。
const LEGACY_ROOT = 'D:\\windows\\AAA My program\\latex-studio'
export const DEFAULT_ROOT = fs.existsSync(LEGACY_ROOT) ? LEGACY_ROOT : path.join(DSH_HOME, 'latex-studio')
export const ROOT = process.env.DSH_LATEX_HOME || DEFAULT_ROOT
export const TEX_DIR = path.join(ROOT, 'tex')
export const REPO_DIR = path.join(ROOT, 'repo')
export const SETUP_DIR = path.join(ROOT, 'setup')
export const OUT_DIR = path.join(ROOT, 'out')

// 界面偏好（目前只有「是否启用会话视图」），和按会话的 state.json 分开放，
// 免得多会话草稿的清理逻辑把全局开关一起删掉。
export const PREFS_FILE = path.join(ROOT, 'prefs.json')

// 引擎探测结果缓存：第一次扫描后把路径和版本写下来，之后启动直接读，
// 不用每次进页面都去递归扫 texmfs、跑一遍 --version（安装完会主动清掉它）。
export const ENGINES_FILE = path.join(ROOT, 'engines.json')

// 国内镜像优先：GitHub 直连实测 16 KB/s，TUNA 这边 3.6 MB/s。
export const MIRRORS = [
  'https://mirrors.tuna.tsinghua.edu.cn/CTAN/systems/win32/miktex',
  'https://mirrors.ustc.edu.cn/CTAN/systems/win32/miktex',
  'https://mirrors.aliyun.com/CTAN/systems/win32/miktex',
]
export const REMOTE_REPOS = MIRRORS.map((m) => `${m}/tm/packages/`)
export const SETUP_ZIP = `${MIRRORS[0]}/setup/windows-x64/miktexsetup-5.5.0%2B1763023-x64.zip`
export const SETUP_EXE = 'miktexsetup_standalone.exe'
