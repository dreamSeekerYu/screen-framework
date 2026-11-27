import { onMounted, onUnmounted } from 'vue'

/**
 * 整页溢出守卫（规模化保障：防止新页面破坏 1080 一屏约束）
 *
 * 仅 dev 模式生效：挂载后及窗口尺寸变化时检测目标容器是否出现纵向溢出，
 * 超过阈值即在控制台告警并输出溢出像素，方便在开发期拦截回归。
 *
 * @param {Object} [opts]
 * @param {string} [opts.target='.screen-container'] 目标容器选择器（缺省用 documentElement）
 * @param {number} [opts.tolerance=8] 允许的溢出像素（亚像素/取整误差）
 */
export function usePageOverflowGuard({ target = '', tolerance = 8 } = {}) {
  if (!import.meta.env.DEV) return

  let raf = 0
  function check() {
    const el = target ? document.querySelector(target) : document.documentElement
    if (!el) return
    const overflow = el.scrollHeight - el.clientHeight
    if (overflow > tolerance) {
      console.warn(
        `[overflow-guard] ${target || 'document'} 纵向溢出 ${overflow}px（> ${tolerance}px 阈值），` +
        `请压缩布局保证大屏 1080 一屏约束`
      )
    }
  }
  function queue() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(check)
  }

  onMounted(() => {
    queue()
    window.addEventListener('resize', queue)
  })
  onUnmounted(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', queue)
  })
}
