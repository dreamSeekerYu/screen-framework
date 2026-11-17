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

// 容器样式
const containerStyle = computed(() => {
  return {
    width: `${designWidth}px`,
    height: `${designHeight}px`,
    transform: `scale(${scale.value})`,
    transformOrigin: 'center top'
  }
})

useResize(updateScale)

onMounted(() => {
  updateScale()
})
</script>

<style scoped lang="scss">
.screen-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  background: var(--color-bg-page);
  background: linear-gradient(135deg, #f5f9ff 0%, #edf5ff 50%, #f5f9ff 100%);
}

.screen-container {
  position: relative;
  transform-origin: center top;
}
</style>
