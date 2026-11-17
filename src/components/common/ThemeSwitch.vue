<template>
  <div class="theme-switch">
    <div 
      v-for="theme in THEMES" 
      :key="theme.key"
      class="theme-item"
      :class="{ active: currentTheme === theme.key }"
      :style="{ background: theme.color }"
      :title="theme.name"
      @click="setTheme(theme.key)"
    ></div>
  </div>
</template>

<script setup>
import { useThemeStore, THEMES } from '@/stores/theme'
import { storeToRefs } from 'pinia'

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)
const { setTheme } = themeStore
</script>

<style scoped lang="scss">
.theme-switch {
  display: flex;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: var(--color-bg-card);
  border-radius: 20px;
  border: 1px solid var(--color-border-light);
  
  .theme-item {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    opacity: 0.6;
    
    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
    
    &.active {
      opacity: 1;
      border-color: #fff;
      box-shadow: 0 0 8px currentColor;
    }
  }
}
</style>
