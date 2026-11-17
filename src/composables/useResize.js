import { onMounted, onUnmounted } from 'vue'

/**
 * 窗口大小监听组合式函数
 * @param {Function} callback 尺寸变化回调
 * @param {number} delay 防抖延迟时间（毫秒）
 */
export function useResize(callback, delay = 100) {
  let timer = null
  
  const handleResize = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      callback?.()
    }, delay)
  }
  
  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (timer) clearTimeout(timer)
  })
}
