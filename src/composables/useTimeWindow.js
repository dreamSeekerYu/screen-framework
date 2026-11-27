import { ref } from 'vue'

/**
 * 详情图表时间窗口（从 Pack 页下沉的通用能力）
 *
 * 提供统一的窗口定义与标签裁剪：
 *   w4 / w12 → 周粒度最近 N 个自然周（数据层应裁掉尾部无数据周，保证时间轴连续真实）
 *   month    → 月粒度标签
 *   all      → 月 + 全部周
 *
 * @param {Object} [opts]
 * @param {string} [opts.defaultWindow='w12']
 * @param {Array}  [opts.tabs]             自定义窗口项 [{key,label}]
 * @returns {{ timeWindow: Ref<string>, WINDOW_TABS: Array, windowLabels: Function }}
 */
const DEFAULT_TABS = [
  { key: 'w4', label: '近4周' },
  { key: 'w12', label: '近12周' },
  { key: 'month', label: '月度' },
  { key: 'all', label: '全部' },
]

export function useTimeWindow({ defaultWindow = 'w12', tabs } = {}) {
  const timeWindow = ref(defaultWindow)
  const WINDOW_TABS = tabs || DEFAULT_TABS

  /**
   * 按窗口裁剪标签序列
   * @param {{weeks?: string[], months?: string[]}} cust 含 weeks/months 的数据对象
   * @param {string} [w] 窗口 key，缺省用当前 state
   */
  function windowLabels(cust, w = timeWindow.value) {
    if (!cust) return []
    const wk = (cust.weeks || []).filter(x => /WK\d+/.test(x))
    if (w === 'month') return [...(cust.months || [])]
    if (w === 'all') return [...(cust.months || []), ...wk]
    const n = w === 'w4' ? 4 : 12
    return wk.slice(-n)
  }

  return { timeWindow, WINDOW_TABS, windowLabels }
}
