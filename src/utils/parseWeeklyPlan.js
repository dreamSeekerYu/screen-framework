/**
 * 周度工作计划解析器
 *
 * 输入：indexSheet 之后的 sheet 对象（来自 public/data/周度工作计划.json）
 * 输出：结构化 weeks 数组（最新周在前），每个 week 含 title / items[] / stats
 *
 * 兼容两种数据结构（按表头行自动识别）：
 *  ① 新版扁平表（2026+）：9 列「周期/车间/要点标签/计划事项/当前进度/完成状态/完结时间/跟进人/备注说明」
 *     - 周期列（A）为纵向合并单元格，从属格带值；周归属由「周期」列驱动
 *     - 页面分组维度 = 要点标签（B 列）
 *  ② 旧版分节表：A 列 wXX 周标题行 + 各周独立表头行，数据行 A 列为车间分组
 *     - 周归属由「A 列 wXX 独占行」触发，分组维度 = A 列（车间）
 */

import { cellText, getCell } from './getDataFromJson.js'

// 表头关键字 → 归一化字段
const HEADER_KEYS = [
  { field: 'week', match: ['周期'] },
  { field: 'workshop', match: ['车间'] },
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
  // 推进中：优先取完成状态列的 0~1 小数值
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
  if (cell.text && cell.numFmtKind !== 'pct') return cell.text
  let v = cell.value
  if (v == null || v === '') return ''
  // 兼容字符串形式的 Excel 序列号（如 '46325'）
  if (typeof v === 'string' && /^\d{4,5}$/.test(v.trim())) v = +v.trim()
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

/** 周标题归一化：'w42'/'W 42' → 'W42' */
const normWeek = (s) => String(s).trim().toUpperCase().replace(/\s+/g, '')
const isWeekText = (s) => /^W\s*\d{1,2}$/i.test(String(s || '').trim())

/** 判断某行是否为表头行：行内出现完整的「计划事项/要点标签」表头字样 */
function detectHeaderRow(sheet, r, maxCol) {
  for (let c = 1; c <= maxCol; c++) {
    const v = String(cellText(getCell(sheet, r, c)) ?? "").trim()
    if (v === '计划事项' || v === '要点标签' || v === '周期') return true
  }
  return false
}

function buildColMap(sheet, headerRow, maxCol) {
  const map = {}
  for (let c = 1; c <= maxCol; c++) {
    const v = String(cellText(getCell(sheet, headerRow, c)) ?? "").trim()
    if (!v) continue
    for (const { field, match } of HEADER_KEYS) {
      if (match.some((k) => v.includes(k))) {
        if (!map[field]) map[field] = c
        break
      }
    }
  }
  return map
}

/**
 * 主解析函数
 * @param {Object} sheet 已 indexSheet 的 sheet
 * @returns {{weeks: Array<{title:string, items:Array, stats:Object}>, workshops: string[]}}
 */
export function parseWeeklyPlan(sheet) {
  const { minRow = 1, maxRow = 1, maxCol = 8 } = sheet.dimensions || {}
  const weeks = []
  let current = null
  let colMap = null
  let currentGroup = ''

  for (let r = minRow; r <= maxRow; r++) {
    // ── 表头行：重建列映射（兼容每周独立表头的旧结构） ──
    if (detectHeaderRow(sheet, r, maxCol)) {
      colMap = buildColMap(sheet, r, maxCol)
      currentGroup = ''
      continue
    }
    if (!colMap || !colMap.plan) continue

    const a = String(cellText(getCell(sheet, r, 1)) ?? "").trim()
    const planText = String(cellText(getCell(sheet, r, colMap.plan)) ?? "").trim()

    // ── 周归属判定 ──
    let weekTitle = ''
    if (colMap.week) {
      // 新结构：周期列（纵向合并，从属格亦带值）
      const wv = String(cellText(getCell(sheet, r, colMap.week)) ?? "").trim()
      if (isWeekText(wv)) weekTitle = normWeek(wv)
    } else if (isWeekText(a) && !planText) {
      // 旧结构：A 列 wXX 独占的周标题行
      weekTitle = normWeek(a)
    }
    if (weekTitle && (!current || current.title !== weekTitle)) {
      if (current) weeks.push(finalize(current))
      current = { title: weekTitle, items: [] }
      currentGroup = ''
    }
    if (!current || !planText) continue

    // ── 数据行 ──
    const tagCol = colMap.tag
    const progCol = colMap.progress
    const statCol = colMap.status
    const finishCol = colMap.finishAt
    const ownerCol = colMap.owner
    const remarkCol = colMap.remark

    const tag = tagCol ? String(cellText(getCell(sheet, r, tagCol)) ?? "").trim() : ''
    const progressText = progCol ? String(cellText(getCell(sheet, r, progCol)) ?? "").trim() : ''
    const statusCell = statCol ? getCell(sheet, r, statCol) : null
    const statusRaw = String(cellText(statusCell) ?? "").trim()
    const percent = normalizePercent(progressText || statusRaw, statusCell?.value)
    const finishText = finishCol ? normalizeDate(getCell(sheet, r, finishCol)) : ''
    const ownerText = ownerCol ? String(cellText(getCell(sheet, r, ownerCol)) ?? "").trim() : ''
    const remarkText = remarkCol ? String(cellText(getCell(sheet, r, remarkCol)) ?? "").trim() : ''

    // 分组维度：新结构 = 要点标签；旧结构 = A 列（车间），合并区从属格回退到上一组
    const group = colMap.week
      ? (tag || currentGroup)
      : (a && !isWeekText(a) ? a : currentGroup)
    if (group) currentGroup = group

    current.items.push({
      _row: r,
      group,            // 新结构：要点标签；旧结构：车间
      tag,              // 要点标签
      plan: planText,
      progressText,     // 当前进度（已完成/推进中/未开始 文本）
      status: normalizeStatus(progressText || statusRaw, percent),
      percent,          // 0~1
      finishAt: finishText,
      owner: ownerText,
      remark: remarkText,
    })
  }
  if (current) weeks.push(finalize(current))

  // 汇总：所有出现过的分组（新结构为要点标签，旧结构为车间）
  const groupSet = new Set()
  weeks.forEach((w) => w.items.forEach((it) => it.group && groupSet.add(it.group)))

  return { weeks, workshops: Array.from(groupSet) }
}

function finalize(week) {
  // 计算统计
  const items = week.items
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
  return {
    title: week.title,
    items,
    stats: { total, done, doing, todo, rate, groups },
  }
}
