/**
 * 重大质量异常闭环率 - 重要问题闭环率区域解析
 * 数据源：public/data/周报源数据.json → sheet[0] 「四、重要问题闭环率」块
 */
import { loadSheet } from './dataLoader.js'

// Excel 列名 ↔ 序号转换
function colToIndex(col) {
  let n = 0
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n // 1-based
}
function indexToCol(n) {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const HEADER_ROW = 59      // CW1..CW53
const WORKSHOP_BLOCK_START = 60
const TOTAL_ROW = 80       // 合计-总数
const DUE_ROW = 81         // 合计-到期闭环数量
const ACTUAL_ROW = 82      // 合计-实际关闭数量
const RATE_ROW = 83        // 合计-按期闭环率
const TARGET_ROW = 84      // 合计-目标值

// 各车间块起点（每个车间 4 行：总数/到期/实际/闭环率）
const WORKSHOPS = [
  { key: 'A1', name: 'A1集成车间', startRow: 60, color: '#1890ff' },
  { key: 'A2', name: 'A2集成车间', startRow: 64, color: '#52c41a' },
  { key: 'A3', name: 'A3集成车间', startRow: 68, color: '#faad14' },
  { key: 'M5', name: 'M5集成车间', startRow: 72, color: '#722ed1' },
  { key: 'M6', name: 'M6集成车间', startRow: 76, color: '#f5222d' },
]

function cellAt(sheet, ref) {
  // indexSheet 后 cell 可能在 cells 字典里，ref 形如 'AT80'
  const cell = sheet.cells?.[ref]
  if (cell == null) return ''
  if (typeof cell === 'object') return cell.value ?? ''
  return cell
}

function toNum(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).trim()
  if (s === '' || s === '#DIV/0!' || s === '#N/A') return 0
  const n = Number(s.replace('%', ''))
  if (!isFinite(n)) return 0
  return s.includes('%') ? n / 100 : n
}

function toPct(v) {
  const n = toNum(v)
  return n <= 1 ? Math.round(n * 100) : Math.round(n)
}

/**
 * 解析「重要问题闭环率」块
 * @returns {Object} stats
 */
export async function parseQualityCloseRate() {
  const sheet = await loadSheet('main', 0)

  // 1. 扫描表头行找出所有 CW 列
  const cwColMap = {} // { cwNum: 'AT' }
  for (let col = 1; col <= 80; col++) {
    const colRef = indexToCol(col)
    const ref = `${colRef}${HEADER_ROW}`
    const v = String(cellAt(sheet, ref) || '').trim()
    const m = v.match(/^CW(\d+)$/)
    if (m) cwColMap[parseInt(m[1], 10)] = colRef
  }

  // 2. 找出最近一个有数据的周：合计行 总数 > 0
  const validCws = []
  for (const [cw, col] of Object.entries(cwColMap)) {
    const total = toNum(cellAt(sheet, `${col}${TOTAL_ROW}`))
    if (total > 0) validCws.push(parseInt(cw, 10))
  }
  validCws.sort((a, b) => a - b)
  const currentCw = validCws[validCws.length - 1]
  const lastCw = currentCw - 1
  // 连续按期闭环周数：从 currentCw 往前数，闭环率=1 的连续周
  let consecutiveWeeks = 0
  for (let w = currentCw; w >= 1; w--) {
    const col = cwColMap[w]
    if (!col) break
    const rate = toNum(cellAt(sheet, `${col}${RATE_ROW}`))
    if (rate >= 1) consecutiveWeeks++
    else break
  }

  // 3. 连续 N 周趋势（默认 6 周，不足时取有数据的周）
  const trendWeeks = []
  const startW = Math.max(validCws[0], currentCw - (consecutiveWeeks > 0 ? Math.min(consecutiveWeeks, 6) - 1 : 5))
  for (let w = currentCw - 5; w <= currentCw; w++) {
    const col = cwColMap[w]
    if (!col) continue
    const due = Math.round(toNum(cellAt(sheet, `${col}${DUE_ROW}`)))
    const actual = Math.round(toNum(cellAt(sheet, `${col}${ACTUAL_ROW}`)))
    const rate = toNum(cellAt(sheet, `${col}${RATE_ROW}`))
    trendWeeks.push({
      cw: w,
      label: `CW${w}`,
      total: Math.round(toNum(cellAt(sheet, `${col}${TOTAL_ROW}`))),
      due,
      actual,
      rate: rate <= 1 ? rate * 100 : rate,
    })
  }

  // 4. KPI 数据
  const currentCol = cwColMap[currentCw]
  const lastCol = cwColMap[lastCw]
  const kpi = {
    consecutiveRate: toPct(cellAt(sheet, `${currentCol}${RATE_ROW}`)),
    consecutiveWeeks,
    periodRange: `CW${currentCw - consecutiveWeeks + 1}—CW${currentCw}`,
    cumulativeClosed: Math.round(toNum(cellAt(sheet, `${currentCol}${ACTUAL_ROW}`))), // 累计=到期累计（表格语义）
    lastCumulativeClosed: lastCol ? Math.round(toNum(cellAt(sheet, `${lastCol}${ACTUAL_ROW}`))) : 0,
    // 本周新增 = 合计总数(curr) - 合计总数(last)
    weekNew: Math.round(toNum(cellAt(sheet, `${currentCol}${TOTAL_ROW}`))) -
             (lastCol ? Math.round(toNum(cellAt(sheet, `${lastCol}${TOTAL_ROW}`))) : 0),
    overdue: 0, // 到期=实际，故超期=0
  }
  // 超期数量 = max(0, due - actual)
  const currDue = Math.round(toNum(cellAt(sheet, `${currentCol}${DUE_ROW}`)))
  const currActual = Math.round(toNum(cellAt(sheet, `${currentCol}${ACTUAL_ROW}`)))
  kpi.overdue = Math.max(0, currDue - currActual)
  kpi.cumulativeClosed = currActual
  kpi.weekDue = currDue

  // 5. 各车间闭环达成（当前周）
  const workshops = []
  let activeWorkshops = new Set()
  let lineCount = 0 // 线体数（简化：有总数>0 即视为涉及）
  for (const ws of WORKSHOPS) {
    const col = currentCol
    const total = Math.round(toNum(cellAt(sheet, `${col}${ws.startRow}`)))
    const due = Math.round(toNum(cellAt(sheet, `${col}${ws.startRow + 1}`)))
    const actual = Math.round(toNum(cellAt(sheet, `${col}${ws.startRow + 2}`)))
    const rate = toNum(cellAt(sheet, `${col}${ws.startRow + 3}`))
    if (total > 0) {
      activeWorkshops.add(ws.key)
      lineCount++
    }
    workshops.push({
      ...ws,
      total,
      due,
      actual,
      rate: rate <= 1 ? rate * 100 : rate,
      rateText: `${Math.round(rate * 100)}%`,
    })
  }
  // 涉及范围：车间/线体
  const wsKeys = Array.from(activeWorkshops)
  const scope = {
    workshopCount: wsKeys.length,
    lineCount,
    text: wsKeys.join('/'),
  }
  // 主车间（累计最多的）
  const mainWorkshop = [...workshops].sort((a, b) => b.actual - a.actual)[0]

  return {
    currentCw,
    lastCw,
    kpi,
    trendWeeks,
    workshops,
    mainWorkshop,
    scope,
  }
}
