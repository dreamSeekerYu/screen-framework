import { computed } from 'vue'
import { fmtNum, riskLevelOf } from '@/utils/packRiskRules.js'
import { chartC, tooltipStyle, legendStyle, axisStyle, valueAxisStyle } from '@/utils/chartTheme.js'
import { packChartTheme } from '../packChartTheme.js'
import { statusColor } from '../packFormat.js'

/**
 * 总览仪表盘：KPI 行、客户健康度矩阵、趋势/雷达图
 * @param {object} ctx 由 usePackData() 提供的响应式引用
 */
export function usePackOverview({ packData, insight, a1, a2, a3, m5, m6, riskOf }) {
  const fmt = (v) => fmtNum(v)

  /* ========== KPI 行（副标题动态生成，消除写死文案） ========== */
  const overviewKpis = computed(() => {
    if (!insight.value) return []
    const peaks = insight.value.peaks
    const kpiOf = (peak, title) => {
      const o = peak.owner
      let status = 'success'
      let sub = '窗口内无超标记录'
      if (o && o.target && peak.value > o.target) {
        status = o.ratio >= 3 ? 'danger' : 'warning'
        sub = `⚡ ${o.name} ${o.week || ''} 超目标${o.ratio}倍`
      } else if (o) {
        sub = `峰值出现在 ${o.name} ${o.week || ''}，未超目标`
      }
      return { title, value: peak.value, sub, status }
    }
    // 需关注客户数由规则引擎评分推导（不再使用写死的 meta.status）
    const focusCount = insight.value.riskScores.filter(r => r.level !== 'success').length
    return [
      { title: '监控客户数量', value: packData.totalCustomers,
        sub: focusCount ? `${focusCount} 家客户需关注` : '全部客户达标',
        status: focusCount ? 'warning' : 'success' },
      kpiOf(peaks.km0, '0KM PPM峰值'),
      kpiOf(peaks.km3, '3MIS PPM峰值'),
      kpiOf(peaks.km12, '12MIS PPM峰值'),
    ]
  })

  /* ========== 客户概览卡片（健康度矩阵） ========== */

  /** 0KM PPM sparkline（SVG 折线，归一化到 100×26 视口） */
  function sparkOf(cust) {
    if (!cust) return { points: '0,24 100,24', color: 'success' }
    const field = cust.isM6 ? 'ppmApp' : 'actual0km'
    const labels = [...(cust.months || []), ...(cust.weeks || []).filter(w => /WK\d+/.test(w))]
    const m = cust.metrics[field]
    const vals = labels.map(l => Number(m?.values?.[l] ?? 0))
    const max = Math.max(...vals, 1)
    const n = vals.length
    const pts = n === 0
      ? '0,24 100,24'
      : vals.map((v, i) => `${n === 1 ? 50 : (i / (n - 1)) * 100},${24 - (v / max) * 20}`).join(' ')
    const target = cust.kpi.km0.target || 0
    const last = vals[vals.length - 1] || 0
    const color = target && last > target ? 'danger' : (target && last > target * 0.5 ? 'warning' : 'success')
    return { points: pts, color }
  }

  function buildACard(c) {
    const k = c.kpi
    const risk = riskOf(c.key)
    const periods = c.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
    const metrics = periods.map(pk => {
      const item = k[pk]
      const lbl = c.isM6 ? item.label : ({ km0: '0KM PPM', km3: '3MIS PPM', km6: '6MIS PPM', km12: '12MIS PPM' }[pk])
      const over = item.target && item.ppm > item.target
      const value = item.ppm <= 0
        ? '0 达标'
        : `${fmt(item.ppm)}${item.peakWeek ? ' (' + item.peakWeek + ')' : ''}${!over ? ' 达标' : ''}`
      return { label: lbl, value, colorClass: over ? 'text-red' : statusColor(item.status) }
    })
    const spark = sparkOf(c)
    return {
      key: c.key,
      name: c.meta.name,
      riskLevel: risk.level,
      riskText: `${risk.text} · ${risk.score}分`,
      metrics,
      passRate: c.passRate,
      ringColor: risk.level,
      sparkPoints: spark.points,
      sparkColor: spark.color,
      remark: `${c.passRate}% 周期达标${risk.level !== 'success' ? '，存在超标周期需关注' : '，整体表现稳定'}`,
    }
  }

  const overviewCards = computed(() => {
    if (!insight.value) return []
    const cards = [a1.value, a2.value, a3.value].filter(Boolean).map(c => buildACard(c))
    // A4 合并卡（M5 + M6）：风险分 = 两者均值
    if (m5.value && m6.value) {
      const base = buildACard(m5.value)
      const s5 = riskOf('M5').score, s6 = riskOf('M6').score
      const avg = Math.round((s5 + s6) / 2)
      const lv = riskLevelOf(avg)
      const passRate = Math.round((m5.value.passRate + m6.value.passRate) / 2)
      cards.push({
        ...base,
        key: 'A4',
        name: 'A4客户',
        riskLevel: lv.level,
        riskText: `${lv.text} · ${avg}分`,
        ringColor: lv.level,
        metrics: [
          { label: 'M5 0KM PPM峰值', value: `${fmt(m5.value.kpi.km0.ppm)}${m5.value.kpi.km0.peakWeek ? ' (' + m5.value.kpi.km0.peakWeek + ')' : ''}`, colorClass: m5.value.kpi.km0.status === 'success' ? 'text-green' : 'text-orange' },
          { label: 'M6 外观PPM峰值', value: `${fmt(m6.value.kpi.km0.ppm)}${m6.value.kpi.km0.peakWeek ? ' (' + m6.value.kpi.km0.peakWeek + ')' : ''}`, colorClass: m6.value.kpi.km0.status === 'success' ? 'text-green' : 'text-red' },
          { label: 'M6 性能PPM峰值', value: `${fmt(m6.value.kpi.km3.ppm)}${m6.value.kpi.km3.status === 'success' ? ' 达标' : ''}`, colorClass: m6.value.kpi.km3.status === 'success' ? 'text-green' : 'text-red' },
        ],
        passRate,
        remark: `M5达标率${m5.value.passRate}% · M6达标率${m6.value.passRate}%（合并均值${passRate}%）`,
      })
    }
    return cards
  })

  /* ========== 总览：0KM 趋势对比（时间轴由数据推导，不再写死） ========== */
  const overviewTrendOption = computed(() => {
    const list = [a1.value, a2.value, a3.value, m5.value].filter(Boolean)
    if (!list.length || !m6.value) return {}
    // 月份取各客户并集（保持时间顺序），周取最近 5 个
    const months = [...new Set(list.flatMap(c => c.months || []))]
    const weeks = [...new Set(list.flatMap(c => c.weeks || []))].slice(-5)
    const labels = [...months, ...weeks]
    const seriesOf = (cust, field) => labels.map(l => Number(cust.metrics[field]?.values[l] ?? 0))
    const mk = (name, data) => ({ name, type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 6 })
    return {
      ...packChartTheme(),
      legend: legendStyle({ data: ['A1', 'A2', 'A3', 'M5-XP', 'M6-XM外观'], top: 0 }),
      xAxis: { ...axisStyle(), type: 'category', data: labels },
      yAxis: { ...valueAxisStyle(), type: 'value', name: 'PPM' },
      series: [
        mk('A1', seriesOf(a1.value, 'actual0km')),
        mk('A2', seriesOf(a2.value, 'actual0km')),
        mk('A3', seriesOf(a3.value, 'actual0km')),
        mk('M5-XP', seriesOf(m5.value, 'actual0km')),
        mk('M6-XM外观', seriesOf(m6.value, 'ppmApp')),
      ],
    }
  })

  /* ========== 总览：雷达图（各维度得分由目标/实际实时计算） ========== */
  const overviewRadarOption = computed(() => {
    if (!insight.value || !a1.value) return {}
    const { radarOf, radarIndicators } = insight.value
    const mk = (name, cust) => ({ value: radarOf(cust), name, areaStyle: { opacity: 0.1 } })
    return {
      ...packChartTheme(),
      tooltip: tooltipStyle({ trigger: 'item' }),
      legend: legendStyle({ data: ['A1', 'A2', 'A3', 'A4'], top: 0 }),
      radar: {
        indicator: radarIndicators,
        axisName: { color: chartC.textMuted },
        splitArea: { areaStyle: { color: ['color-mix(in srgb, var(--color-primary) 2%, transparent)', 'color-mix(in srgb, var(--color-primary) 5%, transparent)'] } },
        axisLine: { lineStyle: { color: chartC.axisLine } },
      },
      series: [{
        type: 'radar',
        data: [
          mk('A1', a1.value),
          mk('A2', a2.value),
          mk('A3', a3.value),
          mk('A4', m5.value),
        ].filter(d => d.value),
      }],
    }
  })

  return {
    overviewKpis,
    overviewCards,
    overviewTrendOption,
    overviewRadarOption
  }
}
