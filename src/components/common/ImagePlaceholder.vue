<template>
  <div
    class="image-placeholder"
    :class="[`image-placeholder--${shape}`, { 'is-clickable': clickable }]"
    :style="{ width, height }"
    @click="handleClick"
  >
    <!-- 背景图（懒加载目标） -->
    <div v-if="src && loaded" class="image-placeholder__bg" :style="{ backgroundImage: `url(${src})` }"></div>

    <!-- 加载骨架 -->
    <div v-if="!loaded && !error" class="image-placeholder__skeleton"></div>

    <!-- 默认/错误占位 -->
    <div v-if="!loaded || error" class="image-placeholder__fallback">
      <slot name="icon">
        <svg v-if="!error" viewBox="0 0 24 24" width="30%" height="30%" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="30%" height="30%" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </slot>
      <span v-if="text" class="image-placeholder__text">{{ error ? errorText : text }}</span>
    </div>

    <!-- hover 蒙层 -->
    <div v-if="loaded && clickable" class="image-placeholder__hover">
      <slot name="hover">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
        </svg>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: '100%' },
  shape: {
    type: String,
    default: 'square',
    validator: (v) => ['square', 'rounded', 'circle'].includes(v)
  },
  // 默认占位提示文字
  text: { type: String, default: '' },
  errorText: { type: String, default: '图片加载失败' },
  // 是否可点击（用于点击预览的场景，仅显示 hover 蒙层）
  clickable: { type: Boolean, default: false },
  // 是否启用懒加载
  lazy: { type: Boolean, default: true }
})

const emit = defineEmits(['click', 'load', 'error'])
const loaded = ref(false)
const error = ref(false)
let img = null
let io = null
const rootRef = ref(null)

function load() {
  if (!props.src) { loaded.value = false; return }
  loaded.value = false
  error.value = false
  img = new Image()
  img.onload = () => {
    loaded.value = true
    emit('load')
  }
  img.onerror = () => {
    error.value = true
    loaded.value = false
    emit('error')
  }
  img.src = props.src
}

function handleClick(e) {
  if (props.clickable) emit('click', e)
}

watch(() => props.src, load)

onMounted(() => {
  if (props.lazy && 'IntersectionObserver' in window && rootRef.value) {
    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          load()
          io.unobserve(entry.target)
        }
      })
    }, { rootMargin: '100px' })
    io.observe(rootRef.value)
  } else {
    load()
  }
})

onBeforeUnmount(() => {
  if (io) io.disconnect()
  if (img) { img.onload = null; img.onerror = null }
})

defineExpose({ reload: load })
</script>

<style scoped lang="scss">
.image-placeholder {
  position: relative;
  display: inline-block;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  border: 1px dashed var(--color-border-light);
  color: var(--color-text-muted);
  vertical-align: middle;

  &--square  { border-radius: $radius-sm; }
  &--rounded { border-radius: $radius-md; }
  &--circle  { border-radius: 50%; }

  &.is-clickable { cursor: pointer; }

  &__bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    animation: iph-fade 0.4s ease;
  }

  &__skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      rgba(255,255,255,0.04) 25%,
      rgba(255,255,255,0.08) 37%,
      rgba(255,255,255,0.04) 63%
    );
    background-size: 400% 100%;
    animation: iph-skeleton 1.4s ease infinite;
  }

  &__fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    pointer-events: none;
  }

  &__text {
    font-size: $font-xs;
    opacity: 0.7;
    text-align: center;
    padding: 0 8px;
  }

  &__hover {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.45);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.25s;
  }
  &:hover .image-placeholder__hover { opacity: 1; }
}

@keyframes iph-skeleton {
  0%   { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
@keyframes iph-fade {
  from { opacity: 0; transform: scale(1.02); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
