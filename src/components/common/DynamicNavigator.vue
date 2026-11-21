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
        <div class="dn-arc" ref="arcRef">
          <div
            v-for="(item, vi) in visibleItems"
            :key="item.key"
            class="dn-card"
            :class="{
              'dn-card--active': vi === activeIdx,
              'dn-card--near': Math.abs(vi - activeIdx) === 1,
              'dn-card--side': Math.abs(vi - activeIdx) === 2,
            }"
            :style="cardStyle(vi)"
            @click="jumpTo(item.key)"
          >
            <div class="dn-card-inner">
              <div class="dn-card-idx">{{ String(vi - activeIdx + currentAbsIdx + 1).padStart(2, '0') }}</div>
              <div class="dn-card-title">{{ item.title }}</div>
              <div class="dn-card-name">{{ item.name }}</div>
            </div>
            <div v-if="vi === activeIdx" class="dn-card-glow"></div>
          </div>
          <!-- 选中项底部指示光 -->
          <div class="dn-indicator"></div>
        </div>

        <!-- 底部快捷键提示 -->
        <div class="dn-tips">
          <span><kbd>Ctrl</kbd>+<kbd>K</kbd> 唤起</span>
          <span><kbd>↑</kbd><kbd>↓</kbd>/滚轮 切换</span>
          <span><kbd>Enter</kbd>/松键 跳转</span>
          <span><kbd>Esc</kbd> 关闭</span>
          <span><kbd>Ctrl</kbd>+<kbd>Tab</kbd> 下一页</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
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
// activeIdx 是当前在「视窗 5 张」里的中心索引（=2 永远是中心）
// currentAbsIdx 是完整 navItems 中当前高亮项的下标
const currentAbsIdx = ref(0)
const activeIdx = 2 // 视窗里中心位置

const visibleItems = computed(() => {
  const total = navItems.value.length
  if (total === 0) return []
  const start = currentAbsIdx.value - 2
  const arr = []
  for (let i = 0; i < 5; i++) {
    let idx = start + i
    // 循环
    if (idx < 0) idx = total + idx
    if (idx >= total) idx = idx - total
    arr.push(navItems.value[idx])
  }
  return arr
})

// ============ 打开/关闭 ============
let holdTimer = null
let keyHeld = false

const open = () => {
  // 定位到当前路由
  const curPath = route.path
  const i = navItems.value.findIndex(n => n.key === curPath)
  currentAbsIdx.value = i >= 0 ? i : 0
  visible.value = true
}
const close = () => {
  visible.value = false
  keyHeld = false
  clearTimeout(holdTimer)
}
const jumpTo = (key) => {
  if (route.path === key) { close(); return }
  router.push(key).then(() => close())
}

// ============ 切换 ============
const move = (delta) => {
  const total = navItems.value.length
  let next = currentAbsIdx.value + delta
  if (next < 0) next = total - 1
  if (next >= total) next = 0
  currentAbsIdx.value = next
}

// ============ 卡片弧形布局（绝对定位 + rotate + translateX） ============
// 视窗 5 张，中心 idx=2，弧半径 R；每张卡片在圆弧上角度 θ = (idx - 2) * step
const cardStyle = (vi) => {
  const step = 18 // 每张间隔 18°
  const R = 560  // 弧半径（px）
  const angle = (vi - activeIdx) * step
  const isActive = vi === activeIdx
  const scale = isActive ? 1.1 : (Math.abs(vi - activeIdx) === 1 ? 0.9 : 0.75)
  const opacity = isActive ? 1 : (Math.abs(vi - activeIdx) === 1 ? 0.85 : 0.55)
  const z = isActive ? 30 : (Math.abs(vi - activeIdx) === 1 ? 20 : 10)
  return {
    transform: `rotate(${angle}deg) translateY(-${R}px) rotate(${-angle}deg) scale(${scale})`,
    opacity,
    zIndex: z,
  }
}

// ============ 键盘事件 ============
const onKeyDown = (e) => {
  // Ctrl+K / ⌘+K 唤起
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    visible.value ? close() : open()
    return
  }
  // Ctrl+Tab 直接切换下一页（不唤起导航器，直接跳）
  if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      const total = navItems.value.length
      let i = navItems.value.findIndex(n => n.key === route.path)
      i = (i - 1 + total) % total
      router.push(navItems.value[i].key)
    } else {
      move(1)
      // 直接跳到下一页，不等释放
      const cur = navItems.value[currentAbsIdx.value]
      if (cur && cur.key !== route.path) router.push(cur.key)
    }
    return
  }

  if (!visible.value) return

  if (e.key === 'Escape') { e.preventDefault(); close(); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); startHold(); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1); startHold(); return }
  if (e.key === 'Enter') { e.preventDefault(); const cur = navItems.value[currentAbsIdx.value]; jumpTo(cur.key); return }
}

// 按下方向键后启动一个延迟计时器：松手（keyup）才跳转；但按住期间只移动光标
const startHold = () => {
  keyHeld = true
  clearTimeout(holdTimer)
}

const onKeyUp = (e) => {
  if (visible.value && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    // 释放按键 → 跳转
    keyHeld = false
    const cur = navItems.value[currentAbsIdx.value]
    if (cur && cur.key !== route.path) jumpTo(cur.key)
  }
}

// ============ 滚轮切换（仅在导航器打开时生效） ============
let wheelLock = false
const onWheel = (e) => {
  if (!visible.value) return
  e.preventDefault()
  if (wheelLock) return
  wheelLock = true
  if (e.deltaY > 0) move(1)
  else move(-1)
  setTimeout(() => { wheelLock = false }, 180)
}

// ============ 路由变化时同步选中项 ============
watch(() => route.path, (p) => {
  if (visible.value) {
    // 路由变化时自动关闭导航器
    nextTick(() => close())
  } else {
    const i = navItems.value.findIndex(n => n.key === p)
    if (i >= 0) currentAbsIdx.value = i
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('wheel', onWheel, { passive: false })
  const i = navItems.value.findIndex(n => n.key === route.path)
  if (i >= 0) currentAbsIdx.value = i
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('wheel', onWheel)
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
  transform-origin: center bottom;
  transition: transform 0.35s cubic-bezier(.2,.8,.2,1), opacity 0.3s;
  cursor: pointer;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(20, 55, 110, 0.85), rgba(10, 30, 70, 0.9));
  border: 1px solid rgba(100, 180, 255, 0.4);
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.5),
    0 0 16px rgba(64, 158, 255, 0.2) inset;
  backdrop-filter: blur(4px);
  overflow: hidden;

  // 卡片上下圆角光晕边
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
}
.dn-card-name {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(180, 220, 255, 0.7);
  letter-spacing: 1px;
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

// 卡片错峰入场
.nav-fade-enter-active .dn-card:nth-child(1) { animation-delay: 0.05s; }
.nav-fade-enter-active .dn-card:nth-child(2) { animation-delay: 0.1s; }
.nav-fade-enter-active .dn-card:nth-child(3) { animation-delay: 0.15s; }
.nav-fade-enter-active .dn-card:nth-child(4) { animation-delay: 0.2s; }
.nav-fade-enter-active .dn-card:nth-child(5) { animation-delay: 0.25s; }
</style>
