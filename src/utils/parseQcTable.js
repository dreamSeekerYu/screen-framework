/**
 * ============================================================
 * 从 qc人力.json 还原 Excel 原始表格（详情弹窗用）
 * ============================================================
 * 设计目标：不写死行 / 列，Excel 动态增减行列后依然能正确还原。
 *
 * 还原范围（与弹窗主题样式配合）：
 *   - 只还原「文本内容 + 字体颜色 + 加粗 + 对齐/换行」；
 *   - 不还原 Excel 填充色 / 边框 / 字号，表头与合计行使用主题样式，
 *     保证 light-business / light-cyan / dark-blue / gov-red 四套主题下均可读；
 *   - 防不可见保护：白 / 浅色字体（如 Excel 表头白字）在浅色主题下不可见，
 *     自动丢弃，回落到主题正文色。
 *
 * 数据来源约定（来自 Excel→JSON 转换工具产物）：
 *   - cells: { 'B2': { value, richText, styleId, style, merged, isMergeMain, mergedMain... } }
 *   - merges: [{ from: {row, col}, rowspan, colspan, rowspanEff, colspanEff }]
 *   - styles: [{ font:{size,bold,color}, fill, align:{h,v,wrapText} }]
 *
 * 区域识别规则（与源表结构解耦，仅依赖「左上角纵向合并」这一个锚点）：
 *   1. 左上角（最小列）存在 rowspan>1 的合并单元格 → 作为弹窗标题，
 *      标题右侧的列即数据列；标题起始行即表头行；
 *   2. 未找到该锚点时，退化为「第 1 行为表头、第 1 列起为数据」；
 *   3. 行列范围取 cells 实际出现的最大行列，Excel 增删行列后自然适配；
 *   4. 表头行 / 数据行中完全没有 cell 的列 / 行自动跳过（删列 / 删行兼容）。
 *
 * 注意：最左侧合并单元格只作为弹窗 title，不进入表格主体。
 */
import { loadData } from './dataLoader'

/* ---------- 引用解析：'B12' → 列号 / 行号 ---------- */
function colOf(ref) {
  const m = /^([A-Z]+)/.exec(ref)
  if (!m) return 0
  let c = 0
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64)
  return c
}
function rowOf(ref) {
  const m = /(\d+)$/.exec(ref)
  return m ? parseInt(m[1], 10) : 0
}

/* 浅色判定：接近白色 / 浅色的字色在浅色主题下不可见，予以丢弃 */
function isLightColor(hex) {
  const s = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return false
  const r = parseInt(s.slice(0, 2), 16)
  const g = parseInt(s.slice(2, 4), 16)
  const b = parseInt(s.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 200
}

/* 单元格还原为内联 CSS（仅文本 + 字色 + 加粗 + 对齐/换行）
 * @param {object} cell JSON 单元格
 * @param {boolean} asHeader true 时按表头处理：字色/加粗交给主题样式
 */
function cellCss(cell, asHeader = false) {
  const css = {}
  if (asHeader) return css
  const s = cell?.style || {}
  const f = s.font || {}
  if (f.color && !isLightColor(f.color)) css.color = '#' + String(f.color).replace('#', '')
  if (f.bold) css.fontWeight = '600'
  const a = s.align || {}
  if (a.h === 'center') css.textAlign = 'center'
  else if (a.h === 'left') css.textAlign = 'left'
  else if (a.h === 'right') css.textAlign = 'right'
  if (a.wrapText) css.whiteSpace = 'pre-line'
  return css
}

/* 富文本 runs（表头括号小字等分级样式），字色同样做浅色保护 */
function cellRuns(cell, asHeader = false) {
  const runs = cell?.richText?.runs
  if (!Array.isArray(runs) || runs.length === 0) return null
  return runs.map(r => ({
    text: String(r.text ?? ''),
    css: {
      ...(r.color && !isLightColor(r.color) ? { color: '#' + String(r.color).replace('#', '') } : {}),
      ...(r.bold && !asHeader ? { fontWeight: '600' } : {}),
    },
  }))
}

/* 还原单元格统一入口 */
function renderCell(cell, asHeader = false) {
  if (!cell) return { text: '', css: {}, skip: false, empty: true }
  return {
    text: cell.value == null ? '' : String(cell.value),
    runs: cellRuns(cell, asHeader),
    css: cellCss(cell, asHeader),
    rowSpan: cell.isMergeMain && cell.rowspanEff > 1 ? cell.rowspanEff : undefined,
    colSpan: cell.isMergeMain && cell.colspanEff > 1 ? cell.colspanEff : undefined,
    // 非主格（被合并覆盖的位置）不渲染 td
    skip: !!cell.mergedMain,
    empty: cell.value == null || cell.value === '',
  }
}

export async function parseQcTable() {
  const json = await loadData('qc')
  const sheet = json.sheets[0]
  const cells = sheet.cells || {}

  /* 1. 建立行列索引 + 统计实际边界 */
  const grid = new Map()
  let maxRow = 0
  let maxCol = 0
  for (const [ref, cell] of Object.entries(cells)) {
    const r = rowOf(ref)
    const c = colOf(ref)
    if (!r || !c) continue
    if (!grid.has(r)) grid.set(r, new Map())
    grid.get(r).set(c, cell)
    if (r > maxRow) maxRow = r
    if (c > maxCol) maxCol = c
  }
  const get = (r, c) => grid.get(r)?.get(c) || null

  /* 2. 定位「左上角纵向合并」标题单元格（如 A1:A12）——只作弹窗标题，不入表格 */
  const merges = sheet.merges || []
  const titleMerge = merges.find(m => (m.from?.col ?? 0) === 1 && (m.rowspanEff ?? m.rowspan) > 1)
    || merges.find(m => (m.from?.col ?? 0) === 1)
  let titleText = sheet.name || '数据明细'
  if (titleMerge) {
    const main = get(titleMerge.from.row, titleMerge.from.col)
    titleText = String(main?.value || '').replace(/\s*\n\s*/g, ' ').trim() || titleText
  }

  /* 3. 表头行与数据起始列（标题列右侧一列开始） */
  const headerRow = titleMerge?.from?.row || 1
  const startCol = (titleMerge?.from?.col || 1) + 1
  const dataRowStart = headerRow + 1

  /* 4. 动态列：表头行有 cell 的列即参与渲染（Excel 删列后该列无 cell，自然跳过） */
  const cols = []
  for (let c = startCol; c <= maxCol; c++) {
    const head = get(headerRow, c)
    if (!head) continue
    cols.push({
      col: c,
      label: head.value == null ? '' : String(head.value),
      head: renderCell(head, true), // 表头字色交给主题样式
      width: Number(sheet.colWidths?.[c]) || 0,
    })
  }

  /* 5. 动态行：区域内任意列有 cell 即渲染（Excel 删行后自然消失） */
  const totalWidth = cols.reduce((s, col) => s + col.width, 0)
  const colPercents = cols.map(col =>
    totalWidth > 0 ? +((col.width / totalWidth) * 100).toFixed(2) : 0
  )

  const rows = []
  for (let r = dataRowStart; r <= maxRow; r++) {
    const rendered = cols.map(col => renderCell(get(r, col.col)))
    const exists = rendered.some(c => !c.empty || !c.skip)
    if (!exists) continue
    const firstVal = rendered[0]?.text?.trim() || ''
    rows.push({
      key: 'r' + r,
      isTotal: /^合计/.test(firstVal),
      cells: rendered,
    })
  }

  return { title: titleText, cols, colPercents, rows }
}
