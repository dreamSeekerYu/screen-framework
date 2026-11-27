import { ref } from 'vue'

/**
 * 问题条目 → 详情图表联动高亮（从 Pack 页下沉的通用能力）
 *
 * 用法：点击问题条目时 set({custKey, periodKey, week})，
 * 图表 option 里在「实际」曲线上挂 markPoint: markOf(custKey, periodKey, labels, values)，
 * 命中即在对应数据点上渲染 pin 标注（数值 = 该点真实值）。
 *
 * 需要按需注册 MarkPointComponent（src/utils/echarts.js 已注册）。
 *
 * @returns {{
 *   highlight: Ref<{custKey,periodKey,week}|null>,
 *   set: Function, clear: Function,
 *   markOf: Function,
 * }}
 */
export function useMarkPointLink() {
  const highlight = ref(null)

  function set(payload) { highlight.value = payload }
  function clear() { highlight.value = null }

  /**
   * 生成 markPoint 配置（未命中返回 undefined，避免污染 option）
   * @param {string} custKey   客户/主体 key
   * @param {string} periodKey 周期 key（km0/km3…）
   * @param {string[]} labels  当前窗口 X 轴标签
   * @param {number[]} values  「实际」曲线数据
   */
  function markOf(custKey, periodKey, labels, values, { fmt = (v) => String(v) } = {}) {
    const h = highlight.value
    if (!h || h.custKey !== custKey || h.periodKey !== periodKey) return undefined
    const idx = labels.indexOf(h.week)
    if (idx < 0 || !(values[idx] > 0)) return undefined
    return {
      symbol: 'pin',
      symbolSize: 44,
      itemStyle: { color: 'var(--color-danger)' },
      label: { show: true, formatter: fmt(values[idx]), color: '#fff', fontSize: 10 },
      data: [{ coord: [h.week, values[idx]] }],
    }
  }

  return { highlight, set, clear, markOf }
}
