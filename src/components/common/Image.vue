<template>
  <div
    class="ui-image"
    :class="[`ui-image-fit--${fit}`, { 'is-loading': loading, 'is-error': error }]"
    :style="{ width: width, height: height }"
    @click="handleClick"
  >
    <!-- 真实图片 -->
    <img
      v-if="!error && src"
      ref="imgRef"
      :src="src"
      :alt="alt"
      class="ui-image__inner"
      @load="handleLoad"
      @error="handleError"
    />
    <!-- 加载中占位 -->
    <div v-if="loading" class="ui-image__placeholder">
      <div class="ui-image__spinner"></div>
      <span v-if="loadingText" class="ui-image__tip">{{ loadingText }}</span>
    </div>
    <!-- 加载失败占位 -->
    <div v-else-if="error" class="ui-image__placeholder ui-image__error">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
      <span class="ui-image__tip">{{ errorText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: '100%' },
  fit: {
    type: String,
    default: 'cover',
    validator: (v) => ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(v)
  },
  // 是否点击触发预览（需配合 ImagePreview 使用时设为 false，由父级处理）
  preview: { type: Boolean, default: false },
  loadingText: { type: String, default: '加载中...' },
  errorText: { type: String, default: '加载失败' }
})

const emit = defineEmits(['load', 'error', 'click'])

const loading = ref(true)
const error = ref(false)
const imgRef = ref(null)

function handleLoad(e) {
  loading.value = false
  error.value = false
  emit('load', e)
}
function handleError(e) {
  loading.value = false
  error.value = true
  emit('error', e)
}
function handleClick(e) {
  emit('click', e)
}
function reset() {
  loading.value = true
  error.value = false
}
watch(() => props.src, reset)

defineExpose({ imgRef, reset })
</script>

<style scoped lang="scss">
.ui-image {
  position: relative;
  display: inline-block;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border-radius: $radius-sm;
  cursor: default;

  &__inner {
    width: 100%;
    height: 100%;
    display: block;
    transition: opacity 0.25s;
  }

  &.is-loading .ui-image__inner,
  &.is-error .ui-image__inner {
    opacity: 0;
  }

  /* object-fit */
  &-fit--fill       .ui-image__inner { object-fit: fill; }
  &-fit--contain    .ui-image__inner { object-fit: contain; }
  &-fit--cover      .ui-image__inner { object-fit: cover; }
  &-fit--none       .ui-image__inner { object-fit: none; }
  &-fit--scale-down .ui-image__inner { object-fit: scale-down; }

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--color-text-muted);
    font-size: $font-xs;
    background: var(--color-bg-card);
  }

  &__error { color: var(--color-text-muted); }

  &__tip { opacity: 0.8; }

  &__spinner {
    width: 22px;
    height: 22px;
    border: 2px solid var(--color-border-light);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: img-spin 0.8s linear infinite;
  }
}

@keyframes img-spin {
  to { transform: rotate(360deg); }
}
</style>
