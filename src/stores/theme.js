import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 支持的主题列表（第一个为默认主题）
export const THEMES = [
  { key: 'light-business', name: '淡色商务', color: '#2f54eb' },
  { key: 'light-cyan', name: '淡色青碧', color: '#0e9f9f' },
  { key: 'dark-blue', name: '科技深蓝', color: '#1e6fff' },
  { key: 'gov-red', name: '政务红金', color: '#c41e3a' }
]

// 默认主题：淡色风格
export const DEFAULT_THEME = 'light-business'

// localStorage 持久化键
const STORAGE_KEY = 'screen-theme'

export const useThemeStore = defineStore('theme', () => {
  // 从localStorage读取保存的主题，默认淡色商务
  const currentTheme = ref(THEMES.some(t => t.key === localStorage.getItem(STORAGE_KEY))
    ? localStorage.getItem(STORAGE_KEY)
    : DEFAULT_THEME)

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
    localStorage.setItem(STORAGE_KEY, newTheme)
    // 触发自定义事件，通知图表等组件主题变更
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }))
  }, { immediate: true })

  return {
    currentTheme,
    setTheme,
    THEMES
  }
})
