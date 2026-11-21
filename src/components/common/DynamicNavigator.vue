<template>
  <Teleport to="body">
    <Transition name="nav-fade">
      <div v-if="visible" class="dn-overlay" @click.self="close">
        <!-- 中心光环背景 -->
        <div class="dn-halo">
          <div class="dn-ring dn-ring--outer"></div>
          <div class="dn-ring dn-ring--mid"></div>
          <div class="dn-ring dn-ring--inner"></div>
          <div class="dn-center-title">
            <div class="dn-center-logo">CALB</div>
            <div class="dn-center-sub">集成工厂质量周报</div>
          </div>
        </div>

        <!-- 弧形导航卡片带：固定视窗 5 张（当前 ±2） -->
        <!-- key 使用"绝对位置+path"复合 key，确保光标移动时每个位置的 DOM 被正确复用，
             避免 Vue 因 key 重叠误判为节点增删，导致入场 dn-pop 动画在切换时被重放产生闪动 -->
        <div class="dn-arc" ref="arcRef">
          <div
            v-for="(item, vi) in visibleItems"
            :key="`${currentAbsIdx - 2 + vi}-${item.key}`"
            class="dn-card"
            :class="{
              'dn-card--active': vi === ACTIVE_IDX,
              'dn-card--near': Math.abs(vi - ACTIVE_IDX) === 1,
              'dn-card--side': Math.abs(vi - ACTIVE_IDX) === 2,
            }"
            :style="cardStyle(vi)"
            @click="jumpTo(item.key)"
          >
            <div class="dn-card-inner">
              <div class="dn-card-idx">{{ String(item.index + 1).padStart(2, '0') }}</div>
              <div class="dn-card-title">{{ item.title }}</div>
              <div class="dn-card-name">{{ item.name }}</div>
            </div>
            <div v-if="vi === ACTIVE_IDX" class="dn-card-glow"></div>
          </div>
          <!-- 选中项底部指示光 -->
          <div class="dn-indicator"></div>
        </div>

        <!-- 底部快捷键提示 -->
        <div class="dn-tips">
          <span><kbd>Alt</kbd>+<kbd>K</kbd> 唤起/关闭</span>
          <span><kbd>↑</kbd><kbd>↓</kbd>/滚轮 切换</span>
          <span><kbd>Enter</kbd>/松键 跳转</span>
          <span><kbd>Alt</kbd>+<kbd>[</kbd>/<kbd>]</kbd> 快速翻页</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  // 过滤掉非大屏页（noScale=true 的组件演示页默认不显示在导航器）
  filterNoScale: { type: Boolean, default: true },
})
const emit = defineEmits(['change', 'select'])

const route = useRoute()
const router = useRouter()

// ============ 从路由动态读取导航项 ============
const navItems = computed(() => {
  return router.options.routes
    .filter(r => !props.filterNoScale || !r.meta?.noScale)
    .map((r, i) => ({
      key: r.path,
      name: r.name || r.path,
      title: r.meta?.title || r.name,
      index: i,
    }))
})

// ============ 状态 ============
const visible = ref(false)
// currentAbsIdx 是完整 navItems 中当前高亮项的下标
// visible 视窗固定显示 5 张卡片，当前项始终居中（activeIdx 永远 = 2）
const currentAbsIdx = ref(0)
const ACTIVE_IDX = 2
const VISIBLE_COUNT = 5
const HALF = Math.floor(VISIBLE_COUNT / 2)

// 动画锁：切换动画进行中不接受下一次 move，彻底消除闪动
let animating = false
const ANIM_DURATION = 360 // 必须与 CSS transition 保持一致（ms）

// 滚轮节流锁（独立于动画锁，防止滚轮事件过于密集触发）
let wheelLock = false
const WHEEL_THROTTLE = 240
// 唤起瞬间屏蔽滚轮，避免按 Alt+K 时手指在滚轮上导致的误触
let wakeLock = false
let wakeTimer = null

// 「按住未释放」光标位置：第一次按方向键时设为 currentAbsIdx，
// 移动时只更新 pendingIdx（不立刻提交到路由），keyup 时一次性 jumpTo。
// 这确保无论 move 是否被动画锁挡住，松手时都能准确跳到最后光标所在位置。
let pendingIdx = -1

const visibleItems = computed(() => {
  const total = navItems.value.length
  if (total === 0) return []
  const start = currentAbsIdx.value - HALF
  const arr = []
  for (let i = 0; i < VISIBLE_COUNT; i++) {
    let idx = start + i
    if (idx < 0) idx = total + idx
    if (idx >= total) idx = idx - total
    arr.push(navItems.value[idx])
  }
  return arr
})

// ============ 打开/关闭 ============
const open = () => {
  const curPath = route.path
  const i = navItems.value.findIndex(n => n.key === curPath)
  currentAbsIdx.value = i >= 0 ? i : 0
  pendingIdx = currentAbsIdx.value
  visible.value = true
  // 唤起瞬间短暂屏蔽滚轮
  wakeLock = true
  clearTimeout(wakeTimer)
  wakeTimer = setTimeout(() => { wakeLock = false }, 280)
}
const close = () => {
  visible.value = false
  animating = false
  wakeLock = false
  pendingIdx = -1
  clearTimeout(wakeTimer)
}
const jumpTo = (key) => {
  if (route.path === key) { close(); return }
  router.push(key).then(() => close())
}

// ============ 切换（光标移动，只改 currentAbsIdx，不跳转） ============
const move = (delta) => {
  if (animating) return false
  const total = navItems.value.length
  if (total === 0) return false
  let next = currentAbsIdx.value + delta
  if (next < 0) next = total - 1
  if (next >= total) next = 0
  if (next === currentAbsIdx.value) return false
  currentAbsIdx.value = next
  pendingIdx = next
  animating = true
  setTimeout(() => { animating = false }, ANIM_DURATION)
  return true
}

// ============ 提交：松手/Enter 时跳转到 pendingIdx ============
const commitPending = () => {
  if (pendingIdx < 0) return
  const target = navItems.value[pendingIdx]
  pendingIdx = -1
  if (target) jumpTo(target.key)
}

// ============ 卡片弧形布局 ============
const cardStyle = (vi) => {
  const step = 18
  const R = 560
  const angle = (vi - ACTIVE_IDX) * step
  const dist = Math.abs(vi - ACTIVE_IDX)
  const isActive = vi === ACTIVE_IDX
  const scale = isActive ? 1.1 : (dist === 1 ? 0.9 : 0.75)
  const opacity = isActive ? 1 : (dist === 1 ? 0.85 : 0.55)
  const z = isActive ? 30 : (dist === 1 ? 20 : 10)
  return {
    transform: `rotate(${angle}deg) translateY(-${R}px) rotate(${-angle}deg) scale(${scale})`,
    opacity,
    zIndex: z,
  }
}

// ============ 判断是否在可编辑元素内（输入框/文本域等，不拦截快捷键） ============
const isInEditable = (el) => {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
    el.isContentEditable === true
}

// ============ 键盘事件 ============
// 用 e.repeat（浏览器原生标记）判断长按重复，不再依赖自维护的 arrowHeld 标志位——
// 这是消除"按住闪动"最可靠的方式：浏览器保证第一次按下 repeat=false，
// 操作系统产生的自动重复事件 repeat=true，不会因为 keyup 丢失而卡死。
const onKeyDown = (e) => {
  // 在输入框内不拦截
  if (isInEditable(e.target)) return

  // Alt+K：唤起/关闭。必须 !e.repeat，避免按住 Alt 时反复开关导致闪动
  if (!e.repeat && e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    e.stopPropagation()
    visible.value ? close() : open()
    return
  }

  // Alt+[ / Alt+]：快速翻页（不唤起导航器，直接跳转）
  if (!e.repeat && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    if (e.key === '[') {
      e.preventDefault()
      e.stopPropagation()
      quickJump(-1)
      return
    }
    if (e.key === ']') {
      e.preventDefault()
      e.stopPropagation()
      quickJump(1)
      return
    }
  }

  if (!visible.value) return

  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
    return
  }

  // 方向键：repeat=true 的事件全部丢弃，彻底消除按住闪动
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    if (!e.repeat) {
      pendingIdx = currentAbsIdx.value
      move(-1)
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    if (!e.repeat) {
      pendingIdx = currentAbsIdx.value
      move(1)
    }
    return
  }

  if (e.key === 'Enter' && !e.repeat) {
    e.preventDefault()
    e.stopPropagation()
    commitPending()
    return
  }
}

const onKeyUp = (e) => {
  // 方向键抬起：提交 pending 跳转
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (visible.value) {
      commitPending()
    }
    return
  }
  // 如果是 Alt 键本身抬起（例如用户按了 Alt+K 后释放 Alt），
  // 不做任何处理，避免误触发 close
}

// 页面失焦（切窗口/Alt+Tab 切标签）时，如果导航器打开且有 pending，
// 不自动跳转，直接关闭——避免"回到页面发现已经跳了"的诡异体验
const onBlur = () => {
  if (visible.value) close()
}

// 快速翻页（不打开导航器）
const quickJump = (delta) => {
  const total = navItems.value.length
  if (total === 0) return
  let i = navItems.value.findIndex(n => n.key === route.path)
  i = (i + delta + total) % total
  const target = navItems.value[i]
  if (target && target.key !== route.path) router.push(target.key)
}

// ============ 滚轮切换 ============
const onWheel = (e) => {
  if (!visible.value) return
  if (wakeLock) { e.preventDefault(); return }
  e.preventDefault()
  if (wheelLock) return
  // trackpad 双指缩放或横向滚动忽略
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  wheelLock = true
  if (e.deltaY > 0) move(1)
  else if (e.deltaY < 0) move(-1)
  setTimeout(() => { wheelLock = false }, WHEEL_THROTTLE)
}

// ============ 路由变化时同步选中项 ============
watch(() => route.path, (p) => {
  if (visible.value) {
    // 路由变了说明已经完成跳转，关闭导航器
    close()
  } else {
    const i = navItems.value.findIndex(n => n.key === p)
    if (i >= 0) currentAbsIdx.value = i
  }
})

onMounted(() => {
  // 用 capture:true 在捕获阶段处理，优先于页面其他监听；
  // 同时避免事件冒泡被其他组件拦截/重复响应。
  window.addEventListener('keydown', onKeyDown, { capture: true })
  window.addEventListener('keyup', onKeyUp, { capture: true })
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  window.addEventListener('blur', onBlur)
  const i = navItems.value.findIndex(n => n.key === route.path)
  if (i >= 0) currentAbsIdx.value = i
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown, { capture: true })
  window.removeEventListener('keyup', onKeyUp, { capture: true })
  window.removeEventListener('wheel', onWheel, { capture: true })
  window.removeEventListener('blur', onBlur)
  clearTimeout(wakeTimer)
})

defineExpose({ open, close, toggle: () => visible.value ? close() : open() })
</script>

<style lang="scss" scoped>
.dn-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at center, rgba(5, 20, 50, 0.78) 0%, rgba(2, 8, 24, 0.92) 100%);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

// ========== 中心光环 ==========
.dn-halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}
.dn-ring {
  position: absolute;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(64, 158, 255, 0.35);
}
.dn-ring--outer {
  width: 780px; height: 780px;
  border: 1px dashed rgba(64, 158, 255, 0.4);
  animation: dn-rotate 40s linear infinite;
}
.dn-ring--mid {
  width: 620px; height: 620px;
  border: 1px solid rgba(64, 158, 255, 0.5);
  box-shadow: 0 0 40px rgba(64, 158, 255, 0.25) inset, 0 0 40px rgba(64, 158, 255, 0.2);
}
.dn-ring--inner {
  width: 460px; height: 460px;
  border: 2px solid rgba(100, 200, 255, 0.6);
  box-shadow: 0 0 60px rgba(100, 200, 255, 0.35) inset;
}
.dn-center-title {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  .dn-center-logo {
    font-size: 92px;
    font-weight: 900;
    letter-spacing: 8px;
    background: linear-gradient(180deg, #e8f4ff 0%, #5ab4ff 55%, #1a6cc9 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 30px rgba(90, 180, 255, 0.4);
    font-family: 'Arial Black', sans-serif;
  }
  .dn-center-sub {
    margin-top: 12px;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 6px;
    color: #cfe7ff;
    text-shadow: 0 0 20px rgba(90, 180, 255, 0.6);
  }
}

// ========== 弧形卡片带 ==========
.dn-arc {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0; height: 0;
  transform: translate(-50%, 20px);
}

.dn-card {
  position: absolute;
  left: 50%;
  top: 0;
  width: 220px;
  height: 130px;
  margin-left: -110px;
  margin-top: -65px;
  transform-origin: center center;
  transition: transform 0.36s cubic-bezier(.2,.8,.2,1),
              opacity 0.3s ease,
              background 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
  will-change: transform, opacity;
  cursor: pointer;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(20, 55, 110, 0.85), rgba(10, 30, 70, 0.9));
  border: 1px solid rgba(100, 180, 255, 0.4);
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.5),
    0 0 16px rgba(64, 158, 255, 0.2) inset;
  backdrop-filter: blur(4px);
  overflow: hidden;

  &::before, &::after {
    content: '';
    position: absolute;
    left: 8%; right: 8%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(120, 200, 255, 0.7), transparent);
  }
  &::before { top: 6px; }
  &::after { bottom: 6px; }
}
.dn-card-inner {
  position: relative;
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: #cfe7ff;
}
.dn-card-idx {
  position: absolute;
  top: 8px; left: 12px;
  font-size: 12px;
  color: rgba(120, 200, 255, 0.7);
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}
.dn-card-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(90, 180, 255, 0.4);
  transition: color 0.3s, font-size 0.3s;
}
.dn-card-name {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(180, 220, 255, 0.7);
  letter-spacing: 1px;
  transition: color 0.3s;
}

.dn-card--active {
  background: linear-gradient(145deg, rgba(40, 130, 230, 0.95), rgba(15, 60, 140, 0.95));
  border-color: rgba(180, 230, 255, 0.9);
  box-shadow:
    0 10px 40px rgba(0, 30, 80, 0.7),
    0 0 30px rgba(90, 180, 255, 0.8),
    0 0 60px rgba(90, 180, 255, 0.4) inset;
  .dn-card-title { color: #fff; font-size: 30px; }
  .dn-card-name { color: #dff1ff; }
  .dn-card-idx { color: #bfe4ff; }
}
.dn-card--near {
  background: linear-gradient(145deg, rgba(25, 70, 135, 0.88), rgba(12, 38, 85, 0.9));
}
.dn-card-glow {
  position: absolute;
  left: -20%; right: -20%;
  bottom: -40%;
  height: 80%;
  background: radial-gradient(ellipse at center, rgba(120, 210, 255, 0.6) 0%, transparent 70%);
  pointer-events: none;
  animation: dn-pulse 2s ease-in-out infinite;
}

// 选中项底部光束
.dn-indicator {
  position: absolute;
  left: 50%;
  bottom: -180px;
  width: 4px;
  height: 220px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(100, 200, 255, 0.9), rgba(100, 200, 255, 0));
  filter: blur(2px);
}
.dn-indicator::before {
  content: '';
  position: absolute;
  left: -14px; top: 0;
  width: 32px; height: 4px;
  background: rgba(180, 230, 255, 0.9);
  border-radius: 2px;
  box-shadow: 0 0 20px rgba(100, 200, 255, 0.9);
}

// ========== 底部提示 ==========
.dn-tips {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 24px;
  color: rgba(180, 220, 255, 0.75);
  font-size: 13px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 90vw;
  kbd {
    display: inline-block;
    padding: 2px 8px;
    margin: 0 2px;
    background: rgba(64, 158, 255, 0.2);
    border: 1px solid rgba(100, 180, 255, 0.5);
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #dff1ff;
  }
}

// ========== 动画 ==========
@keyframes dn-rotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes dn-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}

// ========== 进出动画 ==========
.nav-fade-enter-active, .nav-fade-leave-active {
  transition: opacity 0.3s ease;
}
.nav-fade-enter-from, .nav-fade-leave-to {
  opacity: 0;
}
.nav-fade-enter-active .dn-card,
.nav-fade-enter-active .dn-center-title,
.nav-fade-enter-active .dn-tips {
  animation: dn-pop 0.4s cubic-bezier(.2,.8,.2,1) both;
}
.nav-fade-leave-active .dn-card,
.nav-fade-leave-active .dn-center-title,
.nav-fade-leave-active .dn-tips {
  animation: dn-pop 0.25s reverse both;
}
@keyframes dn-pop {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
.nav-fade-enter-active .dn-ring--outer { animation: dn-pop 0.5s 0.05s both, dn-rotate 40s linear infinite 0.55s; }
.nav-fade-enter-active .dn-ring--mid   { animation: dn-pop 0.5s 0.1s both; }
.nav-fade-enter-active .dn-ring--inner { animation: dn-pop 0.5s 0.15s both; }

.nav-fade-enter-active .dn-card:nth-child(1) { animation-delay: 0.05s; }
.nav-fade-enter-active .dn-card:nth-child(2) { animation-delay: 0.1s; }
.nav-fade-enter-active .dn-card:nth-child(3) { animation-delay: 0.15s; }
.nav-fade-enter-active .dn-card:nth-child(4) { animation-delay: 0.2s; }
.nav-fade-enter-active .dn-card:nth-child(5) { animation-delay: 0.25s; }
</style>
