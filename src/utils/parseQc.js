/**
 * qc人力.json 数据解析
 * 源数据是单 sheet 12×14 表格：
 *  - 第 1 行：表头
 *  - 第 2-11 行：A1/A1技术员/A2/A2技术员/A3/A3技术员/M5/M5技术员/M6/M6技术员
 *  - 第 12 行：合计
 */
import { loadData } from './dataLoader'

function toNum(v) {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/,/g, '').trim()
  if (s === '' || s === '/' || s === '#DIV/0!') return 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

/** 是否为有效数字（排除 null / '#DIV/0!' / 非数字文本） */
function isValidNum(v) {
  return typeof v === 'number' && isFinite(v)
}

/**
 * 从 A1..Bn.. 引用中提取列号（1-based）
 */
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

/**
 * 读取单元格值，优先取 value；带 merge 时左上角 cell 才有值，由调用方处理
 */
function cellVal(sheet, r, c) {
  // 找形如 <letter><r> 的 key
  // 直接遍历 cells 的代价很小（<200 cells），避免维护行数组
  for (const [ref, cell] of Object.entries(sheet.cells || {})) {
    if (rowOf(ref) === r && colOf(ref) === c) return cell.value
  }
  return ''
}

// 主车间 key 列表（不含技术员行）
const MAIN_SHOPS = ['A1', 'A2', 'A3', 'M5', 'M6']

// 列号定义（基于表头第 1 行）
const COL = {
  name: 2,        // 车间
  config: 3,      // 配置人力(标配)
  onjob: 4,       // 在职人员(架构)
  supportIn: 5,   // 支援(内部)
  otherSupport: 6,// 其他工厂支援
  train: 7,       // 代培(内部) 负值表示输出代培
  leaveDay: 8,    // 休假
  actual: 9,      // 当前实际人力(含支援)
  preLeave: 10,   // 预离职 (负值)
  gapNow: 11,     // 缺口（当前）
  outSupport: 12, // 外部支援(预计)
  gapExpect: 13,  // 缺口（预计）
  remark: 14,     // 备注
}

/**
 * 解析 data.json 中「离职率分析（文员）」区块，返回最近 N 周的离职率推移数据
 * Excel 结构（动态定位，兼容行列增删）：
 *   - 标题行 A列 = 「九、离职率分析（文员）」
 *   - 标题行+1：周次（CW36…）
 *   - +2：总人数  +3：离职人数  +4：离职率（小数）  +5：目标（小数）
 * 无数据周（总人数/离职率缺失或 #DIV/0!）自动剔除，只取最近 limit 周
 */
export async function parseLeaveRateTrend(limit = 10) {
  const json = await loadData('data')
  const cells = json.sheets?.[0]?.cells || {}

  // 1) 动态定位标题行
  let titleRow = 0
  for (const [ref, cell] of Object.entries(cells)) {
    if (String(cell.value || '').includes('离职率分析')) {
      titleRow = rowOf(ref)
      break
    }
  }
  if (!titleRow) return null

  // 2) 按列号归集 5 行数据
  const rowStart = titleRow + 1
  const byCol = new Map() // col -> { week, total, leave, rate, target }
  for (const [ref, cell] of Object.entries(cells)) {
    const r = rowOf(ref)
    if (r < rowStart || r > rowStart + 4) continue
    const c = colOf(ref)
    if (c < 4) continue // D 列起才是数据
    const o = byCol.get(c) || {}
    if (r === rowStart) o.week = String(cell.value || '').trim()
    else if (r === rowStart + 1) o.total = cell.value
    else if (r === rowStart + 2) o.leave = cell.value
    else if (r === rowStart + 3) o.rate = cell.value
    else if (r === rowStart + 4) o.target = cell.value
    byCol.set(c, o)
  }

  // 3) 过滤有效周（周次合法 + 总人数与离职率均为数字），并按周次升序
  const valid = [...byCol.values()]
    .filter(o => /^CW\d+$/i.test(o.week) && isValidNum(o.total) && isValidNum(o.rate))
    .sort((a, b) => parseInt(a.week.slice(2), 10) - parseInt(b.week.slice(2), 10))

  const recent = valid.slice(-limit)
  if (!recent.length) return null

  return {
    weeks: recent.map(o => o.week),
    total: recent.map(o => o.total),
    leave: recent.map(o => o.leave),
    rate: recent.map(o => +(o.rate * 100).toFixed(2)),        // 百分比数值
    target: recent.length ? +(recent[recent.length - 1].target || 0) * 100 : 5,
  }
}

export async function parseQcData() {
  const json = await loadData('qc')
  const sheet = json.sheets[0]

  // 构建行映射
  const rows = {}
  for (let r = 2; r <= 12; r++) {
    const name = String(cellVal(sheet, r, COL.name) || '').trim()
    rows[name] = r
  }

  const readShop = (name) => {
    const r = rows[name]
    if (!r) return null
    return {
      name,
      config: toNum(cellVal(sheet, r, COL.config)),
      onjob: toNum(cellVal(sheet, r, COL.onjob)),
      supportIn: toNum(cellVal(sheet, r, COL.supportIn)),
      otherSupport: toNum(cellVal(sheet, r, COL.otherSupport)),
      train: toNum(cellVal(sheet, r, COL.train)),
      leaveDay: toNum(cellVal(sheet, r, COL.leaveDay)),
      actual: toNum(cellVal(sheet, r, COL.actual)),
      preLeave: -toNum(cellVal(sheet, r, COL.preLeave)), // 表内为负数，转正
      gapNow: toNum(cellVal(sheet, r, COL.gapNow)),     // 负值表示缺人
      outSupport: toNum(cellVal(sheet, r, COL.outSupport)),
      gapExpect: toNum(cellVal(sheet, r, COL.gapExpect)),
      remark: String(cellVal(sheet, r, COL.remark) || '').trim(),
    }
  }

  const shops = MAIN_SHOPS.map(readShop).filter(Boolean)
  const total = readShop('合计')

  // 技术员行（非主车间、非合计）
  const tech = {}
  for (const key of Object.keys(rows)) {
    if (key === '合计' || MAIN_SHOPS.includes(key)) continue
    tech[key] = readShop(key)
  }

  // ============ 派生指标 ============
  // 1. 整体充足率 = 实际 / 配置
  const fillRate = total && total.config > 0 ? (total.actual / total.config) * 100 : 0
  // 2. 支援总人数：内部支援+其他工厂支援合计
  const totalSupport = total.supportIn + total.otherSupport
  const supportRate = total.config > 0 ? (totalSupport / total.config) * 100 : 0
  const preLeaveRate = total.config > 0 ? (total.preLeave / total.config) * 100 : 0
  const gapRate = total.config > 0 ? (-total.gapNow / total.config) * 100 : 0

  // 3. 风险预警：按缺口严重程度倒序
  const riskList = shops.map(s => {
    let level = 'ok'
    let gapText = s.gapNow >= 0 ? `+${s.gapNow}` : `${s.gapNow}`
    let msg = ''
    if (s.gapNow <= -20) {
      level = 'danger'
      msg = `严重缺口，需外部支援${s.outSupport}人，当前仅${s.actual}人到岗`
    } else if (s.gapNow < 0) {
      level = 'danger'
      if (s.preLeave > 0) {
        msg = `充足率${((s.actual/s.config)*100).toFixed(0)}%，预离职${s.preLeave}人，需补充`
      } else {
        msg = `缺口${-s.gapNow}人，需补充`
      }
    } else if (s.preLeave >= 10) {
      level = 'warning'
      msg = `当前盈余${s.gapNow}人，预计将缺口${-s.gapExpect}人`
    } else if (s.preLeave > 0) {
      level = 'warning'
      msg = `预离职${s.preLeave}人，需提前储备`
    } else {
      level = 'ok'
      msg = '人员充足'
    }
    return { ...s, gapText, level, msg }
  })

  // 高风险数（danger+warning）
  const highRiskCount = riskList.filter(r => r.level === 'danger').length
  const warnCount = riskList.filter(r => r.level === 'warning').length

  // 4. 支援人员来源（来自备注与 otherSupport 列）
  // 根据备注：
  //   - A1: A1原本18人+A1单体工厂支援10人 → A1单体工厂 10人 支援A1/M5/M6
  //   - A2: A3代培4人，M5代培8人 → 实际来自其他工厂 7 人（列 otherSupport=7）
  //   - 待外部支援: A2 外部支援 15 人
  // 按 otherSupport 列真实值：A1=10, A2=7, A3=0, M5=1, M6=7
  const supportSources = [
    { name: 'A1单体工厂', count: shops.find(s=>s.name==='A1')?.otherSupport || 0, desc: '支援A1/M5/M6车间', color: 'primary' },
    { name: 'A2单体工厂', count: shops.find(s=>s.name==='A2')?.otherSupport || 0, desc: '全部支援A2车间', color: 'secondary' },
    { name: '其他工厂支援M5', count: shops.find(s=>s.name==='M5')?.otherSupport || 0, desc: '支援M5车间', color: 'success' },
    { name: '其他工厂支援M6', count: shops.find(s=>s.name==='M6')?.otherSupport || 0, desc: '支援M6车间', color: 'warning' },
  ].filter(x => x.count > 0)
  const externalWait = total.outSupport // 待外部支援
  const maxSupport = Math.max(...supportSources.map(s => s.count), externalWait || 0)

  // 5. 预离职分布（只统计有预离职的车间）
  const leaveDist = shops
    .filter(s => s.preLeave > 0)
    .map(s => ({
      name: s.name,
      value: s.preLeave,
      percent: total.preLeave > 0 ? (s.preLeave / total.preLeave * 100).toFixed(1) : 0,
    }))
    .sort((a,b) => b.value - a.value)

  // 6. 架构配置完成率 = 在职 / 配置
  const configRate = total.config > 0 ? (total.onjob / total.config) * 100 : 0
  const onjobFillRate = total.config > 0 ? (total.actual / total.config) * 100 : 0

  return {
    total,
    shops,
    tech,
    riskList,
    highRiskCount,
    warnCount,
    supportSources,
    externalWait,
    maxSupport,
    leaveDist,
    // KPI 派生
    kpi: {
      totalConfig: total.config,                    // 总配置人力
      onjob: total.onjob,                           // 在职架构
      configRate,                                   // 架构配置完成率 %
      actual: total.actual,                         // 当前实际人力
      onjobFillRate,                                // 实际人力配置率 %
      gapNow: total.gapNow,                         // 当前缺口
      gapRate,                                      // 缺口比例 %
      gapExpect: total.gapExpect,                   // 预计总缺口
      preLeave: total.preLeave,                     // 预离职
      totalSupport,                                 // 其他工厂预计支援
      fillRate: +fillRate.toFixed(1),               // 人员充足率
      supportRate: +supportRate.toFixed(1),
      preLeaveRate: +preLeaveRate.toFixed(1),
    },
    updatedAt: json.generatedAt || '',
  }
}
