<template>
  <div class="sc-image-preview-group">
    <slot />
  </div>
</template>

<script setup>
/**
 * ImagePreviewGroup 图片预览组
 * 用法：包裹若干 <Image> 子元素，组内任意图片点击自动以图集方式预览，
 *       无需手动维护 urls 和 initialIndex。
 * 示例：
 *   <ImagePreviewGroup>
 *     <Image v-for="url in urls" :key="url" :src="url" width="100" height="100" />
 *   </ImagePreviewGroup>
 */
import { provide, reactive, ref } from 'vue'

defineProps({
  /** 预览时的初始索引 */
  current: { type: Number, default: 0 }
})

const urls = ref([])
const urlSet = reactive(new Set()) // 去重

const register = (src) => {
  if (!src) return
  if (!urlSet.has(src)) {
    urlSet.add(src)
    urls.value.push(src)
  }
}
const unregister = (src) => {
  if (!src) return
  if (urlSet.has(src)) {
    urlSet.delete(src)
    const idx = urls.value.indexOf(src)
    if (idx > -1) urls.value.splice(idx, 1)
  }
}
const getUrls = () => urls.value.slice()

provide('imagePreviewGroup', { register, unregister, getUrls })
</script>

<style lang="scss" scoped>
.sc-image-preview-group {
  display: contents; /* 不增加额外 DOM 层级 */
}
</style>
