<template>
  <div class="marquee-list" ref="wrapperRef" @mouseenter="pauseScroll" @mouseleave="resumeScroll">
    <div class="marquee-list__inner" ref="innerRef">
      <!-- 第一组数据 -->
      <div class="marquee-list__group">
        <div v-for="(item, index) in data" :key="index" class="marquee-list__item">
          <slot :item="item" :index="index">
            <span class="rank" :class="{ top3: index < 3 }">{{ index + 1 }}</span>
            <span class="content text-ellipsis">{{ item.name || item }}</span>
            <span class="value">{{ item.value || '' }}</span>
          </slot>
        </div>
      </div>
      <!-- 第二组数据 - 复制实现无缝滚动 -->
      <div v-if="data.length > minCount" class="marquee-list__group">
        <div v-for="(item, index) in data" :key="'copy-' + index" class="marquee-list__item">
          <slot :item="item" :index="index">
            <span class="rank" :class="{ top3: index < 3 }">{{ index + 1 }}</span>
            <span class="content text-ellipsis">{{ item.name || item }}</span>
            <span class="value">{{ item.value || '' }}</span>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  // 列表数据
  data: {
    type: Array,
    default: () => []
  },
  // 滚动速度（像素/秒）
  speed: {
    type: Number,
    default: 50
  },
  // 最小数量阈值，少于这个数不滚动
  minCount: {
    type: Number,
    default: 5
  }
})

const wrapperRef = ref(null)
const innerRef = ref(null)
let animationId = null
let offsetY = 0
let isPaused = false

const startScroll = () => {
  if (!innerRef.value || !wrapperRef.value) return
  if (props.data.length <= props.minCount) return
  
  const singleHeight = innerRef.value.scrollHeight / 2
  
  const scroll = () => {
    if (!isPaused) {
      offsetY += props.speed / 60 // 60fps
      if (offsetY >= singleHeight) {
        offsetY = 0
      }
      innerRef.value.style.transform = `translateY(${-offsetY}px)`
    }
    animationId = requestAnimationFrame(scroll)
  }
  
  scroll()
}

const pauseScroll = () => {
  isPaused = true
}

const resumeScroll = () => {
  isPaused = false
}

const stopScroll = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

watch(() => props.data, () => {
  nextTick(() => {
    stopScroll()
    offsetY = 0
    startScroll()
  })
}, { deep: true })

onMounted(() => {
  nextTick(startScroll)
})

onUnmounted(() => {
  stopScroll()
})
</script>

<style scoped lang="scss">
.marquee-list {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  
  &__inner {
    will-change: transform;
  }
  
  &__item {
    display: flex;
    align-items: center;
    padding: $spacing-sm 0;
    font-size: $font-sm;
    border-bottom: 1px solid var(--color-border-light);
    
    .rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: $radius-sm;
      background: var(--color-border-light);
      color: var(--color-text-secondary);
      margin-right: $spacing-sm;
      font-size: $font-xs;
      
      &.top3 {
        background: var(--color-primary);
        color: #fff;
      }
    }
    
    .content {
      flex: 1;
      color: var(--color-text-primary);
      margin-right: $spacing-sm;
    }
    
    .value {
      color: var(--color-primary);
      font-weight: 600;
      font-family: 'DIN Alternate', sans-serif;
    }
  }
}
</style>
