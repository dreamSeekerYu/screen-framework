import { ref, onUnmounted } from 'vue'

/**
 * 投屏轮播（从 Pack 页下沉的通用能力）
 *
 * 页面只需提供「下一步」逻辑 tick()（如：总览 → 逐客户详情 → 问题分析 → 回到总览），
 * 本组合式函数负责开关、定时、手动操作重置计时与组件卸载清理。
 *
 * @param {Object}   opts
 * @param {number}   [opts.interval=12000] 轮播间隔毫秒
 * @param {Function} opts.tick             每次轮播执行的「下一步」逻辑
 * @returns {{ on: Ref<boolean>, toggle: Function, touch: Function, stop: Function }}
 */
export function useCarousel({ interval = 12000, tick } = {}) {
  const on = ref(false)
  let timer = null

  function stop() {
    if (timer) { clearTimeout(timer); timer = null }
  }
  function schedule() {
    stop()
    if (on.value) timer = setTimeout(step, interval)
  }
  function step() {
    if (!on.value) return
    try { tick?.() } catch (e) { console.error('[useCarousel] tick error:', e) }
    schedule()
  }
  /** 开/关轮播 */
  function toggle() {
    on.value = !on.value
    if (on.value) schedule()
    else stop()
  }
  /** 手动操作（切 Tab/客户/窗口）后重新计时，避免刚切完就被轮走 */
  function touch() {
    if (!on.value) return
    schedule()
  }

  onUnmounted(stop)
  return { on, toggle, touch, stop }
}
