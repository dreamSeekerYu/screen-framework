<template>
  <div class="ui-progress" :class="`ui-progress--${status}`">
    <!-- 文字在外侧（line 类型可选） -->
    <div v-if="textInside === false && type === 'line'" class="ui-progress__outer-text">
      <slot name="text">
        <span class="ui-progress__text">{{ percentage }}%</span>
      </slot>
    </div>
    <div class="ui-progress__track" :style="trackStyle">
      <div
        class="ui-progress__bar"
        :style="barStyle"
      >
        <div v-if="showStriped" class="ui-progress__striped"></div>
        <div v-if="textInside" class="ui-progress__inner-text">
          <slot name="text">
            <span class="ui-progress__text">{{ percentage }}%</span>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percentage: { type: Number, default: 0 },
  type: {
    type: String,
    default: 'line',
    validator: (v) => ['line'].includes(v) // 预留 circle/dashboard，后续可扩展
  },
  status: {
    type: String,
    default: '',
    validator: (v) => ['', 'success', 'warning', 'danger'].includes(v)
  },
  strokeWidth: { type: Number, default: 10 }, // 进度条高度 px
  color: { type: [String, Array], default: '' }, // 单色或多段色数组
  trackColor: { type: String, default: '' },
  showText: { type: Boolean, default: true },
  textInside: { type: Boolean, default: true },
  striped: { type: Boolean, default: false }, // 斑马条纹动效
  duration: { type: Number, default: 600 }
})

const clamped = computed(() => Math.min(100, Math.max(0, props.percentage)))

const trackStyle = computed(() => ({
  height: `${props.strokeWidth}px`,
  backgroundColor: props.trackColor || 'rgba(255,255,255,0.08)'
}))

const barStyle = computed(() => {
  let bg = props.color
  if (!bg) {
    // 根据 status 自动配色
    switch (props.status) {
      case 'success': bg = '#10b981'; break
      case 'warning': bg = '#f59e0b'; break
      case 'danger':  bg = '#ef4444'; break
      default: bg = 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))'; break
    }
  } else if (Array.isArray(bg)) {
    bg = `linear-gradient(90deg, ${bg.join(', ')})`
  }
  return {
    width: `${clamped.value}%`,
    background: bg,
    transitionDuration: `${props.duration}ms`
  }
})

const showStriped = computed(() => props.striped)
</script>

<style scoped lang="scss">
.ui-progress {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: $font-sm;

  &__track {
    flex: 1;
    position: relative;
    border-radius: 100px;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 100px;
    position: relative;
    transition: width ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  &__striped {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
      45deg,
      rgba(255,255,255,0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255,255,255,0.15) 50%,
      rgba(255,255,255,0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 18px 18px;
    animation: progress-stripes 1.2s linear infinite;
  }

  &__text {
    color: var(--color-text-primary);
    font-weight: 600;
    font-size: $font-sm;
    white-space: nowrap;
  }

  &__inner-text {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    .ui-progress__text {
      font-size: $font-xs;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
  }

  &__outer-text {
    min-width: 40px;
    text-align: right;
  }

  &--success .ui-progress__bar { background-color: #10b981 !important; }
  &--warning .ui-progress__bar { background-color: #f59e0b !important; }
  &--danger  .ui-progress__bar { background-color: #ef4444 !important; }
}

@keyframes progress-stripes {
  from { background-position: 0 0; }
  to   { background-position: 36px 0; }
}
</style>
