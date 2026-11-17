<template>
  <header class="screen-header">
    <!-- 左侧区域 -->
    <div class="screen-header__left">
      <h1 class="screen-title">{{ title }}</h1>
    </div>
    
    <!-- 中间标题 -->
    <div class="screen-header__center">
     
    </div>
    
    <!-- 右侧区域 -->
    <div class="screen-header__right">
      <TimeClock />
      <ThemeSwitch />
      <div class="fullscreen-btn" @click="toggleFullscreen" title="全屏切换">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import TimeClock from '@/components/common/TimeClock.vue'
import ThemeSwitch from '@/components/common/ThemeSwitch.vue'

defineProps({
  title: {
    type: String,
    default: '数据可视化大屏'
  }
})

const isFullscreen = ref(false)

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}
</script>

<style scoped lang="scss">
.screen-header {
  position: relative;
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg;
  // background: var(--color-bg-header);
  // border-bottom: 1px solid var(--color-border-light);
  
  // &::after {
  //   content: '';
  //   position: absolute;
  //   bottom: 0;
  //   left: 50%;
  //   transform: translateX(-50%);
  //   width: 60%;
  //   height: 2px;
  //   background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  // }
  
  &__left,
  &__right {
    flex: 1;
    display: flex;
    align-items: center;
  }
  
  &__right {
    justify-content: flex-end;
    gap: $spacing-md;
  }
  
  &__center {
    flex: 0 0 auto;
  }
}

.screen-title {
  font-size: 32px;
  font-weight: 700;
  // background: linear-gradient(180deg, #ffffff 0%, var(--color-primary-light) 100%);
  // -webkit-background-clip: text;
  // -webkit-text-fill-color: transparent;
  background-clip: text;
  // color: rgba(30, 111, 255, 0.5);
  // text-shadow: 0 0 1px rgba(30, 111, 255, 0.5);
  letter-spacing: 4px;
}

.fullscreen-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: rgba(30, 111, 255, 0.1);
  }
}
</style>
