import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 元素懒加载组合式函数 - 元素进入视口才返回true，常用于图表/列表延迟渲染
 * @param {string} rootMargin IntersectionObserver rootMargin 配置
 * @returns {Object} { targetRef, isVisible }
 */
export function useLazyLoad(rootMargin = '100px') {
  const targetRef = ref(null)
  const isVisible = ref(false)
  let observer = null

  onMounted(() => {
    if (!targetRef.value) return
    
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          isVisible.value = true
          // 可见后停止观察
          observer.unobserve(entry.target)
        }
      })
    }, {
      rootMargin,
      threshold: 0.1
    })

    observer.observe(targetRef.value)
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    targetRef,
    isVisible
  }
}
