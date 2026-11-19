<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div
        v-if="visible"
        class="ui-preview-mask"
        @click.self="close"
      >
        <!-- 顶部工具栏 -->
        <div class="ui-preview__toolbar">
          <div class="ui-preview__counter">
            {{ currentIndex + 1 }} / {{ urls.length }}
          </div>
          <div class="ui-preview__tools">
            <span class="tool-btn" title="缩小" @click="zoom(-0.2)">−</span>
            <span class="tool-zoom-text">{{ Math.round(scale * 100) }}%</span>
            <span class="tool-btn" title="放大" @click="zoom(0.2)">+</span>
            <span class="tool-btn" title="重置" @click="resetZoom">⟲</span>
            <span class="tool-btn" title="向左旋转" @click="rotate(-90)">↺</span>
            <span class="tool-btn" title="向右旋转" @click="rotate(90)">↻</span>
            <span class="tool-btn" :class="{ active: isFull }" title="全屏" @click="toggleFullscreen">⛶</span>
            <span class="tool-btn" title="下载" @click="download">⤓</span>
            <span class="tool-btn close" title="关闭" @click="close">×</span>
          </div>
        </div>

        <!-- 图片舞台 -->
        <div class="ui-preview__stage" ref="stageRef"
             @wheel.prevent="onWheel"
             @mousedown="onMouseDown">
          <img
            :src="currentUrl"
            class="ui-preview__img"
            :style="imgStyle"
            @dblclick="resetZoom"
            draggable="false"
          />
        </div>

        <!-- 左右切换按钮 -->
        <template v-if="urls.length > 1">
          <span class="ui-preview__nav prev" @click="prev">‹</span>
          <span class="ui-preview__nav next" @click="next">›</span>
        </template>

        <!-- 底部缩略图 -->
        <div v-if="urls.length > 1" class="ui-preview__thumbs">
          <div
            v-for="(u, i) in urls"
            :key="i"
            class="thumb-item"
            :class="{ active: i === currentIndex }"
            @click="goto(i)"
          >
            <img :src="u" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  urls: { type: Array, default: () => [] }, // 支持单张字符串或数组
  initialIndex: { type: Number, default: 0 },
  zIndex: { type: Number, default: 3000 }
})

const emit = defineEmits(['update:modelValue', 'close', 'switch'])

const visible = ref(false)
const currentIndex = ref(0)
const scale = ref(1)
const rotation = ref(0)
const translate = ref({ x: 0, y: 0 })
const isFull = ref(false)
const stageRef = ref(null)
const dragging = ref(false)
const startPt = { x: 0, y: 0, tx: 0, ty: 0 }

const normalizedUrls = computed(() => {
  if (Array.isArray(props.urls)) return props.urls
  if (typeof props.urls === 'string') return [props.urls]
  return []
})
const currentUrl = computed(() => normalizedUrls.value[currentIndex.value] || '')

const imgStyle = computed(() => ({
  transform: `translate(${translate.value.x}px, ${translate.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg)`
}))

watch(
  () => props.modelValue,
  (v, oldV) => {
    visible.value = v
    if (v) {
      currentIndex.value = Math.min(props.initialIndex, Math.max(0, normalizedUrls.value.length - 1))
      resetZoom()
      document.body.style.overflow = 'hidden'
    } else if (oldV !== undefined) {
      // 首次（immediate）挂载时不要清空其他组件已设置的状态
      document.body.style.overflow = ''
    }
  },
  { immediate: true }
)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function goto(i) {
  currentIndex.value = (i + normalizedUrls.value.length) % normalizedUrls.value.length
  resetZoom()
  emit('switch', currentIndex.value)
}
function prev() { goto(currentIndex.value - 1) }
function next() { goto(currentIndex.value + 1) }

function zoom(delta, origin) {
  const next = Math.min(5, Math.max(0.2, +(scale.value + delta).toFixed(2)))
  scale.value = next
}
function resetZoom() {
  scale.value = 1
  rotation.value = 0
  translate.value = { x: 0, y: 0 }
}
function rotate(deg) { rotation.value = (rotation.value + deg) % 360 }

function onWheel(e) {
  zoom(e.deltaY < 0 ? 0.15 : -0.15)
}

function onMouseDown(e) {
  if (e.button !== 0) return
  dragging.value = true
  startPt.x = e.clientX; startPt.y = e.clientY
  startPt.tx = translate.value.x; startPt.ty = translate.value.y
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
function onMove(e) {
  if (!dragging.value) return
  translate.value = {
    x: startPt.tx + (e.clientX - startPt.x),
    y: startPt.ty + (e.clientY - startPt.y)
  }
}
function onUp() {
  dragging.value = false
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
}

function toggleFullscreen() {
  const el = stageRef.value?.parentElement
  if (!document.fullscreenElement) {
    el?.requestFullscreen?.()
    isFull.value = true
  } else {
    document.exitFullscreen?.()
    isFull.value = false
  }
}

function download() {
  if (!currentUrl.value) return
  const a = document.createElement('a')
  a.href = currentUrl.value
  a.download = currentUrl.value.split('/').pop() || 'image'
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function onKeydown(e) {
  if (!visible.value) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === '+' || e.key === '=') zoom(0.2)
  else if (e.key === '-') zoom(-0.2)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
.ui-preview-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  user-select: none;
}

.ui-preview__toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  left: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  z-index: 2;
  pointer-events: none;
}

.ui-preview__counter {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: $font-sm;
  pointer-events: auto;
}

.ui-preview__tools {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 4px;
  pointer-events: auto;
}

.tool-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.15s;
  color: #fff;
  &:hover { background: rgba(255,255,255,0.2); }
  &.active { color: var(--color-primary-light, #4d90ff); }
  &.close { font-size: 22px; }
}
.tool-zoom-text {
  min-width: 48px;
  text-align: center;
  font-size: $font-xs;
  color: rgba(255,255,255,0.85);
}

.ui-preview__stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
  &:active { cursor: grabbing; }
}

.ui-preview__img {
  max-width: 85%;
  max-height: 80%;
  object-fit: contain;
  transition: transform 0.15s ease-out;
  will-change: transform;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}

.ui-preview__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 2;
  &:hover { background: rgba(255,255,255,0.25); transform: translateY(-50%) scale(1.08); }
  &.prev { left: 24px; }
  &.next { right: 24px; }
}

.ui-preview__thumbs {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
  border-radius: $radius-md;
  max-width: 80vw;
  overflow-x: auto;
  z-index: 2;
}

.thumb-item {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid transparent;
  opacity: 0.55;
  transition: all 0.2s;
  img { width: 100%; height: 100%; object-fit: cover; }
  &:hover { opacity: 0.85; }
  &.active { opacity: 1; border-color: var(--color-primary, #1e6fff); }
}

.preview-fade-enter-active,
.preview-fade-leave-active { transition: opacity 0.25s; }
.preview-fade-enter-from,
.preview-fade-leave-to { opacity: 0; }
</style>
