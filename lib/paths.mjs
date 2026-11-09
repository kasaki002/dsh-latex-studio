// 路径与常量：TeX 引擎、编译产物、界面偏好都放在 D:\windows\AAA My program\latex-studio。
// 想换地方就设 DSH_LATEX_HOME 环境变量，不用改代码。
import os from 'node:os'
import path from 'node:path'

export const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

// 引擎 + 产物约 1.5 GB，默认放 D 盘；整体搬迁只需要设 DSH_LATEX_HOME。
export const DEFAULT_ROOT = 'D:\\windows\\AAA My program\\latex-studio'
export const ROOT = process.env.DSH_LATEX_HOME || DEFAULT_ROOT
export const TEX_DIR = path.join(ROOT, 'tex')
export const REPO_DIR = path.join(ROOT, 'repo')
export const SETUP_DIR = path.join(ROOT, 'setup')
export const OUT_DIR = path.join(ROOT, 'out')

// 界面偏好（目前只有「是否启用会话视图」），和按会话的 state.json 分开放，
// 免得多会话草稿的清理逻辑把全局开关一起删掉。
export const PREFS_FILE = path.join(ROOT, 'prefs.json')

// 国内镜像优先：GitHub 直连实测 16 KB/s，TUNA 这边 3.6 MB/s。
export const MIRRORS = [
  'https://mirrors.tuna.tsinghua.edu.cn/CTAN/systems/win32/miktex',
  'https://mirrors.ustc.edu.cn/CTAN/systems/win32/miktex',
  'https://mirrors.aliyun.com/CTAN/systems/win32/miktex',
]
export const REMOTE_REPOS = MIRRORS.map((m) => `${m}/tm/packages/`)
export const SETUP_ZIP = `${MIRRORS[0]}/setup/windows-x64/miktexsetup-5.5.0%2B1763023-x64.zip`
export const SETUP_EXE = 'miktexsetup_standalone.exe'
