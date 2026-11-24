/**
 * 图表统一样式主题（chartTheme）
 * ------------------------------------------------------------------
 * 全部图表（ECharts）的字体字号 / 轴 / 图例 / tooltip / 渐变等视觉规范
 * 以本文件为唯一来源，各页面只传业务数据与少量差异项，不再各自写样式。
 *
 * 返回值均为 CSS 变量字符串（var(--chart-xxx)）：
 *  - BaseChart 页面：无需处理，BaseChart 内部会调用 resolveCssVars 解析
 *  - 直接 echarts.init 的页面：setOption 前自行调用 resolveCssVars(option)
 */
import { getCssVar } from './color.js'

/* ============ 语义色别名（统一从这里取色，禁止页面内散落定义） ============ */
export const chartC = {
  // 文本
  text: 'var(--chart-text)',                // 正文文本
  textMuted: 'var(--chart-text-muted)',     // 次要文本（轴标签/图例）
  // 轴与分割线
  axisLine: 'var(--chart-axis-line)',
  splitLine: 'var(--chart-split-line)',
  empty: 'var(--chart-empty)',
  // tooltip
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  tooltipText: 'var(--chart-tooltip-text)',
  // 业务语义色（对齐组件库语义变量）
  primary: 'var(--color-primary)',
  primaryL: 'var(--color-primary-light)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  accent: 'var(--color-accent)',
  cardBg: 'var(--color-bg-card)',
}

/* ============ 系列调色板（来自主题 --chart-colors 逗号列表） ============ */
export function chartPalette() {
  const raw = getCssVar('--chart-colors', '#2f54eb,#1890ff,#13c2c2,#52c41a,#faad14,#f5222d,#9254de')
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}
/** 第 i 个系列的标准色（越界取模循环） */
export function paletteAt(i) {
  const p = chartPalette()
  return p[i % p.length]
}

/* ============ 字号规范（全局仅四档） ============ */
export const FONT = { axis: 11, legend: 11, label: 10, tooltip: 12 }

/* ============ 通用样式片段（均为函数，返回全新对象，页面可自由覆盖字段） ============ */

/** 数值/类目轴的通用样式（覆盖常用字段，页面可再展开定制） */
export const axisStyle = () => ({
  axisLine: { lineStyle: { color: chartC.axisLine, width: 1 } },
  axisTick: { show: false },
  axisLabel: { color: chartC.textMuted, fontSize: FONT.axis },
  splitLine: { show: false },
})

/** 值轴：默认隐藏轴线，显示虚线分割线 */
export const valueAxisStyle = (extra = {}) => ({
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: chartC.textMuted, fontSize: FONT.axis },
  splitLine: { lineStyle: { color: chartC.splitLine, type: 'dashed' } },
  ...extra,
})

/** 统一 tooltip：白卡圆角 + 主题描边 + 阴影 */
export const tooltipStyle = (extra = {}) => ({
  backgroundColor: chartC.tooltipBg,
  borderColor: chartC.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: chartC.tooltipText, fontSize: FONT.tooltip },
  extraCssText: 'box-shadow:0 8px 24px color-mix(in srgb, var(--color-primary) 12%, transparent);border-radius:10px;',
  ...extra,
})

/** 统一图例：小圆角矩形图标 + 次要文本色 */
export const legendStyle = (extra = {}) => ({
  textStyle: { color: chartC.textMuted, fontSize: FONT.legend },
  itemWidth: 14,
  itemHeight: 8,
  icon: 'roundRect',
  itemGap: 14,
  ...extra,
})

/** 统一 grid：留白适中，containLabel 自适应 */
export const gridStyle = (extra = {}) => ({
  top: 34, right: 16, bottom: 6, left: 8, containLabel: true,
  ...extra,
})

/** 柱状图标准渐变（顶部提亮 35% → 主题色） */
export const barGradient = (colorVar) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [
    { offset: 0, color: `color-mix(in srgb, ${colorVar} 72%, #ffffff)` },
    { offset: 1, color: colorVar },
  ],
})

/** 面积图标准渐变（顶部 25% 透明度 → 底部 2%） */
export const areaGradient = (colorVar, top = 25, bottom = 2) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [
    { offset: 0, color: `color-mix(in srgb, ${colorVar} ${top}%, transparent)` },
    { offset: 1, color: `color-mix(in srgb, ${colorVar} ${bottom}%, transparent)` },
  ],
})

/** 折线标准样式（宽度/圆点/描边统一） */
export const lineStyle = (colorVar, extra = {}) => ({
  color: colorVar, width: 2.5,
  ...extra,
})

/** 数值标签标准样式 */
export const labelStyle = (colorVar) => ({
  show: true, position: 'top', color: colorVar,
  fontSize: FONT.label, fontWeight: 700,
})

/** 饼图/环形图通用 itemStyle（圆角扇区 + 卡片底描边） */
export const pieItemStyle = (borderWidth = 2) => ({
  borderRadius: 6,
  borderColor: chartC.cardBg,
  borderWidth,
})

/** 饼图外部标签标准样式（名称/数值/百分比三行 rich） */
export const pieLabelRich = () => ({
  show: true, position: 'outside',
  formatter: p => [`{name|${p.name}}{val|${p.value}}`, `{pct|${p.percent}%}`].join('\n'),
  rich: {
    name: { fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 600, lineHeight: 16 },
    val: { fontSize: 11, color: chartC.textMuted, lineHeight: 15 },
    pct: { fontSize: 11, color: 'var(--color-text-primary)', fontWeight: 700 },
  },
})
