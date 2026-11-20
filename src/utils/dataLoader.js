/**
 * 数据异步加载器：public/data/*.json
 *
 * 1. 不再静态 import JSON，避免 24MB 数据被打进主 chunk；
 * 2. 自带内存缓存 + 并发去重，同一文件多次调用只发一次请求；
 * 3. 自动对 sheets 做 indexSheet（与原 getDataFromJson 行为一致）；
 * 4. 自动兼容压缩版 JSON（styleId → 完整 style 回填）；
 * 5. 路径基于 import.meta.env.BASE_URL，部署到子目录也不会 404。
 */
import { indexSheet } from './getDataFromJson.js'

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
const DATA_BASE = `${BASE}/data`

// 文件名 → 别名（给业务代码用短名）
const FILE_MAP = {
  main: 'data.json',
  data: 'data.json',
  lpa: 'dataLPA.json',
  pack: 'pack客户表现.json',
  plan: '周度工作计划.json',
  think: '周度思考.json',
  question: '重大质量异常闭环.json',
  cpk: '过程能力达标率.json',
}

// 整包 JSON 缓存（未 index 的原始结构）
const rawCache = new Map()
// indexSheet 之后的 sheet 缓存：key = `${fileName}#${sheetIndex}`
const sheetCache = new Map()
// 正在进行中的 fetch Promise（并发去重）
const pending = new Map()

function resolveFileName(name) {
  if (!name) return 'data.json'
  if (name.endsWith('.json')) return name
  return FILE_MAP[name] || name
}

/**
 * 拉取并返回整份原始 JSON（含 sheets 数组）
 * @param {string} [name='main'] 别名或文件名
 * @returns {Promise<Object>}
 */
export function loadData(name = 'main') {
  const file = resolveFileName(name)
  if (rawCache.has(file)) return Promise.resolve(rawCache.get(file))
  if (pending.has(file)) return pending.get(file)

  const url = `${DATA_BASE}/${encodeURIComponent(file)}`
  const p = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`[dataLoader] 加载失败 ${res.status}: ${url}`)
      const json = await res.json()
      // 兼容压缩版：把 styleId 还原为完整 style 挂到 cell 上（不破坏原工具函数）
      hydrateStyles(json)
      rawCache.set(file, json)
      pending.delete(file)
      return json
    })
    .catch((err) => {
      pending.delete(file)
      console.error(err)
      throw err
    })
  pending.set(file, p)
  return p
}

/**
 * 加载并 index 单个 sheet
 * @param {string} [name='main'] 数据别名
 * @param {number} [sheetIndex=0] sheet 下标
 * @returns {Promise<Object>} indexSheet 之后的 sheet
 */
export async function loadSheet(name = 'main', sheetIndex = 0) {
  const key = `${resolveFileName(name)}#${sheetIndex}`
  if (sheetCache.has(key)) return sheetCache.get(key)

  const json = await loadData(name)
  const raw = json.sheets?.[sheetIndex]
  if (!raw) throw new Error(`[dataLoader] ${name} 没有 sheet[${sheetIndex}]`)
  const sheet = indexSheet(raw)
  sheetCache.set(key, sheet)
  return sheet
}

/**
 * 预加载常用数据（首屏空闲时调用，不阻塞渲染）
 */
export function preloadAll() {
  return Promise.allSettled([
    loadData('main'),
    loadData('lpa'),
    loadData('pack'),
    loadData('plan'),
  ])
}

/**
 * 把压缩版 JSON 的 styleId 还原回 cell.style
 * （压缩时每个单元格的完整 style 被抽到 sheet.styles[] 数组，
 *  cell 只保留 styleId 索引；这里反向还原，保证下游 getDataFromJson
 *  中 cell.style.xxx / 富文本渲染 等仍能正常取值）
 */
function hydrateStyles(json) {
  if (!json || !Array.isArray(json.sheets)) return
  for (const sheet of json.sheets) {
    const styles = Array.isArray(sheet.styles) ? sheet.styles : null
    if (!styles) continue
    const cells = sheet.cells
    if (!cells) continue
    for (const ref in cells) {
      const cell = cells[ref]
      if (cell && typeof cell.styleId === 'number') {
        cell.style = styles[cell.styleId] || cell.style || null
      }
    }
  }
}
