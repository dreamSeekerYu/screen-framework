import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 触屏设备判定（手机 / 平板）
 *
 * 组合三层判据，任一命中即视为触屏设备：
 *   1. CSS 媒体查询 (hover: none) and (pointer: coarse)
 *      —— 主输入设备没有悬停能力且为粗指针，手机 / 平板未接鼠标时的标准特征
 *   2. 移动端 UA 关键字 —— 覆盖部分安卓平板 / 国产定制浏览器媒体查询不准的情况
 *   3. iPadOS 13+ 桌面模式 —— UA 伪装成 Macintosh，靠多点触控能力识别
 *      （真机 Mac 的 maxTouchPoints 为 0，不会误判）
 *
 * 桌面浏览器（含缩小窗口、DevTools 仅改视口尺寸）一律返回 false。
 * 调试 / 特殊场景可用 URL 参数强制指定：?pager=1 强制显示，?pager=0 强制隐藏
 * （同时支持写在 hash 路由里：#/qc?pager=1）。
 */
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)'
const MOBILE_UA = /Android|iPhone|iPad|iPod|Windows Phone|HarmonyOS|Mobile|Tablet/i

function readForceFlag() {
  if (typeof window === 'undefined') return null
  const search = `${window.location.search || ''}${window.location.hash.includes('?') ? '&' + window.location.hash.split('?')[1] : ''}`
  const m = search.match(/[?&]pager=(0|1|true|false)/i)
  if (!m) return null
  return /^(1|true)$/i.test(m[1])
}

/** 同步判定：非响应式，供组件初始化时取初值 */
export function detectTouchDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const forced = readForceFlag()
  if (forced !== null) return forced

  if (window.matchMedia && window.matchMedia(TOUCH_QUERY).matches) return true

  const ua = navigator.userAgent || ''
  if (MOBILE_UA.test(ua)) return true

  // iPadOS 13+ 桌面模式
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true

  return false
}

/**
 * 响应式版本：设备形态变化（如外接 / 拔掉鼠标、旋转后媒体查询翻转）时自动更新
 * @returns {import('vue').Ref<boolean>}
 */
export function useIsTouchDevice() {
  const isTouch = ref(typeof window !== 'undefined' ? detectTouchDevice() : false)
  let mql = null
  const update = () => { isTouch.value = detectTouchDevice() }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(TOUCH_QUERY)
    update()
    if (mql.addEventListener) mql.addEventListener('change', update)
    else if (mql.addListener) mql.addListener(update) // 老版 Safari
    window.addEventListener('orientationchange', update)
  })

  onBeforeUnmount(() => {
    if (mql) {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else if (mql.removeListener) mql.removeListener(update)
    }
    window.removeEventListener('orientationchange', update)
  })

  return isTouch
}
