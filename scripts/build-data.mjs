/**
 * Excel 转换出的 JSON → public/data/ 压缩版
 *
 * 用法：
 *   1. 把 Excel 重新导出的原始 JSON 放到项目根目录 data-source/ 下
 *      （文件名保持不变：data.json / dataLPA.json / pack客户表现.json / 周度工作计划.json）
 *   2. 执行 `npm run data`
 *   3. 压缩产物自动写入 public/data/，业务代码无需改动
 *
 * 压缩策略：
 *   - 样式去重：单元格完整 style 抽到 sheet.styles[]，cell 只保留 styleId 索引
 *   - 弃用字段剥离（默认开启）：styles / rowHeights / columnWidths / styleId
 *     解析层（utils/parse*.js）只读 cells[*].value，这些字段不影响页面；
 *     实测「仅样式/行高变化」的重新导出会让 JSON 膨胀 3%~13%，剥离后可避免。
 *     需要保留时用 `KEEP_STYLES=1 npm run data`
 *   - 去空字段：值为 null/undefined/空数组的键删除
 *   - 紧凑输出：无缩进、无换行
 *   - 自动处理 data-source/ 下全部 *.json（无需维护文件清单）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'data-source')
const DST_DIR = path.join(ROOT, 'public', 'data')

const KEEP_STYLES = process.env.KEEP_STYLES === '1'

if (!fs.existsSync(SRC_DIR)) fs.mkdirSync(SRC_DIR, { recursive: true })
if (!fs.existsSync(DST_DIR)) fs.mkdirSync(DST_DIR, { recursive: true })

// 自动枚举数据源文件（替代手工清单，新 JSON 放进来即生效）
const FILES = fs.existsSync(SRC_DIR)
  ? fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.json')).sort()
  : []

function compressSheet(sheet) {
  const styleMap = new Map()
  const styles = []
  const styleIdOf = (style) => {
    if (!style) return -1
    const key = JSON.stringify(style)
    if (styleMap.has(key)) return styleMap.get(key)
    const id = styles.length
    styles.push(style)
    styleMap.set(key, id)
    return id
  }

  const cells = sheet.cells || {}
  const newCells = {}
  for (const [ref, cell] of Object.entries(cells)) {
    if (!cell) continue
    const c = { ...cell }
    if (c.style) {
      c.styleId = styleIdOf(c.style)
      delete c.style
    }
    // 删空字段
    for (const k of Object.keys(c)) {
      const v = c[k]
      if (v == null || (Array.isArray(v) && v.length === 0) || v === '') {
        delete c[k]
      }
    }
    newCells[ref] = c
  }

  const out = { ...sheet, cells: newCells }
  if (KEEP_STYLES) {
    out.styles = styles
  } else {
    // 剥离解析层用不到的格式字段（styles/styleId/行高列宽）
    for (const [ref, c] of Object.entries(newCells)) delete c.styleId
    delete out.styles
    delete out.rowHeights
    delete out.columnWidths
  }
  return out
}

let totalOrig = 0, totalNew = 0
for (const name of FILES) {
  const src = path.join(SRC_DIR, name)
  const dst = path.join(DST_DIR, name)
  if (!fs.existsSync(src)) {
    console.log(`  跳过 ${name}（data-source/${name} 不存在）`)
    continue
  }
  const raw = fs.readFileSync(src, 'utf-8')
  const origSize = Buffer.byteLength(raw, 'utf-8')
  totalOrig += origSize
  const json = JSON.parse(raw)

  if (Array.isArray(json.sheets)) {
    json.sheets = json.sheets.map(compressSheet)
  }
  json.generatedAt = new Date().toISOString()
  json.totalImages = json.sheets?.reduce((n, s) => n + (s.images?.length || 0), 0) || 0

  const out = JSON.stringify(json)
  fs.writeFileSync(dst, out)
  const newSize = Buffer.byteLength(out, 'utf-8')
  totalNew += newSize
  const ratio = ((newSize / origSize) * 100).toFixed(1)
  console.log(`  ✓ ${name}  ${(origSize/1024/1024).toFixed(2)}MB → ${(newSize/1024/1024).toFixed(2)}MB (${ratio}%)`)
}
console.log(`\n合计：${(totalOrig/1024/1024).toFixed(2)}MB → ${(totalNew/1024/1024).toFixed(2)}MB，压缩产物写入 public/data/`)
