/**
 * PACK客户质量表现 数据解析
 *
 * 数据源：public/data/pack客户表现.json（项目自带，无需额外文件）
 * 该文件为 Excel 转换工具的产物，含 5 个客户 sheet：
 *   - A1 / A2 / A3 / M5：行标签「故障数/供货数/0KM-目标/0KM-实际/3MIS…/12MIS-实际」，
 *                        列「26-x月 + WK1~WK52」
 *   - M6：行标签「0KM-外观/0KM-性能/周交付/PPM-外观/PPM-性能/目标-外观/目标-性能」，
 *         列「5月~9月 + WK40~WK44」
 *
 * 指标口径（与原型一致）：
 *   - PPM 取「统计窗口内的峰值」，并记录峰值所在周（peakWeek）
 *   - 故障数 / 供货数 取窗口内累计
 *   - 目标值取窗口内最新一个可用目标
 *
 * 输出结构与页面（index.vue / PackDetail.vue）约定一致：
 *   { key, isM6, meta, weeks, months, metrics, models, note, kpi, trend, passRate }
 */
import { loadData } from './dataLoader.js'

/* ---------------- 列号 → 列字母（0 → A） ---------------- */
function colName(i) {
  let s = ''
  let n = i
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

/* ---------------- 客户元信息（json 中不含，按业务定义） ---------------- */
const CUSTOMER_META = {
  A1: { name: 'A1客户', fullName: '东风 A1', status: 'attention', statusText: '关注',
        remark: '整体达标率 85%，需关注0KM异常', risk: '⚡ 0KM PPM 峰值偏高，需关注' },
  A2: { name: 'A2客户', fullName: '小鹏 A2', status: 'warning', statusText: '预警',
        remark: '整体达标率 60%，12MIS需重点关注', risk: '⚠️ 12MIS 长期趋势需关注' },
  A3: { name: 'A3客户', fullName: '小鹏 A3', status: 'success', statusText: '达标',
        remark: '整体达标率 95%，质量表现优秀', risk: '✓ 各周期均达标' },
  M5: { name: 'M5客户', fullName: '小鹏 M5-XP', status: 'primary', statusText: '关注',
        remark: 'M5集成需持续监控', risk: '✓ 整体达标，爬坡期需关注' },
  M6: { name: 'M6-XM客户', fullName: '小米 M6-N1', status: 'danger', statusText: '高风险',
        remark: '外观PPM偏高，目标300PPM超标', risk: '⚠️ 外观PPM 偏高' },
}

/* ---------------- A 型 sheet 行映射：[metricKey, label, excelRow] ---------------- */
const A_ROW_MAP = [
  ['fail', '故障数', 2],
  ['supply', '供货数', 3],
  ['target0km', '0KM-目标（PPM）', 4],
  ['actual0km', '0KM-实际（PPM）', 5],
  ['fail3m', '故障数（03个月）', 6],
  ['supply3m', '供货数（03个月）', 7],
  ['target3m', '3MIS-目标', 8],
  ['actual3m', '3MIS-实际', 9],
  ['fail6m', '故障数（6个月）', 10],
  ['supply6m', '供货数（6个月）', 11],
  ['target6m', '6MIS-目标', 12],
  ['actual6m', '6MIS-实际', 13],
  ['fail12m', '故障数（12个月）', 14],
  ['supply12m', '供货数（12个月）', 15],
  ['target12m', '12MIS-目标', 16],
  ['actual12m', '12MIS-实际', 17],
]

/* ---------------- M6 sheet 行映射 ---------------- */
const M6_ROW_MAP = [
  ['failApp', '0KM-外观', 2],
  ['failPerf', '0KM-性能', 3],
  ['delivery', '周交付', 4],
  ['ppmApp', 'PPM-外观', 5],
  ['ppmPerf', 'PPM-性能', 6],
  ['targetApp', '目标-外观', 7],
  ['targetPerf', '目标-性能', 8],
]

/* ---------------- 值归一化：空 / #DIV/0! → null ---------------- */
function num(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string' && v.trim().startsWith('#')) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** 读取 sheet：表头（第 1 行）的列与标签，保持从左到右顺序 */
function readHeader(sheet) {
  const cells = sheet.cells || {}
  const maxCol = (sheet.dimensions && sheet.dimensions.maxCol) || 70
  const cols = []
  for (let c = 0; c < maxCol; c++) {
    const cn = colName(c)
    const cell = cells[`${cn}1`]
    if (cell && cell.value !== null && cell.value !== undefined && cell.value !== '') {
      cols.push({ col: cn, label: String(cell.value) })
    }
  }
  return { cells, cols }
}

/** 取某一行在指定列集合上的 { 标签: 值 } */
function rowValues(cells, row, cols) {
  const values = {}
  for (const { col, label } of cols) {
    const cell = cells[`${col}${row}`]
    values[label] = cell ? num(cell.value) : null
  }
  return values
}

/** 解析单个客户 sheet → 结构化客户对象 */
function buildCustomer(key, sheet) {
  const { cells, cols } = readHeader(sheet)
  const isM6 = key === 'M6'

  const dataCols = cols.filter(c => /^WK\d+$/i.test(c.label) || /月$/.test(c.label))
  const weeks = dataCols.filter(c => /^WK\d+$/i.test(c.label)).map(c => c.label)
  const months = dataCols.filter(c => /月$/.test(c.label)).map(c => c.label)

  const rowMap = isM6 ? M6_ROW_MAP : A_ROW_MAP
  const metrics = {}
  for (const [metricKey, label, row] of rowMap) {
    metrics[metricKey] = { label, values: rowValues(cells, row, dataCols) }
  }

  let models = null
  if (!isM6) {
    models = []
    for (let r = 18; r <= 25; r++) {
      const nm = cells[`B${r}`]
      const cd = cells[`C${r}`]
      if (nm && nm.value !== null && nm.value !== undefined && nm.value !== '') {
        models.push({ name: String(nm.value), code: cd && cd.value ? String(cd.value) : '' })
      }
    }
  }

  const noteRow = isM6 ? 21 : 27
  const noteCell = cells[`B${noteRow}`]
  const note = noteCell && noteCell.value ? String(noteCell.value) : ''

  /* ---------- 裁剪尾部"未发生"周：从末尾往前，供货=0 且全部故障=0/null 的周视为未填写 ---------- */
  if (!isM6) {
    let end = weeks.length
    while (end > 0) {
      const w = weeks[end - 1]
      const supplyV = num(metrics.supply.values[w])
      const failAllZero =
        (num(metrics.fail.values[w])    ?? 0) === 0 &&
        (num(metrics.fail3m.values[w])  ?? 0) === 0 &&
        (num(metrics.fail6m.values[w])  ?? 0) === 0 &&
        (num(metrics.fail12m.values[w]) ?? 0) === 0
      // 供货为 0 且全部故障为 0/null → 视为未发生
      if ((supplyV ?? 0) === 0 && failAllZero) {
        end--
      } else {
        break
      }
    }
    if (end < weeks.length) weeks.length = end

    // 月份同步裁剪：末尾月份供货=0 且全部故障=0 的月视为未到
    let mend = months.length
    while (mend > 0) {
      const m = months[mend - 1]
      const supplyV = num(metrics.supply.values[m])
      const failAllZero =
        (num(metrics.fail.values[m])    ?? 0) === 0 &&
        (num(metrics.fail3m.values[m])  ?? 0) === 0 &&
        (num(metrics.fail6m.values[m])  ?? 0) === 0 &&
        (num(metrics.fail12m.values[m]) ?? 0) === 0
      if ((supplyV ?? 0) === 0 && failAllZero) mend--
      else break
    }
    if (mend < months.length) months.length = mend
  } else {
    // M6 同理：周交付=0 且外观/性能故障=0/null 的周裁掉
    let end = weeks.length
    while (end > 0) {
      const w = weeks[end - 1]
      const deliv = num(metrics.delivery.values[w])
      const fApp = num(metrics.failApp.values[w]) ?? 0
      const fPerf = num(metrics.failPerf.values[w]) ?? 0
      if ((deliv ?? 0) === 0 && fApp === 0 && fPerf === 0) end--
      else break
    }
    if (end < weeks.length) weeks.length = end
  }

  return { key, isM6, meta: CUSTOMER_META[key] || { name: key }, weeks, months, metrics, models, note }
}

/* ---------------- 指标汇总 ---------------- */

/** 取最近 N 个有数据的周（按时间升序）—— 供风险规则引擎等外部使用 */
export function takeRecentOf(metric, weeks, n = 12, predicate) {
  return takeRecent(metric, weeks, n, predicate)
}

/** 取最近 N 个有数据的周（按时间升序，内部实现） */
function takeRecent(metric, weeks, n = 12, predicate) {
  const out = []
  for (let i = weeks.length - 1; i >= 0 && out.length < n; i--) {
    const w = weeks[i]
    const v = metric.values[w]
    if (v === null || v === undefined) continue
    if (predicate && !predicate(v)) continue
    out.unshift({ week: w, value: Number(v) })
  }
  return out
}

/**
 * 汇总最近 N 周：
 *   fail/supply → 窗口内累计；ppm → 窗口内峰值；target → 窗口内最新目标
 */
function summarizePeriod(metricFail, metricSupply, metricActual, metricTarget, weeks, windowWeeks = 12) {
  const recent = takeRecent(metricSupply, weeks, windowWeeks, v => Number(v) > 0)
  if (recent.length === 0) return { fail: 0, supply: 0, ppm: 0, target: 0, weeks: 0, peakWeek: null }

  const set = new Set(recent.map(r => r.week))
  let fail = 0, supply = 0
  for (const w of set) {
    fail += Number(metricFail.values[w] || 0)
    supply += Number(metricSupply.values[w] || 0)
  }

  // 峰值 + 峰值所在周
  let peak = 0, peakWeek = null
  for (const r of recent) {
    const av = metricActual.values[r.week]
    if (av === null || av === undefined) continue
    const n = Number(av)
    if (!Number.isNaN(n) && n > peak) { peak = n; peakWeek = r.week }
  }

  // 窗口内最新可用目标
  let target = null
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (set.has(weeks[i])) {
      const tv = metricTarget.values[weeks[i]]
      if (tv !== null && tv !== undefined && !Number.isNaN(Number(tv))) { target = Number(tv); break }
    }
  }

  return { fail, supply, ppm: peak, target: target || 0, weeks: set.size, peakWeek }
}

/** 根据 PPM/目标 判状态：达标/预警/超标 */
export function judgeStatus(actual, target) {
  if (!target) return 'primary'
  const r = actual / target
  if (r <= 1) return 'success'
  if (r <= 2) return 'warning'
  return 'danger'
}

/** A 型客户：4 个周期（0KM/3MIS/6MIS/12MIS） */
function buildAKPI(cust) {
  const { metrics, weeks } = cust
  const km0 = summarizePeriod(metrics.fail, metrics.supply, metrics.actual0km, metrics.target0km, weeks, 12)
  const km3 = summarizePeriod(metrics.fail3m, metrics.supply3m, metrics.actual3m, metrics.target3m, weeks, 12)
  const km6 = summarizePeriod(metrics.fail6m, metrics.supply6m, metrics.actual6m, metrics.target6m, weeks, 12)
  const km12 = summarizePeriod(metrics.fail12m, metrics.supply12m, metrics.actual12m, metrics.target12m, weeks, 12)
  return {
    km0: { ...km0, status: judgeStatus(km0.ppm, km0.target), label: '0KM PPM' },
    km3: { ...km3, status: judgeStatus(km3.ppm, km3.target), label: '3MIS PPM' },
    km6: { ...km6, status: judgeStatus(km6.ppm, km6.target), label: '6MIS PPM' },
    km12: { ...km12, status: judgeStatus(km12.ppm, km12.target), label: '12MIS PPM' },
  }
}

/** M6 客户：外观 / 性能 两个维度（映射到 km0 / km3 槽位，供页面统一渲染） */
function buildM6KPI(cust) {
  const { metrics, weeks } = cust
  const app = summarizePeriod(metrics.failApp, metrics.delivery, metrics.ppmApp, metrics.targetApp, weeks, 5)
  const perf = summarizePeriod(metrics.failPerf, metrics.delivery, metrics.ppmPerf, metrics.targetPerf, weeks, 5)
  // 近 5 周外观 / 性能故障累计
  let appFail5 = 0, perfFail5 = 0, deliv5 = 0
  const appRecent = takeRecent(metrics.delivery, weeks, 5, v => Number(v) > 0)
  const recentSet = new Set(appRecent.map(r => r.week))
  for (const w of recentSet) {
    appFail5 += Number(metrics.failApp.values[w] || 0)
    perfFail5 += Number(metrics.failPerf.values[w] || 0)
    deliv5 += Number(metrics.delivery.values[w] || 0)
  }
  return {
    km0: { ...app,  status: judgeStatus(app.ppm,  app.target  || 300), label: '外观 PPM' },
    km3: { ...perf, status: judgeStatus(perf.ppm, perf.target || 150), label: '性能 PPM' },
    // km6 / km12 在 M6 下分别承载"外观故障累计 / 性能故障累计"，用于卡片区"近 N 周累计"
    km6: { fail: appFail5,  supply: deliv5, ppm: 0, target: 0, weeks: recentSet.size, peakWeek: null,
           status: appFail5  > 0 ? 'warning' : 'success', label: '外观故障' },
    km12:{ fail: perfFail5, supply: deliv5, ppm: 0, target: 0, weeks: recentSet.size, peakWeek: null,
           status: perfFail5 > 0 ? 'warning' : 'success', label: '性能故障' },
  }
}

function buildCustomerKPI(cust) {
  return cust.isM6 ? buildM6KPI(cust) : buildAKPI(cust)
}

/** A 型客户推移图（按月） */
function buildATrend(metrics, months) {
  const series = { target0km: [], actual0km: [], target3m: [], actual3m: [],
                   target6m: [], actual6m: [], target12m: [], actual12m: [] }
  const getVal = (metric, m) => {
    const v = metric.values[m]
    return (v === null || v === undefined || Number.isNaN(Number(v))) ? 0 : Number(v)
  }
  for (const m of months) {
    series.target0km.push(getVal(metrics.target0km, m))
    series.actual0km.push(getVal(metrics.actual0km, m))
    series.target3m.push(getVal(metrics.target3m, m))
    series.actual3m.push(getVal(metrics.actual3m, m))
    series.target6m.push(getVal(metrics.target6m, m))
    series.actual6m.push(getVal(metrics.actual6m, m))
    series.target12m.push(getVal(metrics.target12m, m))
    series.actual12m.push(getVal(metrics.actual12m, m))
  }
  return { labels: months, series }
}

/** M6 推移图（月份 + 周），外观/性能分别映射到 0km / 3m 槽位 */
function buildM6Trend(cust) {
  const { metrics, months, weeks } = cust
  const labels = [...months, ...weeks]
  const getVal = (metric, m) => {
    const v = metric.values[m]
    return (v === null || v === undefined || Number.isNaN(Number(v))) ? 0 : Number(v)
  }
  const series = { target0km: [], actual0km: [], target3m: [], actual3m: [],
                   target6m: [], actual6m: [], target12m: [], actual12m: [] }
  for (const m of labels) {
    const app = getVal(metrics.ppmApp, m)
    const perf = getVal(metrics.ppmPerf, m)
    const tApp = getVal(metrics.targetApp, m) || 300
    const tPerf = getVal(metrics.targetPerf, m) || 150
    series.actual0km.push(app);  series.target0km.push(tApp)
    series.actual3m.push(perf);  series.target3m.push(tPerf)
    series.actual6m.push(app);   series.target6m.push(tApp)
    series.actual12m.push(perf); series.target12m.push(tPerf)
  }
  return { labels, series }
}

/** 缓存 */
let _parsedCache = null

/**
 * 主入口：加载并返回完整 Pack 数据
 */
export async function loadPackData() {
  if (_parsedCache) return _parsedCache
  const data = await loadData('pack')
  const sheets = Array.isArray(data.sheets) ? data.sheets : []

  const custList = []
  for (const sheet of sheets) {
    if (!sheet || !sheet.name) continue
    const cust = buildCustomer(sheet.name, sheet)
    const kpi = buildCustomerKPI(cust)
    const trend = cust.isM6 ? buildM6Trend(cust) : buildATrend(cust.metrics, cust.months)
    // M6 只看外观 / 性能两维，A 型看 0KM/3MIS/6MIS/12MIS 四维
    const passKeys = cust.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
    const passCount = passKeys.filter(k => kpi[k].status === 'success').length
    const passRate = Math.round(passCount * (cust.isM6 ? 50 : 25))
    // 故障总数：M6 = 外观 + 性能；A 型 = 0KM + 3MIS + 6MIS + 12MIS
    const failTotal = cust.isM6
      ? (kpi.km0.fail + kpi.km3.fail)
      : (kpi.km0.fail + kpi.km3.fail + kpi.km6.fail + kpi.km12.fail)
    custList.push({
      ...cust,
      kpi,
      trend,
      passRate,
      passKeys,
      failTotal,
      supplyTotal: kpi.km0.supply,
    })
  }

  const totalCustomers = custList.length
  const passCustomers = custList.filter(c => c.meta.status === 'success' || c.meta.status === 'primary').length
  const warningCustomers = custList.filter(c => c.meta.status === 'attention' || c.meta.status === 'warning').length
  const dangerCustomers = custList.filter(c => c.meta.status === 'danger').length

  // 全局峰值（顶部 KPI 用）：0KM / 3MIS / 12MIS 各客户峰值中的最大者
  // 注意：M6 为「外观 / 性能」独立维度，不并入 A 型的 3MIS/12MIS 口径
  const peakOf = (period) => {
    let peak = 0, owner = null
    for (const c of custList) {
      if (c.isM6) continue
      const k = c.kpi[period]
      if (k && k.ppm > peak) { peak = k.ppm; owner = { key: c.key, name: c.meta.name, week: k.peakWeek } }
    }
    return { value: Math.round(peak), owner }
  }

  // 截至周期：取全部客户中最末的周标签（数据驱动，替代写死的 asOf）
  let maxWeek = null
  for (const c of custList) {
    for (const w of c.weeks || []) {
      const m = /^WK(\d+)$/i.exec(w)
      if (m && (!maxWeek || Number(m[1]) > maxWeek.num)) maxWeek = { num: Number(m[1]), label: w }
    }
  }
  const asOf = maxWeek ? maxWeek.label : ((custList[0] && custList[0].months) || []).slice(-1)[0] || ''

  _parsedCache = {
    asOf,
    totalCustomers,
    passCustomers,
    warningCustomers,
    dangerCustomers,
    monitorRate: 100,
    peak0km: peakOf('km0'),
    peak3m: peakOf('km3'),
    peak12m: peakOf('km12'),
    customers: custList,
  }
  return _parsedCache
}

/**
 * 周期 key → metrics 字段后缀映射
 *   km0 → 0km（0KM-实际 / 0KM-目标）
 *   km3 → 3m （3MIS-实际 / 3MIS-目标）
 *   km6 → 6m
 *   km12 → 12m
 * M6 复用 km0/km3 槽位，对应 App(外观)/Perf(性能)，由页面单独处理
 */
export const PERIOD_FIELD = {
  km0:  { actual: 'actual0km', target: 'target0km', fail: 'fail',  supply: 'supply',  label: '0KM PPM',  targetDefault: 24 },
  km3:  { actual: 'actual3m',  target: 'target3m',  fail: 'fail3m', supply: 'supply3m', label: '3MIS PPM', targetDefault: 5 },
  km6:  { actual: 'actual6m',  target: 'target6m',  fail: 'fail6m', supply: 'supply6m', label: '6MIS PPM', targetDefault: 300 },
  km12: { actual: 'actual12m', target: 'target12m', fail: 'fail12m',supply: 'supply12m',label: '12MIS PPM',targetDefault: 105 },
}

/**
 * 取单个客户详情（含表格行）—— 保留供外部调用
 */
export function buildDetailTable(cust) {
  if (cust.isM6) {
    // M6 详情由 Pack/index.vue 内联渲染（外观/性能专用视图），返回空骨架避免报错
    return { recentWeeks: [], rows: [] }
  }
  const { metrics, weeks } = cust
  const recent = takeRecent(metrics.supply, weeks, 8, v => Number(v) > 0).map(r => r.week)
  const last = recent[recent.length - 1]
  const rows = [
    { name: '0KM-实际PPM', target: (metrics.target0km && metrics.target0km.values[last]) ?? 24,
      status: judgeStatus(Number((metrics.actual0km && metrics.actual0km.values[last]) || 0),
                          Number((metrics.target0km && metrics.target0km.values[last]) || 24)),
      weekly: recent.map(w => metrics.actual0km && metrics.actual0km.values[w]) },
    { name: '0KM-故障数', target: '—', status: 'primary',
      weekly: recent.map(w => metrics.fail && metrics.fail.values[w]) },
    { name: '3MIS-实际PPM', target: (metrics.target3m && metrics.target3m.values[last]) ?? 5,
      status: judgeStatus(Number((metrics.actual3m && metrics.actual3m.values[last]) || 0),
                          Number((metrics.target3m && metrics.target3m.values[last]) || 5)),
      weekly: recent.map(w => metrics.actual3m && metrics.actual3m.values[w]) },
    { name: '6MIS-实际PPM', target: (metrics.target6m && metrics.target6m.values[last]) ?? 300,
      status: judgeStatus(Number((metrics.actual6m && metrics.actual6m.values[last]) || 0),
                          Number((metrics.target6m && metrics.target6m.values[last]) || 300)),
      weekly: recent.map(w => metrics.actual6m && metrics.actual6m.values[w]) },
    { name: '12MIS-实际PPM', target: (metrics.target12m && metrics.target12m.values[last]) ?? 105,
      status: judgeStatus(Number((metrics.actual12m && metrics.actual12m.values[last]) || 0),
                          Number((metrics.target12m && metrics.target12m.values[last]) || 105)),
      weekly: recent.map(w => metrics.actual12m && metrics.actual12m.values[w]) },
  ]
  return { recentWeeks: recent, rows }
}
