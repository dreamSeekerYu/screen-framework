/**
 * Pack 页面展示层的小工具（纯函数，放在 composable 与子组件之间共享）
 */

/** 达标状态 → 文本颜色 class */
export function statusColor(s) {
  return s === 'success' ? 'text-green' : (s === 'warning' ? 'text-orange' : (s === 'danger' ? 'text-red' : 'text-blue'))
}

/** 单元格配色：PPM 行按 目标/实际 分档，故障行非零标红 */
export function valColor(row, v) {
  const n = Number(v) || 0
  if (!row.isPpm) return n > 0 ? 'text-red font' : ''
  if (n > row.target) return 'text-red font'
  if (n > row.target * 0.5) return 'text-orange'
  if (n > 0) return 'text-green'
  return ''
}

/** 表格数值格式化 */
export { fmtNum as formatVal } from '@/utils/packRiskRules.js'
