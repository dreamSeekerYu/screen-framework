<template>
  <span class="number-counter">{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  // 目标数值
  value: {
    type: Number,
    default: 0
  },
  // 动画时长（毫秒）
  duration: {
    type: Number,
    default: 1500
  },
  // 小数位数
  decimals: {
    type: Number,
    default: 0
  },
  // 前缀
  prefix: {
    type: String,
    default: ''
  },
  // 后缀
  suffix: {
    type: String,
    default: ''
  },
  // 千分位分隔
  separator: {
    type: Boolean,
    default: true
  }
})

const displayValue = ref(props.prefix + '0' + props.suffix)
let animationTimer = null

// 数字动画
const animateValue = (from, to) => {
  if (animationTimer) cancelAnimationFrame(animationTimer)
  
  const startTime = performance.now()
  
  const update = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    
    // easeOutQuart 缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 4)
    const current = from + (to - from) * easeProgress
    
    let formatted = current.toFixed(props.decimals)
    
    // 千分位格式化
    if (props.separator) {
      const parts = formatted.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      formatted = parts.join('.')
    }
    
    displayValue.value = props.prefix + formatted + props.suffix
    
    if (progress < 1) {
      animationTimer = requestAnimationFrame(update)
    }
  }
  
  animationTimer = requestAnimationFrame(update)
}

watch(() => props.value, (newVal, oldVal) => {
  animateValue(oldVal || 0, newVal)
})

onMounted(() => {
  // 首次加载延迟启动动画
  setTimeout(() => {
    animateValue(0, props.value)
  }, 300)
})
</script>

<style scoped lang="scss">
.number-counter {
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
  font-weight: 700;
  font-size: $font-xxl;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
</style>
