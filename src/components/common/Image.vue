<template>
  <div
    ref="wrapperRef"
    class="sc-image"
    :class="[
      `sc-image--${shape}`,
      { 'sc-image--lazy': lazy && !isLoaded && !isFailed,
        'sc-image--preview': isPreview,
        'sc-image--loading': isLoading,
        'sc-image--error': isFailed }
    ]"
    :style="{ width: addUnit(width), height: addUnit(height), borderRadius: radius }"
    @click="handleClick"
  >
    <!-- 真实图片（懒加载：inView后才设置src） -->
    <img
      v-show="isLoaded && !isFailed"
      ref="imgRef"
      :src="currentSrc"
      :alt="alt"
      :class="[`sc-image__img`, `sc-image__img--${fit}`]"
      draggable="false"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 加载中占位 -->
    <div v-if="isLoading && !isFailed" class="sc-image__placeholder sc-image__loading">
      <slot name="loading">
        <svg viewBox="0 0 1024 1024" class="sc-image__spinner" xmlns="http://www.w3.org/2000/svg">
          <path d="M512 64a448 448 0 0 1 448 448h-64A384 384 0 0 0 128 512H64A448 448 0 0 1 512 64z" fill="currentColor"/>
        </svg>
      </slot>
    </div>

    <!-- 加载失败占位 -->
    <div v-if="isFailed" class="sc-image__placeholder sc-image__error">
      <slot name="error">
        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" class="sc-image__err-icon">
          <path d="M955.4 880.8c9.8 13.1 9.8 31 0 44.1a40.1 40.1 0 0 1-32.6 16.3H101.2c-12.6 0-24.5-5.9-32.6-16.3a39.95 39.95 0 0 1 0-44.1l230-308.5c8.4-11.2 21.6-17.9 35.7-18 14.2-0.1 27.5 6.4 36 17.5l84.7 110.2 134.5-184.9a43.77 43.77 0 0 1 35.3-18.4c14.2-0.3 27.6 6.7 36.1 18.2l294.5 383.9zM696 440c-79.5 0-144-64.5-144-144s64.5-144 144-144 144 64.5 144 144-64.5 144-144 144z" fill="currentColor"/>
        </svg>
        <span class="sc-image__err-text">图片加载失败</span>
      </slot>
    </div>

    <!-- Hover 蒙层（可预览时显示放大镜） -->
    <div v-if="isPreview && isLoaded && !isFailed" class="sc-image__mask">
      <svg viewBox="0 0 24 24" class="sc-image__zoom-icon">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z" fill="currentColor"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { previewImage } from '@/utils/imagePreview'

const props = defineProps({
  /** 图片地址 */
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  /** 宽度，数字默认px */
  width: { type: [String, Number], default: '' },
  /** 高度 */
  height: { type: [String, Number], default: '' },
  /** 圆角，默认跟随shape */
  radius: { type: String, default: '' },
  /** 形状：square 方 / rounded 圆角 / circle 圆形 */
  shape: { type: String, default: 'rounded', validator: v => ['square', 'rounded', 'circle'].includes(v) },
  /** 填充模式 */
  fit: { type: String, default: 'cover', validator: v => ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(v) },
  /** 是否懒加载 */
  lazy: { type: Boolean, default: true },
  /** 是否可点击预览：
   *  - true: 单图预览
   *  - string[]: 自定义图集，点击时打开多图预览
   *  - 不传但外层包裹了 ImagePreviewGroup 时自动加入图集
   */
  preview: { type: [Boolean, Array], default: undefined },
  /** 点击事件回调（设置时会覆盖默认预览行为） */
  onClick: { type: Function, default: null }
})

const emit = defineEmits(['load', 'error', 'click'])

const wrapperRef = ref(null)
const imgRef = ref(null)
const inView = ref(!props.lazy)
const isLoading = ref(true)
const isLoaded = ref(false)
const isFailed = ref(false)
const currentSrc = ref('')

// 从 ImagePreviewGroup 注入图集注册方法
const groupContext = inject('imagePreviewGroup', null)

const isPreview = computed(() => {
  if (props.onClick) return false
  if (props.preview !== undefined) return !!props.preview
  // 没有显式设置 preview 但在 Group 里，自动启用预览
  return !!groupContext
})

const addUnit = v => {
  if (v === '' || v === null || v === undefined) return ''
  if (typeof v === 'number') return `${v}px`
  return v
}

// 懒加载观察
let io = null
onMounted(() => {
  if (props.lazy && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          inView.value = true
          currentSrc.value = props.src
          io && io.disconnect()
        }
      })
    }, { rootMargin: '100px' })
    io.observe(wrapperRef.value)
  } else {
    inView.value = true
    currentSrc.value = props.src
  }
  // 向 Group 注册
  if (groupContext) groupContext.register(props.src)
})

onBeforeUnmount(() => {
  io && io.disconnect()
  if (groupContext) groupContext.unregister(props.src)
})

watch(() => props.src, (newSrc) => {
  isLoading.value = true
  isLoaded.value = false
  isFailed.value = false
  if (inView.value) currentSrc.value = newSrc
})

const handleLoad = () => {
  isLoading.value = false
  isLoaded.value = true
  isFailed.value = false
  emit('load')
}
const handleError = () => {
  isLoading.value = false
  isLoaded.value = false
  isFailed.value = true
  emit('error')
}

const handleClick = (e) => {
  emit('click', e)
  if (props.onClick) { props.onClick(e); return }
  if (!isPreview.value) return

  // 决定图集与起始索引
  let urls
  let initialIndex = 0

  if (Array.isArray(props.preview) && props.preview.length) {
    // 显式传入自定义图集
    urls = props.preview
    initialIndex = Math.max(0, urls.indexOf(props.src))
  } else if (groupContext) {
    // 使用 Group 收集的图集
    const groupUrls = groupContext.getUrls()
    urls = groupUrls
    initialIndex = Math.max(0, groupUrls.indexOf(props.src))
  } else {
    // 单图
    urls = [props.src]
  }

  previewImage({ urls, initialIndex })
}
</script>

<style lang="scss" scoped>
.sc-image {
  position: relative;
  display: inline-block;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-text-primary) 5%, transparent);
  vertical-align: middle;
  flex-shrink: 0;

  &--square { border-radius: 0; }
  &--rounded { border-radius: $radius-sm; }
  &--circle { border-radius: 50%; }

  &--preview {
    cursor: zoom-in;
  }

  &__img {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform 0.3s ease;

    &--fill { object-fit: fill; }
    &--contain { object-fit: contain; }
    &--cover { object-fit: cover; }
    &--none { object-fit: none; }
    &--scale-down { object-fit: scale-down; }
  }

  &--preview:hover &__img {
    transform: scale(1.04);
  }

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    color: var(--color-text-muted);
    font-size: $font-sm;
    background: color-mix(in srgb, var(--color-text-primary) 3%, transparent);
  }

  &__spinner {
    width: 28px; height: 28px;
    animation: sc-img-spin 1s linear infinite;
  }
  &__err-icon { width: 32px; height: 32px; }
  &__err-text { font-size: $font-xs; }

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  &:hover &__mask { opacity: 1; }

  &__zoom-icon {
    width: 32px; height: 32px;
    fill: #fff;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
  }
}

@keyframes sc-img-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

</style>
