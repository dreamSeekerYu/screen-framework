import { computed } from 'vue'
import { chartC, tooltipStyle, axisStyle, valueAxisStyle, chartPalette } from '@/utils/chartTheme.js'
import { packChartTheme } from '../packChartTheme.js'

/**
 * 问题与偏差分析：清单/结论/建议（由风险规则引擎产出）+ 两张图表
 * @param {object} ctx insight + M5/M6 客户引用
 */
export function usePackIssues({ insight, m5, m6 }) {
  const issueItems = computed(() => insight.value?.issueItems || [])
  const concludeItems = computed(() => insight.value?.concludeItems || [])
  const suggestions = computed(() => insight.value?.suggestions || [])

  const m5Conclusion = computed(() => {
    const c = concludeItems.value.find(x => x.name === (m5.value?.meta.name || 'M5客户'))
    return c?.text || '整体达标'
  })
  const m6Conclusion = computed(() => {
    const c = concludeItems.value.find(x => x.name === (m6.value?.meta.name || 'M6-XM客户'))
    if (!c) return '—'
    return `${c.text}。外观/性能PPM口径详见上方图表与数据表。`
  })

  /* ========== 问题分析页图表（数据由规则引擎产出，颜色随主题调色板） ========== */
  const issueTypeOption = computed(() => {
    const dist = insight.value?.issueTypeDist || []
    // 0KM异常/MIS趋势用语义色（超标/预警），其余类型走主题调色板（各主题自动适配）
    const palette = chartPalette()
    const colorOf = (name, i) => {
      if (name === '0KM异常') return chartC.danger
      if (name === 'MIS趋势') return chartC.warning
      return palette[(i + 2) % palette.length]
    }
    return {
      ...packChartTheme(),
      tooltip: tooltipStyle({ trigger: 'item' }),
      series: [{
        type: 'pie', radius: ['50%', '72%'], avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: chartC.cardBg, borderWidth: 2 },
        label: { show: true, formatter: '{b}: {d}%', color: chartC.textMuted, fontSize: 11 },
        data: dist.map((d, i) => ({ ...d, itemStyle: { color: colorOf(d.name, i) } })),
      }],
    }
  })

  const riskScoreOption = computed(() => {
    const scores = [...(insight.value?.riskScores || [])].sort((a, b) => a.score - b.score)
    // 语义色取色（勿用 primary-light：gov-red 主题下 primary-light 为红色，达标会显示成红条）
    const colorOf = (level) => level === 'success' ? chartC.success : (level === 'warning' ? chartC.warning : chartC.danger)
    return {
      ...packChartTheme(),
      tooltip: tooltipStyle(),
      grid: { left: '5%', right: '12%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: { ...valueAxisStyle(), type: 'value', max: 100, axisLabel: { ...valueAxisStyle().axisLabel, formatter: '{value}分' } },
      yAxis: { ...axisStyle(), type: 'category', data: scores.map(s => s.name) },
      series: [{
        type: 'bar', barWidth: 20,
        label: { show: true, position: 'right', formatter: '{c}分', color: chartC.textMuted },
        data: scores.map(s => ({ value: s.score, itemStyle: { color: colorOf(s.level), borderRadius: [0, 3, 3, 0] } })),
      }],
    }
  })

  return {
    issueItems,
    concludeItems,
    suggestions,
    m5Conclusion,
    m6Conclusion,
    issueTypeOption,
    riskScoreOption
  }
}
