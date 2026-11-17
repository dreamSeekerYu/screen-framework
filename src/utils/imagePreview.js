import { createApp, h, ref } from 'vue'
import ImagePreview from '../components/common/ImagePreview.vue'

/**
 * 函数式调用图片预览
 * @param {Object} options
 * @param {string|string[]} options.urls - 图片地址或地址数组
 * @param {number} [options.initialIndex=0] - 初始显示的图片索引
 * @param {Function} [options.onClose] - 关闭回调
 * @param {Function} [options.onSwitch] - 切换图片回调
 * @returns {{close: Function}} 关闭实例的方法
 */
export function previewImage(options = {}) {
  const { urls, initialIndex = 0, onClose, onSwitch } = options
  if (!urls || (Array.isArray(urls) && urls.length === 0)) {
    console.warn('[previewImage] urls is required')
    return { close: () => {} }
  }

  const container = document.createElement('div')
  document.body.appendChild(container)

  let instance = null
  const app = createApp({
    setup() {
      const visible = ref(true)
      function handleClose() {
        visible.value = false
        onClose?.()
        setTimeout(() => {
          if (instance) {
            app.unmount()
            container.remove()
            document.body.style.overflow = ''
            instance = null
          }
        }, 300)
      }
      return () => h(ImagePreview, {
        modelValue: visible.value,
        'onUpdate:modelValue': (v) => {
          visible.value = v
          if (!v) handleClose()
        },
        urls,
        initialIndex,
        onClose: handleClose,
        onSwitch: (i) => onSwitch?.(i)
      })
    }
  })

  instance = app.mount(container)
  document.body.style.overflow = 'hidden'

  return {
    close: () => {
      if (instance) {
        document.body.style.overflow = ''
        app.unmount()
        container.remove()
        instance = null
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.$previewImage = previewImage
}

export default previewImage
