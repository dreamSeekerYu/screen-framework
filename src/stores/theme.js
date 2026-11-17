import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 支持的主题列表
export const THEMES = [
  { key: 'dark-blue', name: '科技深蓝', color: '#1e6fff' },
  { key: 'gov-red', name: '政务红金', color: '#c41e3a' },
  { key: 'light-business', name: '浅色商务', color: '#2f54eb' }
]

export const useThemeStore = defineStore('theme', () => {
  // 从localStorage读取保存的主题，默认科技深蓝
  const currentTheme = ref(localStorage.getItem('screen-theme') || 'dark-blue')

  // 切换主题
  const setTheme = (themeKey) => {
    const themeExists = THEMES.some(t => t.key === themeKey)
    if (themeExists) {
      currentTheme.value = themeKey
    }
  }

  // 监听主题变化，更新DOM属性并持久化
  watch(currentTheme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('screen-theme', newTheme)
    // 触发自定义事件，通知图表等组件主题变更
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }))
  }, { immediate: true })

  return {
    currentTheme,
    setTheme,
    THEMES
  }
})
