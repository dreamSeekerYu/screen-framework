/**
 * 周度工作计划解析器（2026 新版数据结构专用）
 *
 * 输入：indexSheet 之后的 sheet 对象（public/data/周度工作计划.json）
 * 源表结构：扁平单表，第 1 行表头，共 9 列：
 *   周期 | 车间 | 要点标签 | 计划事项 | 当前进度 | 完成状态 | 完结时间 | 跟进人 | 备注说明
 *   - 周期（A 列）：W44/W43/W42…，每行都有值，行序即周序（最新周在前）
 *   - 车间（B 列）：A1/A2/A3/M5/M6，作为页面分组维度
 *   - 完成状态（F 列）：「推进中」时为 0~1 小数（0.3/0.5），已完成/未开始为空
 *   - 完结时间（G 列）：Excel 日期序列号（46325 = 2026-10-30）
 *
 * 输出：{ weeks, workshops }
 *   weeks[i] = { title, items[], stats{ total, done, doing, todo, rate, groups } }
 *   items[i] = { group, tag, plan, progressText, status, percent, finishAt, owner, remark }
 */

import { cellText, getCell } from './getDataFromJson.js'

// 表头关键字 → 归一化字段（按表头行动态映射，兼容列序调整/列增删）
const HEADER_KEYS = [
  { field: 'week', match: ['周期'] },
  { field: 'group', match: ['车间'] },
  { field: 'tag', match: ['要点标签', '标签'] },
  { field: 'plan', match: ['计划事项', '事项', '计划内容'] },
  { field: 'progress', match: ['当前进度', '进度'] },
  { field: 'status', match: ['完成状态'] },
  { field: 'finishAt', match: ['完结时间', '时间节点'] },
  { field: 'owner', match: ['跟进人', '负责人'] },
  { field: 'remark', match: ['备注说明', '备注'] },
]

// 进度归一化
export const STATUS = {
  DONE: 'done',
  DOING: 'doing',
  TODO: 'todo',
}

/** 进度文本 → 标准状态 */
function normalizeStatus(text, pct) {
  const t = String(text || '').trim()
  if (/未开始|待启动|待办|todo/i.test(t)) return STATUS.TODO
  if (/已完成|完成|done/i.test(t)) return STATUS.DONE
  if (/推进中|进行中|doing|待跟进/i.test(t)) return STATUS.DOING
  // 没写状态但有完成度数值
  if (typeof pct === 'number') {
    if (pct >= 1) return STATUS.DONE
    if (pct > 0) return STATUS.DOING
    return STATUS.TODO
  }
  return STATUS.TODO
}

/** 完成度归一化（0~1）：已完成=1、未开始=0、推进中取完成状态列数值 */
function normalizePercent(statusText, pctCell) {
  const s = normalizeStatus(statusText)
  if (s === STATUS.DONE) return 1
  if (s === STATUS.TODO) return 0
  if (pctCell != null && pctCell !== '' && !isNaN(+pctCell)) {
    const v = +pctCell
    if (v >= 0 && v <= 1) return v
    if (v > 1 && v <= 100) return v / 100
  }
  // 兜底：从「推进中 41%」这类文本提取
  const m = String(statusText || '').match(/(\d+(?:\.\d+)?)\s*%/)
  if (m) return +m[1] / 100
  return 0.3 // 推进中默认按 30% 占位
}

function excelSerialToDate(n) {
  const ms = Math.round((n - 25569) * 86400 * 1000)
  return new Date(ms)
}
const pad = (x) => String(x).padStart(2, '0')

/** 完结时间单元格 → 'YYYY-MM-DD'（支持序列号数字/字符串、Date、文本） */
function normalizeDate(cell) {
  if (!cell) return ''
  if (cell.text && cell.numFmtKind !== 'pct') return String(cell.text).slice(0, 10)
  let v = cell.value
  if (v == null || v === '') return ''
  if (typeof v === 'string' && /^\d{4,5}$/.test(v.trim())) v = +v.trim()
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = excelSerialToDate(v)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
  }
  return String(v).slice(0, 10)
}

/** 周标题归一化：'w42'/'W 42' → 'W42' */
const normWeek = (s) => String(s).trim().toUpperCase().replace(/\s+/g, '')
const isWeekText = (s) => /^W\s*\d{1,2}$/i.test(String(s || '').trim())

const txt = (sheet, r, c) => String(cellText(getCell(sheet, r, c)) ?? '').trim()

/**
 * 主解析函数
 * @param {Object} sheet 已 indexSheet 的 sheet
 * @returns {{weeks: Array<{title:string, items:Array, stats:Object}>, workshops: string[]}}
 */
export function parseWeeklyPlan(sheet) {
  const { minRow = 1, maxRow = 1, maxCol = 9 } = sheet.dimensions || {}

  // 1) 定位表头行并映射列（表头行 = 行内出现「计划事项」或「周期」表头字样）
  let headerRow = 0
  let colMap = null
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = 1; c <= maxCol; c++) {
      const v = txt(sheet, r, c)
      if (v === '计划事项' || v === '周期') {
        headerRow = r
        colMap = buildColMap(sheet, r, maxCol)
        break
      }
    }
    if (colMap) break
  }
  if (!colMap || !colMap.plan) return { weeks: [], workshops: [] }

  // 2) 逐行收集数据
  const rawWeeks = new Map() // title -> items[]（保持行序）
  for (let r = headerRow + 1; r <= maxRow; r++) {
    const weekCell = colMap.week ? txt(sheet, r, colMap.week) : ''
    if (!isWeekText(weekCell)) continue
    const title = normWeek(weekCell)

    const plan = colMap.plan ? txt(sheet, r, colMap.plan) : ''
    if (!plan) continue

    const group = colMap.group ? txt(sheet, r, colMap.group) : ''
    const tag = colMap.tag ? txt(sheet, r, colMap.tag) : ''
    const progressText = colMap.progress ? txt(sheet, r, colMap.progress) : ''
    const statusCell = colMap.status ? getCell(sheet, r, colMap.status) : null
    const statusRaw = String(cellText(statusCell) ?? '').trim()
    const percent = normalizePercent(progressText || statusRaw, statusCell?.value)
    const finishAt = colMap.finishAt ? normalizeDate(getCell(sheet, r, colMap.finishAt)) : ''
    const owner = colMap.owner ? txt(sheet, r, colMap.owner) : ''
    const remark = colMap.remark ? txt(sheet, r, colMap.remark) : ''

    if (!rawWeeks.has(title)) rawWeeks.set(title, [])
    rawWeeks.get(title).push({
      _row: r,
      group,          // 车间（A1/A2/A3/M5/M6）
      tag,            // 要点标签
      plan,
      progressText,   // 当前进度文本（已完成/推进中/未开始）
      status: normalizeStatus(progressText || statusRaw, percent),
      percent,        // 0~1
      finishAt,
      owner,
      remark,
    })
  }

  // 3) 组装输出（行序即周序，最新周在前）
  const weeks = [...rawWeeks.entries()].map(([title, items]) => finalize(title, items))

  // 汇总所有出现过的车间
  const workshopSet = new Set()
  weeks.forEach((w) => w.items.forEach((it) => it.group && workshopSet.add(it.group)))

  return { weeks, workshops: Array.from(workshopSet) }
}

function buildColMap(sheet, headerRow, maxCol) {
  const map = {}
  for (let c = 1; c <= maxCol; c++) {
    const v = txt(sheet, headerRow, c)
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

function finalize(title, items) {
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
  return { title, items, stats: { total, done, doing, todo, rate, groups } }
}
