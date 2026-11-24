<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="modelValue"
        class="ui-dialog-mask"
        :class="{ 'is-blur': blur }"
        @click.self="handleMaskClick"
      >
        <div
          class="ui-dialog"
          :class="[`ui-dialog-size--${size}`, { 'is-fullscreen': fullscreen, 'is-draggable': draggable }]"
          :style="dialogStyle"
        >
          <!-- 头部 -->
          <div
            class="ui-dialog__header"
            @mousedown="draggable && startDrag($event)"
          >
            <slot name="header">
              <span class="ui-dialog__title">{{ title }}</span>
            </slot>
            <div class="ui-dialog__actions">
              <slot name="header-extra" />
              <span
                v-if="fullscreen !== undefined"
                class="ui-dialog__action-btn"
                :title="fullscreen ? '还原' : '最大化'"
                @click.stop="toggleFullscreen"
              >
                <svg v-if="!fullscreen" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M5 5h5V3H3v7h2V5zm0 14v-5H3v7h7v-2H5zm14 0h-5v2h7v-7h-2v5zm-5-14v2h5v5h2V3h-7z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 19h-5v2h7v-7h-2v5zM5 5h5V3H3v7h2V5zm9-2v2h5v5h2V3h-7zM5 19v-5H3v7h7v-2H5z"/>
                </svg>
              </span>
              <span
                v-if="showClose"
                class="ui-dialog__action-btn ui-dialog__close"
                @click.stop="close"
              >×</span>
            </div>
          </div>

          <!-- 内容 -->
          <div class="ui-dialog__body">
            <slot />
          </div>

          <!-- 底部 -->
          <div v-if="$slots.footer" class="ui-dialog__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: '60%' },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['small', 'default', 'large'].includes(v)
  },
  fullscreen: { type: Boolean, default: false },
  showClose: { type: Boolean, default: true },
  closeOnClickModal: { type: Boolean, default: true },
  closeOnPressEscape: { type: Boolean, default: true },
  blur: { type: Boolean, default: true }, // 背景模糊
  draggable: { type: Boolean, default: false }, // 头部可拖拽
  top: { type: String, default: '10vh' }
})

const emit = defineEmits(['update:modelValue', 'open', 'close', 'opened', 'closed'])

const innerFullscreen = ref(props.fullscreen)
const dragOffset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const startPos = { x: 0, y: 0, ox: 0, oy: 0 }

watch(() => props.modelValue, (v) => {
  if (v) {
    innerFullscreen.value = props.fullscreen
    document.body.style.overflow = 'hidden'
    emit('open')
    nextTick(() => emit('opened'))
  } else {
    document.body.style.overflow = ''
    dragOffset.value = { x: 0, y: 0 }
    emit('close')
    setTimeout(() => emit('closed'), 200)
  }
})

watch(() => props.fullscreen, v => { innerFullscreen.value = v })

const dialogStyle = computed(() => {
  if (innerFullscreen.value) return { top: 0, left: 0, margin: 0, width: '100%', height: '100%', maxWidth: 'none', transform: 'none' }
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width
  // 显式传入非默认 width 时解除 size 类的 max-width 限制，保证大宽度弹窗生效
  const unlockMax = props.width !== '60%'
  return {
    width,
    maxWidth: unlockMax ? 'none' : undefined,
    top: props.top,
    transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px)`
  }
})

function close() {
  emit('update:modelValue', false)
}
function handleMaskClick() {
  if (props.closeOnClickModal) close()
}
function toggleFullscreen() {
  innerFullscreen.value = !innerFullscreen.value
}

function startDrag(e) {
  if (innerFullscreen.value) return
  dragging.value = true
  startPos.x = e.clientX
  startPos.y = e.clientY
  startPos.ox = dragOffset.value.x
  startPos.oy = dragOffset.value.y
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
}
function onDragMove(e) {
  if (!dragging.value) return
  dragOffset.value = {
    x: startPos.ox + (e.clientX - startPos.x),
    y: startPos.oy + (e.clientY - startPos.y)
  }
}
function stopDrag() {
  dragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.modelValue && props.closeOnPressEscape) close()
}

onMounted(() => { document.addEventListener('keydown', onKeydown) })
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
.ui-dialog-mask {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;

  &.is-blur { backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
}

.ui-dialog {
  position: relative;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: $radius-lg;
  box-shadow: var(--shadow-dialog), 0 0 0 1px var(--color-border-light);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
    border-radius: $radius-lg $radius-lg 0 0;
  }

  &-size--small   { width: 480px; }
  &-size--default { width: 60%; min-width: 560px; max-width: 960px; }
  &-size--large   { width: 80%; max-width: 1280px; }

  &.is-fullscreen {
    border-radius: 0;
    max-height: 100vh;
  }

  &.is-draggable .ui-dialog__header { cursor: move; user-select: none; }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  &__title {
    font-size: $font-md;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__action-btn {
    width: 28px;
    height: 28px;
    border-radius: $radius-sm;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    &:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  }

  &__close {
    font-size: 20px;
    line-height: 1;
  }

  &__body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    color: var(--color-text-primary);
  }

  &__footer {
    padding: 14px 20px;
    border-top: 1px solid var(--color-border-light);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}
.dialog-fade-enter-active .ui-dialog,
.dialog-fade-leave-active .ui-dialog {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to { opacity: 0; }
.dialog-fade-enter-from .ui-dialog { transform: translateY(-20px) scale(0.96); opacity: 0; }
.dialog-fade-leave-to .ui-dialog   { transform: translateY(-10px) scale(0.98); opacity: 0; }
</style>
