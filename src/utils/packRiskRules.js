/**
 * PACK 客户质量风险规则引擎
 *
 * 目标：把 /pack 页面「问题与偏差分析」「总览 KPI 副标题」「雷达图」「风险评级」
 *       中原先硬编码的文案与数值，全部改为由 parsePack() 解析出的真实数据推导生成。
 *       Excel 数据更新后，问题清单 / 结论 / 建议 / 评分自动跟着变化。
 *
 * 规则口径：
 *  - 超标事件：某客户某周期「窗口内 PPM 峰值 > 目标」→ 事件，严重度按 超标倍数(ratio) 分级
 *      ratio >= 3        → danger  高风险
 *      1 < ratio < 3     → warning 中风险（超标）
 *  - 趋势预警事件：峰值未超目标，但最近 8 个有数周呈明显上升趋势
 *      （末值 > 首值 × 1.5 且末值 > 目标 × 0.5）→ info 预警
 *  - 客户风险评分：基准 100 分，按事件扣分（超标事件按倍数扣、预警事件小额扣），下限 30
 *  - 雷达图各维度得分 = min(100, 目标/实际 × 100)，无数据视为 100（达标）
 */

import { takeRecentOf } from './parsePack.js'

/** 周期 key → 展示名 */
const PERIOD_LABEL = { km0: '0KM', km3: '3MIS', km6: '6MIS', km12: '12MIS' }

/* ---------------- 工具 ---------------- */

export function fmtNum(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return 0
  const n = Number(v)
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n)
  return Number(n.toFixed(1))
}

/** 事件严重度 */
function severityOf(ratio) {
  if (ratio >= 3) return 'danger'
  return 'warning'
}

/** 事件问题类型归类（用于饼图与建议模板） */
function classifyEvent(cust, periodKey) {
  if (cust.isM6) return periodKey === 'km0' ? '外观问题' : '性能问题'
  if (periodKey === 'km0') return '0KM异常'
  return 'MIS趋势'
}

/* ---------------- 事件扫描 ---------------- */

/** 超标事件：窗口峰值 > 目标 */
function scanOverEvents(cust) {
  const events = []
  const periods = cust.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
  for (const pk of periods) {
    const k = cust.kpi[pk]
    if (!k || !k.target || k.ppm <= k.target) continue
    const ratio = +(k.ppm / k.target).toFixed(1)
    events.push({
      key: `${cust.key}-${pk}`,
      custKey: cust.key,
      customer: cust.meta.name,
      periodKey: pk,
      period: PERIOD_LABEL[pk] || pk,
      week: k.peakWeek || '',
      ppm: k.ppm,
      target: k.target,
      ratio,
      fail: k.fail,
      supply: k.supply,
      severity: severityOf(ratio),
      kind: 'over',
      type: classifyEvent(cust, pk),
    })
  }
  return events
}

/** 趋势预警事件：未超标但持续上升 */
function scanTrendEvents(cust) {
  const events = []
  const periods = cust.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
  for (const pk of periods) {
    const k = cust.kpi[pk]
    if (!k || !k.target || k.ppm > k.target) continue // 已超标的不重复报
    const field = cust.isM6
      ? (pk === 'km0' ? 'ppmApp' : 'ppmPerf')
      : { km0: 'actual0km', km3: 'actual3m', km6: 'actual6m', km12: 'actual12m' }[pk]
    const metric = cust.metrics[field]
    if (!metric) continue
    const recent = takeRecentOf(metric, cust.weeks, 8, v => Number(v) > 0)
    if (recent.length < 3) continue
    const first = recent[0].value
    const last = recent[recent.length - 1].value
    if (first > 0 && last > first * 1.5 && last > k.target * 0.5) {
      events.push({
        key: `${cust.key}-${pk}-trend`,
        custKey: cust.key,
        customer: cust.meta.name,
        periodKey: pk,
        period: PERIOD_LABEL[pk] || pk,
        week: recent[recent.length - 1].week,
        ppm: last,
        target: k.target,
        ratio: +(last / k.target).toFixed(1),
        severity: 'info',
        kind: 'trend',
        type: classifyEvent(cust, pk),
      })
    }
  }
  return events
}

/* ---------------- 风险评分 ---------------- */

/** 单客户风险评分：100 起步按事件扣分，下限 30 */
export function calcRiskScore(cust) {
  const events = [...scanOverEvents(cust), ...scanTrendEvents(cust)]
  let score = 100
  for (const e of events) {
    if (e.kind === 'over') {
      score -= Math.min(40, 8 + e.ratio * 4)
    } else {
      score -= 6
    }
  }
  return Math.max(30, Math.round(score))
}

/** 评分 → 风险等级 */
export function riskLevelOf(score) {
  if (score >= 85) return { level: 'success', text: '达标' }
  if (score >= 70) return { level: 'warning', text: '关注' }
  return { level: 'danger', text: '高风险' }
}

/** 汇总全部客户 → 事件总表（按严重度排序） */
export function scanAllEvents(customers = []) {
  const all = []
  for (const c of customers) {
    all.push(...scanOverEvents(c), ...scanTrendEvents(c))
  }
  const order = { danger: 0, warning: 1, info: 2 }
  return all.sort((a, b) => order[a.severity] - order[b.severity] || b.ratio - a.ratio)
}

/* ---------------- 文案生成 ---------------- */

/** 事件 → 问题清单条目 */
function eventToIssue(e) {
  const sevText = e.severity === 'danger' ? '高风险' : (e.severity === 'warning' ? '中风险' : '预警')
  let desc
  if (e.kind === 'over') {
    desc = `${e.period}窗口内PPM峰值 ${fmtNum(e.ppm)}（${e.week || '—'}），超过目标 ${e.target}PPM 的 ${e.ratio} 倍` +
      `，窗口累计故障 ${e.fail} 例 / 供货 ${fmtNum(e.supply)}。`
  } else {
    desc = `${e.period}PPM呈持续上升趋势，最新 ${fmtNum(e.ppm)}（${e.week || '—'}），已接近目标 ${e.target}PPM，需提前预警。`
  }
  return {
    statusType: e.severity === 'info' ? 'warn' : (e.severity === 'warning' ? 'warn' : 'fail'),
    statusText: sevText,
    severity: e.severity,
    title: `${e.customer} ${e.week || e.period} ${e.period} PPM${e.kind === 'over' ? '超标' : '趋势预警'}`,
    desc,
    period: e.week || e.period,
    product: e.custKey,
    // 联动定位字段：点击问题条目 → 跳转客户详情并在图表 markPoint 高亮该周期
    custKey: e.custKey,
    periodKey: e.periodKey,
    week: e.week,
    type: e.type,
  }
}

/** 事件 → 改进建议（按类型套模板，带真实数值） */
function eventToSuggestion(e) {
  const map = {
    '0KM异常':  { color: 'no-orange', text: `针对${e.customer} 0KM异常（峰值${fmtNum(e.ppm)}PPM/目标${e.target}）开展根因排查，量产爬坡期增加巡检频次` },
    'MIS趋势':  { color: 'no-red',    text: `重点跟踪${e.customer} ${e.period}PPM上升趋势（当前${fmtNum(e.ppm)}/目标${e.target}），提前开展质量排查遏制恶化` },
    '外观问题': { color: 'no-orange', text: `针对${e.customer}外观PPM超标（${fmtNum(e.ppm)}PPM/目标${e.target}）开展专项分析，加强出厂外观检验环节` },
    '性能问题': { color: 'no-blue',   text: `针对${e.customer}性能PPM异常（${fmtNum(e.ppm)}PPM/目标${e.target}）复核测试与包装防护环节` },
  }
  return map[e.type] || { color: 'no-blue', text: `跟踪${e.customer} ${e.period}质量表现（当前${fmtNum(e.ppm)}PPM/目标${e.target}）` }
}

/** 全局派生数据入口 */
export function buildPackInsight(customers = []) {
  const events = scanAllEvents(customers)

  /* 顶部 KPI 全局峰值（含目标与倍数，供副标题/状态色动态生成） */
  const peakOf = (periodKey) => {
    let peak = 0, owner = null
    for (const c of customers) {
      if (c.isM6) continue
      const k = c.kpi[periodKey]
      if (k && k.ppm > peak) {
        peak = k.ppm
        owner = { key: c.key, name: c.meta.name, week: k.peakWeek, target: k.target, ratio: k.target ? +(k.ppm / k.target).toFixed(1) : 0 }
      }
    }
    return { value: Math.round(peak), owner }
  }
  const peaks = { km0: peakOf('km0'), km3: peakOf('km3'), km12: peakOf('km12') }

  /* 客户风险评分与等级 */
  const riskScores = customers.map(c => {
    const score = calcRiskScore(c)
    return { custKey: c.key, name: c.meta.name, score, ...riskLevelOf(score), isM6: c.isM6 }
  })

  /* 问题清单（事件 → 条目） */
  const issueItems = events.map(eventToIssue)

  /* 问题类型分布（饼图） */
  const typeCount = {}
  for (const e of events) typeCount[e.type] = (typeCount[e.type] || 0) + 1
  const issueTypeDist = Object.keys(typeCount).map(name => ({ name, value: typeCount[name] }))

  /* 改进建议：按前 3 个事件生成 + 2 条常态建议（标杆推广 / 物流防护） */
  const suggestions = events.slice(0, 3).map(eventToSuggestion)
  const hasBest = customers.some(c => riskScores.find(r => r.custKey === c.key)?.level === 'success')
  if (hasBest) suggestions.push({ color: 'no-green', text: `总结达标客户（${riskScores.filter(r => r.level === 'success').map(r => r.name).join('、')}）质量管控经验，形成最佳实践推广` })
  suggestions.push({ color: 'no-green', text: '加强物流环节质量防护，与物流方明确质量责任划分标准' })

  /* 各客户达标结论（按 KPI 状态自动生成） */
  const concludeItems = customers.map(c => {
    const periods = c.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
    const okList = [], badList = []
    periods.forEach(pk => {
      const k = c.kpi[pk]
      const label = c.isM6 ? k.label : PERIOD_LABEL[pk] + ' PPM'
      if (!k.target) return
      if (k.ppm <= k.target) okList.push(label)
      else badList.push(`${label} ${fmtNum(k.ppm)}（目标${k.target}）`)
    })
    const score = riskScores.find(r => r.custKey === c.key)
    const lv = score ? riskLevelOf(score.score) : { level: 'success' }
    let text
    if (badList.length) {
      text = `${okList.length ? okList.join('、') + '达标；' : ''}${badList.join('、')}超标，需重点跟踪`
    } else {
      const trendEv = events.find(e => e.custKey === c.key && e.kind === 'trend')
      text = `${okList.join('、')}均达标${trendEv ? `；${trendEv.period}呈上升趋势需预警` : '，质量表现稳定'}`
    }
    const border = lv.level === 'success' ? 'border-green' : (lv.level === 'warning' ? 'border-orange' : 'border-red')
    const titleColor = lv.level === 'success' ? 'text-green' : (lv.level === 'warning' ? 'text-orange' : 'text-red')
    return { name: c.meta.name, text, modifier: border, titleColor, score: score?.score }
  })

  /* 雷达图：各客户各周期得分（目标/实际），趋势稳定性=近期达标周占比 */
  const periodScore = (c, pk) => {
    const k = c.kpi[pk]
    if (!k || !k.target) return 100
    if (k.ppm <= 0) return 100
    return Math.min(100, Math.round((k.target / k.ppm) * 100))
  }
  const stabilityScore = (c) => {
    const field = c.isM6 ? 'ppmApp' : 'actual0km'
    const target = c.isM6 ? (c.kpi.km0.target || 300) : (c.kpi.km0.target || 24)
    const metric = c.metrics[field]
    if (!metric) return 100
    const recent = takeRecentOf(metric, c.weeks, 8, v => Number(v) > 0)
    if (!recent.length) return 100
    const ok = recent.filter(r => r.value <= target).length
    return Math.round((ok / recent.length) * 100)
  }
  const radarOf = (c) => {
    if (c.isM6) {
      // M6 只有外观/性能两维，其余维度取 M5（同属A4）或视为达标
      return [periodScore(c, 'km0'), 100, 100, 100, stabilityScore(c)]
    }
    return [periodScore(c, 'km0'), periodScore(c, 'km3'), periodScore(c, 'km6'), periodScore(c, 'km12'), stabilityScore(c)]
  }
  const radarIndicators = [
    { name: '0KM达标率', max: 100 }, { name: '3MIS达标率', max: 100 },
    { name: '6MIS达标率', max: 100 }, { name: '12MIS达标率', max: 100 }, { name: '趋势稳定性', max: 100 },
  ]

  return { events, peaks, riskScores, issueItems, issueTypeDist, suggestions, concludeItems, radarOf, radarIndicators }
}
