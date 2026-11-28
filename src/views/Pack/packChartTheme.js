import { chartC, tooltipStyle, legendStyle, gridStyle } from '@/utils/chartTheme.js'

/**
 * Pack 页面图表通用底座（BaseChart 自动解析 var() 与主题重绘）
 */
export function packChartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: chartC.textMuted },
    legend: legendStyle(),
    grid: gridStyle(),
    tooltip: tooltipStyle({ trigger: 'axis' }),
  }
}
