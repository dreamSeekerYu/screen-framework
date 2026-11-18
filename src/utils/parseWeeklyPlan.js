/**
 * 周度工作计划解析器
 *
 * 输入：indexSheet 之后的 sheet 对象（来自 public/data/周度工作计划.json）
 * 输出：结构化 weeks 数组，每个 week 含 title / items[] / stats
 *
 * 兼容：
 *  - 当前压缩版 JSON：7 列（分组/计划事项/当前进度/完成状态/完结时间/跟进人/备注说明）
 *  - 源 Excel 完整版：8 列（分组/要点标签/计划事项/当前进度/完成状态/完结时间/跟进人/备注说明）
 *  - 标题行由「A列以 wXX 开头」或「该行 B 列 == '要点标签'/'计划事项'」自动识别
 */

import { cellText, getCell } from './getDataFromJson.js'

// 表头关键字 → 归一化字段
const HEADER_KEYS = [
  { field: 'tag', match: ['要点标签', '标签'] },
  { field: 'plan', match: ['计划事项', '事项', '计划内容'] },
  { field: 'progress', match: ['当前进度', '进度', '完成度'] },
  { field: 'status', match: ['完成状态', '状态'] },
  { field: 'finishAt', match: ['完结时间', '时间节点', '节点'] },
  { field: 'owner', match: ['跟进人', '负责人'] },
  { field: 'remark', match: ['备注说明', '备注'] },
]

// 进度归一化
export const STATUS = {
  DONE: 'done',
  DOING: 'doing',
  TODO: 'todo',
}

function normalizeStatus(text, pct) {
  const t = (text || '').trim()
  if (/未开始|待启动|待办|todo/i.test(t)) return STATUS.TODO
  if (/已完成|完成|done/i.test(t)) return STATUS.DONE
  if (/推进中|进行中|doing|待跟进/i.test(t)) return STATUS.DOING
  // 没写状态但有完成度百分比
  if (typeof pct === 'number') {
    if (pct >= 1) return STATUS.DONE
    if (pct > 0) return STATUS.DOING
    return STATUS.TODO
  }
  return STATUS.TODO
}

function normalizePercent(statusText, pctCell) {
  // 已完成/未开始直接 100/0
  const s = normalizeStatus(statusText)
  if (s === STATUS.DONE) return 1
  if (s === STATUS.TODO) return 0
  // 推进中：优先取 E 列数值（完成状态列的 0~1 小数值）
  if (pctCell != null && pctCell !== '' && !isNaN(+pctCell)) {
    const v = +pctCell
    if (v >= 0 && v <= 1) return v
    if (v > 1 && v <= 100) return v / 100
  }
  // 尝试从「推进中 41%」文本里提取
  const m = String(statusText || '').match(/(\d+(?:\.\d+)?)\s*%/)
  if (m) return +m[1] / 100
  return 0.3 // 默认推进中按 30% 占位
}

function normalizeDate(cell) {
  if (!cell) return ''
  if (cell.text) return cell.text
  const v = cell.value
  if (v == null || v === '') return ''
  // Excel 序列日期（46325 = 2026-10-30）
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = excelSerialToDate(v)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
  }
  return String(v).slice(0, 10)
}

function excelSerialToDate(n) {
  // Excel 1900-01-01 = 1，JS 时间戳起点偏移
  const ms = Math.round((n - 25569) * 86400 * 1000)
  return new Date(ms)
}
const pad = (x) => String(x).padStart(2, '0')

/**
 * 主解析函数
 * @param {Object} sheet 已 indexSheet 的 sheet
 * @returns {{weeks: Array<{title:string, items:Array, stats:Object}>, workshops: string[]}}
 */
export function parseWeeklyPlan(sheet) {
  const { minRow = 1, maxRow = 1 } = sheet.dimensions || {}
  const weeks = []
  let cursor = null

  for (let r = minRow; r <= maxRow; r++) {
    const aCell = getCell(sheet, r, 1)
    const bCell = getCell(sheet, r, 2)
    const a = cellText(aCell).trim()
    const b = cellText(bCell).trim()

    // ── 识别周标题行：A 列整行合并、含 wXX/周度 ──
    if (a && /w\d{1,2}|周度|第\s*\d+\s*周|周工作计划/i.test(a)) {
      if (cursor) weeks.push(finalize(cursor))
      cursor = { title: a, headerRow: null, colMap: null, rawItems: [], items: [] }
      continue
    }
    if (!cursor) continue

    // ── 识别表头行：B 列出现「要点标签/计划事项」 ──
    if (!cursor.headerRow && /要点标签|计划事项/.test(b)) {
      cursor.headerRow = r
      cursor.colMap = buildColMap(sheet, r)
      continue
    }
    if (!cursor.headerRow) continue

    // ── 识别数据行：计划事项非空 ──
    const planCol = cursor.colMap.plan
    if (!planCol) continue
    const planCell = getCell(sheet, r, planCol)
    const planText = cellText(planCell).trim()
    // 不管是不是 plan 行，只要 A 列有值就更新当前分组（处理 plan 行首列本身就是分组的情况）
    if (a) cursor._currentGroup = a
    if (!planText) continue

    const tagCol = cursor.colMap.tag
    const progCol = cursor.colMap.progress
    const statCol = cursor.colMap.status
    const finishCol = cursor.colMap.finishAt
    const ownerCol = cursor.colMap.owner
    const remarkCol = cursor.colMap.remark

    const group = a || cursor._currentGroup || ''
    const tag = tagCol ? cellText(getCell(sheet, r, tagCol)).trim() : ''
    const progressText = progCol ? cellText(getCell(sheet, r, progCol)).trim() : ''
    const statusCell = statCol ? getCell(sheet, r, statCol) : null
    const statusRaw = cellText(statusCell).trim()
    const percent = normalizePercent(progressText || statusRaw, statusCell?.value)
    const finishText = finishCol ? normalizeDate(getCell(sheet, r, finishCol)) : ''
    const ownerText = ownerCol ? cellText(getCell(sheet, r, ownerCol)).trim() : ''
    const remarkText = remarkCol ? cellText(getCell(sheet, r, remarkCol)).trim() : ''

    cursor.rawItems.push({
      _row: r,
      group,            // A1/A2/A3/M5/M6
      tag,              // 要点标签（源Excel才有，压缩版为空）
      plan: planText,
      progressText,     // 当前进度（已完成/推进中/未开始 文本）
      status: normalizeStatus(progressText || statusRaw, percent),
      percent,          // 0~1
      finishAt: finishText,
      owner: ownerText,
      remark: remarkText,
    })
  }
  if (cursor) weeks.push(finalize(cursor))

  // 汇总：所有出现过的车间分组
  const workshopSet = new Set()
  weeks.forEach((w) => w.items.forEach((it) => it.group && workshopSet.add(it.group)))

  return { weeks, workshops: Array.from(workshopSet) }
}

function buildColMap(sheet, headerRow) {
  const map = {}
  const { maxCol } = sheet.dimensions
  for (let c = 1; c <= maxCol; c++) {
    const v = cellText(getCell(sheet, headerRow, c)).trim()
    if (!v) continue
    for (const { field, match } of HEADER_KEYS) {
      if (match.some((k) => v.includes(k))) {
        if (!map[field]) map[field] = c
        break
      }
    }
  }
  // 分组列固定为 A 列（列号1）
  map.group = 1
  return map
}

function finalize(week) {
  // 计算统计
  const items = week.rawItems
  const total = items.length
  const done = items.filter((i) => i.status === STATUS.DONE).length
  const doing = items.filter((i) => i.status === STATUS.DOING).length
  const todo = items.filter((i) => i.status === STATUS.TODO).length
  const groups = {}
  items.forEach((it) => {
    if (!it.group) return
    if (!groups[it.group]) groups[it.group] = { total: 0, done: 0, doing: 0, todo: 0 }
    groups[it.group].total += 1
    groups[it.group][it.status] += 1
  })
  const rate = total ? done / total : 0
  delete week.rawItems
  delete week._currentGroup
  return {
    title: week.title,
    headerRow: week.headerRow,
    items,
    stats: { total, done, doing, todo, rate, groups },
  }
}
