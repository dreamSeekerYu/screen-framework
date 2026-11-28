import { computed } from 'vue'
import { PERIOD_FIELD } from '@/utils/parsePack.js'
import { fmtNum } from '@/utils/packRiskRules.js'
import { chartC, legendStyle, axisStyle, valueAxisStyle } from '@/utils/chartTheme.js'
import { packChartTheme } from '../packChartTheme.js'

/** A 型客户的四个周期 */
export const A_PERIODS = [
  { key: 'km0',  title: '集成0KM表现' },
  { key: 'km3',  title: '集成3MIS表现' },
  { key: 'km6',  title: '集成6MIS表现' },
  { key: 'km12', title: '集成12MIS表现' },
]

/**
 * 客户详情分析：A 型客户 / M5 / M6 的图表与数据表
 * @param {object} ctx 客户响应式引用、时间窗口、markPoint 联动工具
 */
export function usePackDetail({ m5, m6, currentA, timeWindow, windowLabels, highlightMark }) {
  const fmt = (v) => fmtNum(v)

  function takeRecentWeeks(cust, n = 5) {
    return (cust.weeks || []).filter(w => /WK\d+/.test(w)).slice(-n)
  }
  function detailWeeks(cust) {
    return takeRecentWeeks(cust, 5)
  }

  /** 每个周期两行：PPM 实际（带目标/状态判定）+ 故障数 */
  function detailRows(cust) {
    if (!cust) return []
    const wks = detailWeeks(cust)
    const getM = (key) => cust.metrics[key]?.values || {}
    const periods = [
      { name: '0KM',  actual: 'actual0km',  fail: 'fail',    target: cust.kpi.km0.target || 24 },
      { name: '3MIS', actual: 'actual3m',   fail: 'fail3m',  target: cust.kpi.km3.target || 5 },
      { name: '6MIS', actual: 'actual6m',   fail: 'fail6m',  target: cust.kpi.km6.target || 300 },
      { name: '12MIS',actual: 'actual12m',  fail: 'fail12m', target: cust.kpi.km12.target || 105 },
    ]
    const rows = []
    for (const p of periods) {
      const ppmWeekly = wks.map(w => Number(getM(p.actual)[w] ?? 0))
      const overCount = ppmWeekly.filter(v => v > p.target).length
      rows.push({ name: `${p.name}-实际PPM`, weekly: ppmWeekly, target: p.target, isPpm: true,
        status: overCount ? 'danger' : 'success', statusText: overCount ? `超标${overCount}周` : '达标' })
      const failWeekly = wks.map(w => Number(getM(p.fail)[w] ?? 0))
      const failTotal = failWeekly.reduce((a, b) => a + b, 0)
      rows.push({ name: `${p.name}-故障数`, weekly: failWeekly, target: '—', isPpm: false,
        status: 'primary', statusText: failTotal ? `共${failTotal}例` : '—' })
    }
    return rows
  }

  /* ========== A 型详情：四周期图表（时间窗口可切换，纵轴上限由数据计算） ========== */
  function periodOption(cust, pKey) {
    const f = PERIOD_FIELD[pKey]
    const allLabels = windowLabels(cust, timeWindow.value)
    const get = (field) => allLabels.map(l => Number(cust.metrics[field]?.values[l] ?? 0))
    const supplyArr = get(f.supply)
    const failArr = get(f.fail)
    const targetArr = allLabels.map(l => Number(cust.metrics[f.target]?.values[l] ?? f.targetDefault))
    const actualArr = get(f.actual)
    const peak = Math.max(...actualArr, ...targetArr, 1)
    const rotate = allLabels.length > 14 ? 45 : 0
    return {
      ...packChartTheme(),
      legend: legendStyle({ data: ['供货数', '故障数', `${f.label}目标`, `${f.label}实际`], top: 0 }),
      xAxis: { ...axisStyle(), type: 'category', data: allLabels, axisLabel: { ...axisStyle().axisLabel, rotate, fontSize: 9 } },
      yAxis: [
        { ...valueAxisStyle(), type: 'value', name: '供货数', position: 'left' },
        { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
      ],
      series: [
        { name: '供货数', type: 'bar', data: supplyArr, yAxisIndex: 0, itemStyle: { color: chartC.primary } },
        { name: '故障数', type: 'bar', data: failArr, yAxisIndex: 0, itemStyle: { color: chartC.danger } },
        { name: `${f.label}目标`, type: 'line', data: targetArr, yAxisIndex: 1, lineStyle: { color: chartC.primaryL, width: 2 }, symbol: 'none' },
        { name: `${f.label}实际`, type: 'line', data: actualArr, yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 6,
          markPoint: highlightMark(cust.key, pKey, allLabels, actualArr) },
      ],
    }
  }

  /* 当前 A 型客户的数据（供子组件直接消费） */
  const currentAWeeks = computed(() => currentA.value ? detailWeeks(currentA.value) : [])
  const currentARows = computed(() => detailRows(currentA.value))
  const currentACharts = computed(() => currentA.value
    ? A_PERIODS.map(p => ({ ...p, option: periodOption(currentA.value, p.key) }))
    : [])

  /* ========== M5 详情 ========== */
  const m5ChartOption = computed(() => {
    if (!m5.value) return {}
    const mm = m5.value.metrics
    const target = m5.value.kpi.km0.target || 15
    const periods = windowLabels(m5.value, timeWindow.value)
    const get = (k) => periods.map(p => Number(mm[k]?.values[p] ?? 0))
    const peak = Math.max(...get('actual0km'), target, 1)
    return {
      ...packChartTheme(),
      legend: legendStyle({ data: ['供货数', '故障数', '0KM目标', '0KM实际'], top: 0 }),
      xAxis: { ...axisStyle(), type: 'category', data: periods },
      yAxis: [
        { ...valueAxisStyle(), type: 'value', name: '供货数', position: 'left' },
        { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
      ],
      series: [
        { name: '供货数', type: 'bar', data: get('supply'), yAxisIndex: 0, itemStyle: { color: chartC.primary } },
        { name: '故障数', type: 'bar', data: get('fail'), yAxisIndex: 0, itemStyle: { color: chartC.danger } },
        { name: '0KM目标', type: 'line', data: periods.map(() => target), yAxisIndex: 1, lineStyle: { color: chartC.primaryL, width: 2 }, symbol: 'none' },
        { name: '0KM实际', type: 'line', data: get('actual0km'), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 8,
          markPoint: highlightMark('M5', 'km0', periods, get('actual0km')) },
      ],
    }
  })

  const m5Rows = computed(() => {
    if (!m5.value) return []
    const rows = []
    const winTarget = m5.value.kpi.km0.target || 15
    const periods = [
      { key: (m5.value.months || []).slice(-1)[0] || '—', type: 'month' },
      ...takeRecentWeeks(m5.value, 5).map(w => ({ key: w, type: 'week' })),
    ]
    const m = m5.value.metrics
    periods.forEach(p => {
      const fail = m.fail.values[p.key] ?? 0
      const supply = m.supply.values[p.key] ?? 0
      const ppm = m.actual0km.values[p.key] ?? 0
      const target = Number(m.target0km.values[p.key] ?? winTarget) || winTarget
      const over = ppm > target
      rows.push({
        period: p.key, fail, supply, ppm: fmt(ppm), target,
        ppmColor: over ? (ppm >= target * 15 ? 'text-red font' : 'text-orange') : 'text-green',
        status: over ? 'fail' : 'pass', statusText: over ? '超标' : '达标',
      })
    })
    return rows
  })

  /* ========== M6 详情 ========== */
  const m6ChartOption = computed(() => {
    if (!m6.value) return {}
    const labels = windowLabels(m6.value, timeWindow.value)
    const mm = m6.value.metrics
    const get = (k) => labels.map(l => Number(mm[k]?.values[l] ?? 0))
    const tApp = m6.value.kpi.km0.target || 300
    const tPerf = m6.value.kpi.km3.target || 150
    const peak = Math.max(...get('ppmApp'), ...get('ppmPerf'), tApp, tPerf, 1)
    return {
      ...packChartTheme(),
      legend: legendStyle({ data: ['周交付', 'PPM-外观', 'PPM-性能', '目标-外观', '目标-性能'], top: 0 }),
      xAxis: { ...axisStyle(), type: 'category', data: labels },
      yAxis: [
        { ...valueAxisStyle(), type: 'value', name: '交付量', position: 'left' },
        { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
      ],
      series: [
        { name: '周交付', type: 'bar', data: get('delivery'), yAxisIndex: 0, itemStyle: { color: chartC.accent } },
        { name: 'PPM-外观', type: 'line', data: get('ppmApp'), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 8,
          markPoint: highlightMark('M6', 'km0', labels, get('ppmApp')) },
        { name: 'PPM-性能', type: 'line', data: get('ppmPerf'), yAxisIndex: 1, lineStyle: { color: chartC.warning, width: 2 }, symbolSize: 8,
          markPoint: highlightMark('M6', 'km3', labels, get('ppmPerf')) },
        { name: '目标-外观', type: 'line', data: labels.map(() => tApp), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 1, type: 'dashed' }, symbol: 'none' },
        { name: '目标-性能', type: 'line', data: labels.map(() => tPerf), yAxisIndex: 1, lineStyle: { color: chartC.warning, width: 1, type: 'dashed' }, symbol: 'none' },
      ],
    }
  })

  const m6TableHeaders = computed(() => {
    if (!m6.value) return []
    return [...(m6.value.months || []), ...(m6.value.weeks || [])]
  })

  const m6TableRows = computed(() => {
    if (!m6.value) return []
    const headers = m6TableHeaders.value
    const mm = m6.value.metrics
    const getV = (metric, h) => mm[metric]?.values[h] ?? 0
    const colorOf = (v, target) => {
      if (Number(v) === 0) return ''
      if (Number(v) > target) return 'text-red font'
      if (Number(v) > target * 0.5) return 'text-orange'
      return 'text-green'
    }
    const targetApp = m6.value.kpi.km0.target || 300
    const targetPerf = m6.value.kpi.km3.target || 150
    return [
      { name: '0KM-外观故障数', values: headers.map(h => getV('failApp', h)), color: headers.map(h => Number(getV('failApp', h)) > 0 ? 'text-red' : '') },
      { name: '0KM-性能故障数', values: headers.map(h => getV('failPerf', h)), color: headers.map(h => Number(getV('failPerf', h)) > 0 ? 'text-red' : '') },
      { name: '周交付量', values: headers.map(h => getV('delivery', h)), color: headers.map(() => 'text-blue font') },
      { name: '外观PPM', values: headers.map(h => fmt(getV('ppmApp', h))), color: headers.map(h => colorOf(getV('ppmApp', h), targetApp)) },
      { name: '性能PPM', values: headers.map(h => fmt(getV('ppmPerf', h))), color: headers.map(h => colorOf(getV('ppmPerf', h), targetPerf)) },
    ]
  })

  const m6PeakDelivery = computed(() => {
    if (!m6.value) return { value: 0, week: '' }
    let max = 0, mw = ''
    const d = m6.value.metrics.delivery?.values || {}
    Object.keys(d).forEach(w => { if (Number(d[w]) > max) { max = Number(d[w]); mw = w } })
    return { value: max, week: mw }
  })

  return {
    A_PERIODS,
    takeRecentWeeks,
    detailWeeks,
    detailRows,
    periodOption,
    currentAWeeks,
    currentARows,
    currentACharts,
    m5ChartOption,
    m5Rows,
    m6ChartOption,
    m6TableHeaders,
    m6TableRows,
    m6PeakDelivery
  }
}
