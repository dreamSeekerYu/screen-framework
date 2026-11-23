<template>
  <div class="screen-wrapper" ref="wrapperRef">
    <div
      class="screen-container"
      ref="containerRef"
      :style="containerStyle"
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useResize } from '@/composables/useResize'

const wrapperRef = ref(null)
const containerRef = ref(null)

// 设计稿基准尺寸
const designWidth = 1920
const designHeight = 1080

const scale = ref(1)

// 计算缩放比例
const updateScale = () => {
  if (!wrapperRef.value) return

  const clientWidth = window.innerWidth
  const clientHeight = window.innerHeight

  // 宽高等比缩放，取较小值保证完整显示
  const scaleX = clientWidth / designWidth
  const scaleY = clientHeight / designHeight

  scale.value = Math.min(scaleX, scaleY)
}

// 容器样式：以中心为缩放原点，配合 wrapper 居中布局，
// 任意分辨率下内容水平、垂直双向居中，无偏移、无裁切
const containerStyle = computed(() => {
  return {
    width: `${designWidth}px`,
    height: `${designHeight}px`,
    transform: `scale(${scale.value})`,
    transformOrigin: 'center center',
    flexShrink: 0
  }
})

useResize(updateScale)

onMounted(() => {
  updateScale()
  // 监听全屏切换，全屏后重新计算缩放比例
  document.addEventListener('fullscreenchange', updateScale)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', updateScale)
})
</script>

<style scoped lang="scss">
.screen-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-page);
  background: var(--bg-page-gradient);
}

.screen-container {
  position: relative;
  transform-origin: center center;
}
</style>
