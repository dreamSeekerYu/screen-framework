<template>
  <div class="home-stage">
    <!-- 开场 -->
    <div class="intro" :class="{ hide: introHidden }">
      <div class="intro-logo">武汉基地</div>
      <div class="intro-line"></div>
      <div class="intro-sub">质量保障 · 集成工厂周报</div>
    </div>
    <div class="film-grain"></div>

    <!-- 背景层 -->
    <div class="bg" aria-hidden="true">
      <div class="bg-aurora"></div>
      <div class="bg-grid"></div>
      <canvas ref="partsCanvas" class="parts-canvas"></canvas>
      <div class="beam b1"></div>
      <div class="beam b2"></div>
      <div class="beam b3"></div>
      <div class="beam b4"></div>
      <div class="bg-vignette"></div>
      <div class="bg-scan"></div>
    </div>

    <!-- 舞台主体 -->
    <div class="stage">
      <header class="home-header">
        <div class="hd-side left">
          <div class="clock">{{ clockTime }}</div>
        </div>
        <div class="title-wrap">
          <h1>集成工厂 · 质量周报</h1>
        </div>
        <div class="hd-side right">
          <div class="date">{{ clockDate }}</div>
        </div>
        <div class="hd-line"></div>
      </header>

      <div class="ring-wrap" ref="ringWrapRef"
           :class="{ grabbing }"
           @pointerdown="onPointerDown"
           @pointermove="onPointerMove"
           @pointerup="onPointerUp"
           @pointercancel="onPointerUp"
           @wheel="onWheel"
           @click="onClick">
        <div class="ring-tilt" ref="ringTiltRef">
          <div class="orbit-line"></div>
          <div class="orbit-line l2"></div>
          <div class="orbit-halo"></div>
          <div class="ring" ref="ringRef">
            <div v-for="(slot, i) in slots" :key="slot.key"
                 class="slot"
                 ref="slotEls"
                 :data-route="slot.route.path"
                 @click.stop="jumpTo(slot.route)">
              <div class="card" :class="{ spot: i === frontIdx }"
                   :style="{ '--ac': slot.card.color }"
                   @mousemove="onCardMouseMove($event, i)">
                <span class="corner tl"></span>
                <span class="corner tr"></span>
                <span class="corner bl"></span>
                <span class="corner br"></span>
                <div class="card-top">
                  <div>
                    <div class="card-name">{{ slot.card.name }}</div>
                    <span class="card-badge">{{ slot.card.badge }}</span>
                  </div>
                  <span class="card-icon" v-html="slot.card.icon"></span>
                </div>
                <div class="card-desc">{{ slot.card.desc }}</div>
              </div>
            </div>
          </div>

          <!-- 中心 LOGO -->
          <div class="center-logo">
            <div class="logo-calb">CALB</div>
            <!-- <div class="logo-sub">集成工厂质量周报</div> -->
            <div class="logo-ring r1"></div>
            <div class="logo-ring r2"></div>
            <div class="logo-ring r3"></div>
          </div>
        </div>
      </div>

      <footer class="home-footer">
        <span>ORBIT RING HOME</span>
        <span class="sep">|</span>
        <span>拖拽 / 滚轮旋转 · 点击 / 空格进入</span>
        <span class="sep">|</span>
        <span>Alt+K 唤起导航器</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getCssVar } from '@/utils/color.js'

const router = useRouter()

/* ============ 大屏路由：过滤出大屏首页效果展示的页面（与导航器白名单一致） ============ */
const ALL_ROUTES = router.options.routes.filter(r => {
  if (r.meta?.noScale) return false
  // LPA 暂未完成，也不进首页环
  if (r.path === '/LPA') return false
  return true
})
// 首页作为中心 logo，卡片为其他大屏路由
const RING_ROUTES = ALL_ROUTES.filter(r => r.path !== '/')

const ICONS = {
  pack: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M8 5v14M16 5v14"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1 1-1 1.7M12 17h.01"/>',
  cpk: '<path d="M3 20V8M9 20V4M15 20v-9M21 20v-5"/>',
  qc: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 5a3.5 3.5 0 0 1 0 7"/>',
  plain: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  think: '<path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.2c1.8-1.3 3-3.4 3-5.8a7 7 0 0 0-7-7z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  default: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/>'
}
// 卡片主题色：引用全局主题变量，随主题切换自动换色
const COLORS = [
  'var(--color-accent)',
  'var(--color-primary)',
  'var(--color-primary-light)',
  'var(--color-danger)',
  'var(--color-warning)',
  'var(--color-success)'
]
const BADGE_MAP = {
  Pack: 'PACK · 客户',
  Question: '异常 · 闭环',
  Cpk: '过程 · 能力',
  Qc: '人力 · 规划',
  Plain: '工作 · 计划',
  Think: '周度 · 思考'
}
const DESC_MAP = {
  Pack: '5 大客户交付质量表现，月度/周度趋势分析',
  Question: '重大质量异常闭环率、根因对策、进度追踪',
  Cpk: '关键工序过程能力指数 Cpk 达标率与趋势',
  Qc: 'QC 人力配置、缺口分析、离职率与支援来源',
  Plain: '本周重点工作计划与节点跟进',
  Think: '周度思考沉淀与改进方向'
}

function buildCardForRoute(route, idx) {
  const key = route.name?.toLowerCase() || 'default'
  return {
    name: route.meta?.title || route.name,
    badge: BADGE_MAP[route.name] || route.name?.toUpperCase() || 'PAGE',
    desc: DESC_MAP[route.name] || '点击进入该页面',
    icon: ICONS[key] || ICONS.default,
    color: COLORS[idx % COLORS.length]
  }
}

/* ============ 环形轨道状态机（N = 大屏子页面数量，默认 6 个，最多 8） ============ */
const N = Math.max(5, Math.min(8, RING_ROUTES.length))
// 如果实际子页面超过 N，只取前 N 个（按路由表顺序）
const ACTIVE_ROUTES = RING_ROUTES.slice(0, N)
const STEP = 360 / N
const HOLD = 5200
const TRANS = 1350
const mod = (x, n) => ((x % n) + n) % n

// slots 固定顺序（按路由顺序排列）
const slots = reactive(ACTIVE_ROUTES.map((r, i) => ({
  key: r.name + '-' + i,
  route: r,
  card: buildCardForRoute(r, i)
})))

const ringWrapRef = ref(null)
const ringTiltRef = ref(null)
const ringRef = ref(null)
const slotEls = ref([])
const partsCanvas = ref(null)

let rot = 0, fromRot = 0, targetRot = 0
let frontIdx = 0
let state = 'hold', holdStart = 0, transStart = 0
let started = false, transMs = TRANS
let Rpx = 594, tfCur = 0.24, cxo = 0, mxT = 0, myT = 0
let rafId = null

const introHidden = ref(false)
const clockTime = ref('--:--:--')
const clockDate = ref('')
const grabbing = ref(false)

/* ============ 拖拽 / 滚轮 ============ */
let dragging = false, dragMoved = 0, lastPX = 0, lastPT = 0, vel = 0, wheelTimer = null

function enterManual() {
  if (state === 'hold' || state === 'trans') state = 'manual'
}
function manualSnap(extra = 0) {
  fromRot = rot
  const k = Math.round(-rot / STEP) + extra
  targetRot = -k * STEP
  frontIdx = mod(k, N)
  state = 'trans'
  transStart = performance.now()
  transMs = Math.max(420, Math.abs(targetRot - rot) * 2.6 + 220)
}
function onPointerDown(e) {
  if (!started || e.button) return
  dragging = true
  dragMoved = 0
  vel = 0
  lastPX = e.clientX
  lastPT = performance.now()
  try { ringWrapRef.value?.setPointerCapture(e.pointerId) } catch (_) {}
  grabbing.value = true
  enterManual()
}
function onPointerMove(e) {
  if (!dragging) return
  const now = performance.now()
  const dx = e.clientX - lastPX
  lastPX = e.clientX
  vel = dx / Math.max(now - lastPT, 1)
  lastPT = now
  dragMoved += Math.abs(dx)
  rot += dx * 0.25
  mxT = e.clientX / innerWidth - 0.5
  myT = e.clientY / innerHeight - 0.5
}
function endDrag() {
  if (!dragging) return
  dragging = false
  grabbing.value = false
  manualSnap(vel > 0.55 ? -1 : vel < -0.55 ? 1 : 0)
}
function onPointerUp() { endDrag() }
function onWheel(e) {
  if (!started) return
  e.preventDefault()
  const d = Math.max(-240, Math.min(240, e.deltaY || e.deltaX || 0))
  enterManual()
  rot -= d * 0.18
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => { if (state === 'manual') manualSnap(0) }, 170)
}
function onClick(e) {
  // 点到卡片上由卡片自己处理；点到空白区步进一格
  if (dragMoved < 8) step()
}
function step() {
  if (state !== 'hold' || !started) return
  state = 'trans'
  transStart = performance.now()
  fromRot = rot
  targetRot = rot - STEP
  transMs = TRANS
}
function jumpTo(route) {
  if (!route) return
  if (dragMoved > 8) return // 拖拽后的松开误触
  // 若当前 frontIdx 就是它，直接跳；否则先切到它再跳
  const idx = slots.findIndex(s => s.route.path === route.path)
  if (idx === -1) return
  if (idx === frontIdx) {
    if (route.path !== '/') router.push(route.path)
    return
  }
  // 切到该卡片
  fromRot = rot
  const k = idx - frontIdx
  // 选最短路径
  let delta = k
  if (delta > N / 2) delta -= N
  if (delta < -N / 2) delta += N
  targetRot = rot - delta * STEP
  frontIdx = idx
  state = 'trans'
  transStart = performance.now()
  transMs = Math.max(500, Math.abs(targetRot - rot) * 2.6 + 220)
  // 等动画完成后跳转
  setTimeout(() => {
    if (route.path !== '/') router.push(route.path)
  }, transMs + 100)
}

function onCardMouseMove(e, i) {
  const el = slotEls.value[i]
  if (!el) return
  const card = el.querySelector('.card')
  if (!card) return
  const r = card.getBoundingClientRect()
  card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%')
  card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%')
}

/* ============ 时钟 ============ */
let clockTimer = null
function tickClock() {
  const d = new Date()
  const p = v => String(v).padStart(2, '0')
  clockTime.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  clockDate.value = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${'日一二三四五六'[d.getDay()]}`
}

/* ============ 布局 ============ */
function layoutRing() {
  const wrap = ringWrapRef.value
  const tilt = ringTiltRef.value
  if (!wrap || !tilt) return
  const w = wrap.clientWidth
  const cw = Math.max(260, Math.min(420, w * 0.24))
  Rpx = Math.round(cw * 1.32)
  tilt.style.setProperty('--cw', cw + 'px')
  tilt.style.setProperty('--R', Rpx + 'px')
}

/* ============ 粒子（颜色随主题切换） ============ */
let cvCtx = null, W = 0, H = 0, parts = [], SPRITES = {}, rafParts = true
// 粒子色板（"r,g,b" 三元组）与连线色，均在 buildSprites 时按当前主题解析
let SPRITE_COLORS = []
let LINK_RGB = '90,160,255'

function hexToRgbTriplet(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

function resizeCanvas() {
  const cv = partsCanvas.value
  if (!cv) return
  // 以画布元素实际渲染尺寸为准（缩放容器内 innerWidth 不等于容器设计尺寸）
  W = cv.width = cv.clientWidth || innerWidth
  H = cv.height = cv.clientHeight || innerHeight
}
function buildSprites() {
  // 从当前主题读取四个强调色作为粒子色板
  const palette = [
    getCssVar('--color-accent', '#00e5ff'),
    getCssVar('--color-primary', '#3a7bff'),
    getCssVar('--color-primary-light', '#8b5cf6'),
    getCssVar('--color-danger', '#ff3d8b')
  ].map(hexToRgbTriplet)
  LINK_RGB = hexToRgbTriplet(getCssVar('--color-primary', '#3a7bff'))
  SPRITE_COLORS = palette
  palette.forEach(c => {
    const s = document.createElement('canvas')
    s.width = s.height = 16
    const g = s.getContext('2d')
    const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8)
    grad.addColorStop(0, `rgba(${c},.9)`)
    grad.addColorStop(.45, `rgba(${c},.3)`)
    grad.addColorStop(1, `rgba(${c},0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, 16, 16)
    SPRITES[c] = s
  })
}
class P {
  constructor() { this.reset(true) }
  reset(init) {
    this.x = Math.random() * W
    this.y = init ? Math.random() * H : -10
    this.r = Math.random() * 1.6 + 0.4
    this.vy = Math.random() * 0.5 + 0.15
    this.vx = (Math.random() - 0.5) * 0.25
    this.col = SPRITE_COLORS.length
      ? SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)]
      : '58,123,255'
    this.a = Math.random() * 0.6 + 0.2
  }
  step() {
    this.y += this.vy
    this.x += this.vx
    if (this.y > H + 10 || this.x < -10 || this.x > W + 10) this.reset(false)
  }
  draw() {
    cvCtx.globalAlpha = this.a
    cvCtx.drawImage(SPRITES[this.col], this.x - 8, this.y - 8, 16, 16)
    cvCtx.globalAlpha = 1
  }
}
function loopParts() {
  if (!rafParts || !cvCtx) return
  requestAnimationFrame(loopParts)
  cvCtx.clearRect(0, 0, W, H)
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const dx = parts[i].x - parts[j].x
      if (dx > 110 || dx < -110) continue
      const dy = parts[i].y - parts[j].y
      const d2 = dx * dx + dy * dy
      if (d2 < 12000) {
        cvCtx.strokeStyle = `rgba(${LINK_RGB},${0.12 * (1 - d2 / 12000)})`
        cvCtx.lineWidth = 1
        cvCtx.beginPath()
        cvCtx.moveTo(parts[i].x, parts[i].y)
        cvCtx.lineTo(parts[j].x, parts[j].y)
        cvCtx.stroke()
      }
    }
  }
  parts.forEach(p => { p.step(); p.draw() })
}

/* ============ 主循环 ============ */
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

function frame() {
  rafId = requestAnimationFrame(frame)
  if (!started) return
  const now = performance.now()
  if (state === 'hold') {
    if (now - holdStart >= HOLD) step()
  } else if (state === 'manual') {
    const k = Math.round(-rot / STEP)
    if (mod(k, N) !== frontIdx) frontIdx = mod(k, N)
  } else {
    const t = Math.min((now - transStart) / transMs, 1)
    rot = fromRot + (targetRot - fromRot) * easeInOutCubic(t)
    if (t >= 1) {
      rot = targetRot
      frontIdx = mod(Math.round(-rot / STEP), N)
      state = 'hold'
      holdStart = now
      // 自动轮播到达首页卡片时不跳（它就是首页自己）
    }
  }
  // 鼠标视差
  tfCur += ((0.24 - myT * 0.10) - tfCur) * 0.05
  cxo += ((mxT * 36) - cxo) * 0.05
  const wrap = ringWrapRef.value
  const tilt = ringTiltRef.value
  const h = wrap ? wrap.clientHeight : 600
  const cyo = Math.round(h * 0.38 - h * 0.5)
  if (tilt) {
    tilt.style.setProperty('--tf', tfCur.toFixed(3))
    tilt.style.setProperty('--cyo', cyo + 'px')
    tilt.style.transform = `translateX(${cxo.toFixed(1)}px)`
  }
  const els = slotEls.value
  els.forEach((el, i) => {
    if (!el) return
    const a = i * STEP + rot
    const r = a * Math.PI / 180
    const s = Math.sin(r)
    const c = Math.cos(r)
    const depth = (c + 1) / 2
    const sx = s * Rpx
    const sy = c * Rpx * tfCur
    const wave = Math.sin(r * 2 + 1) * 9
    const scale = (0.5 + 0.5 * depth) * (1 + Math.max(0, depth - 0.85) * 0.9)
    el.style.transform =
      `translate(-50%,-50%) translate(${sx.toFixed(1)}px,${(sy + wave + cyo).toFixed(1)}px) scale(${scale.toFixed(3)})`
    el.style.zIndex = Math.round(depth * 100)
    el.style.opacity = (0.14 + 0.86 * depth).toFixed(3)
    el.style.filter = `blur(${((1 - depth) * 3).toFixed(1)}px)`
    // 高亮态
    const card = el.querySelector('.card')
    if (card) card.classList.toggle('spot', i === frontIdx)
  })
}

function onKey(e) {
  if (e.code === 'Space') { e.preventDefault(); step() }
}
function onResize() { resizeCanvas(); layoutRing() }
function onMouseMove(e) {
  mxT = e.clientX / innerWidth - 0.5
  myT = e.clientY / innerHeight - 0.5
}

function onThemeChange() {
  buildSprites()
  // 已有粒子迁移到新色板，避免引用失效的精灵
  parts.forEach(p => { p.col = SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)] })
}

onMounted(() => {
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
  buildSprites()
  resizeCanvas()
  cvCtx = partsCanvas.value.getContext('2d')
  for (let i = 0; i < 80; i++) parts.push(new P())
  loopParts()
  layoutRing()
  addEventListener('resize', onResize)
  addEventListener('keydown', onKey)
  addEventListener('mousemove', onMouseMove)
  window.addEventListener('themechange', onThemeChange)
  // 开场
  setTimeout(() => {
    introHidden.value = true
    started = true
    state = 'hold'
    holdStart = performance.now()
    rafId = requestAnimationFrame(frame)
  }, 1800)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (rafId) cancelAnimationFrame(rafId)
  rafParts = false
  removeEventListener('resize', onResize)
  removeEventListener('keydown', onKey)
  removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('themechange', onThemeChange)
  clearTimeout(wheelTimer)
})
</script>

<style scoped lang="scss">
/* 页面被 App 的 ScreenContainer 缩放包裹：使用 absolute + 100% 而非 fixed/vw，
   否则 100vw 以真实视口计算，在非 1920 窗口下与缩放容器错位（表现为页面区域偏移/色差） */
.home-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg-page);
  background: var(--bg-page-gradient);
  font-family: "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
  color: var(--color-text-primary);
  /* 霓虹语义色 → 全部派生自全局主题变量，随主题切换 */
  --cyan: var(--color-accent);
  --blue: var(--color-primary);
  --violet: var(--color-primary-light);
  --pink: var(--color-danger);
  --gold: var(--color-warning);
  --green: var(--color-success);
  --text: var(--color-text-primary);
  --dim: var(--color-text-muted);
  --card-glass: color-mix(in srgb, var(--color-bg-card) 82%, transparent);
  --line: var(--color-border-light);
  /* 暗角：深色主题下压边，浅色主题下减弱避免灰蒙蒙 */
  --vignette-c: rgba(0, 0, 0, 0.5);
}

:global(html[data-theme='light-business']) .home-stage { --vignette-c: rgba(31, 41, 72, 0.16); }
:global(html[data-theme='light-cyan']) .home-stage { --vignette-c: rgba(16, 58, 58, 0.16); }

/* ============ 背景层 ============ */
.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.bg-aurora {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(60% 50% at 15% 20%, color-mix(in srgb, var(--blue) 16%, transparent), transparent 60%),
    radial-gradient(50% 45% at 85% 15%, color-mix(in srgb, var(--violet) 14%, transparent), transparent 60%),
    radial-gradient(55% 50% at 60% 90%, color-mix(in srgb, var(--pink) 10%, transparent), transparent 60%);
  filter: blur(30px);
  animation: auroraDrift 22s ease-in-out infinite alternate;
}
@keyframes auroraDrift {
  0%   { transform: translate3d(0,0,0) scale(1); }
  50%  { transform: translate3d(2%,-2%,0) scale(1.06); }
  100% { transform: translate3d(-2%,2%,0) scale(1.03); }
}
.bg-grid {
  position: absolute;
  inset: -64px;
  background-image:
    linear-gradient(color-mix(in srgb, var(--blue) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--blue) 6%, transparent) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%);
  animation: gridScroll 30s linear infinite;
}
@keyframes gridScroll { to { transform: translate3d(64px, 64px, 0); } }
.parts-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.bg-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, var(--vignette-c) 100%);
}
.bg-scan {
  position: absolute;
  inset: 0;
  opacity: .35;
  background: repeating-linear-gradient(0deg, transparent 0 3px, color-mix(in srgb, var(--text) 2%, transparent) 3px 4px);
}
.beam {
  position: absolute;
  top: -30%;
  width: 1px;
  height: 160%;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--cyan) 28%, transparent), transparent);
  animation: beamMove 9s linear infinite;
  opacity: 0;
}
.beam.b1 { left: 12%; }
.beam.b2 { left: 38%; animation-delay: 3s; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--pink) 22%, transparent), transparent); }
.beam.b3 { left: 63%; animation-delay: 5s; }
.beam.b4 { left: 86%; animation-delay: 7s; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--violet) 22%, transparent), transparent); }
@keyframes beamMove {
  0%   { opacity: 0; transform: translateY(-10%); }
  8%   { opacity: 1; }
  92%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(10%); }
}
.film-grain {
  position: absolute;
  inset: -100px;
  z-index: 50;
  pointer-events: none;
  opacity: .05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  animation: grain .5s steps(4) infinite;
}
@keyframes grain {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-30px, 20px); }
  50%  { transform: translate(20px, -25px); }
  75%  { transform: translate(-15px, -10px); }
  100% { transform: translate(0, 0); }
}

/* ============ 开场 ============ */
.intro {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: var(--color-bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 26px;
  transition: opacity .8s ease, visibility .8s;
}
.intro.hide { opacity: 0; visibility: hidden; }
.intro-logo {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 24px;
  background: linear-gradient(180deg, var(--text), color-mix(in srgb, var(--blue) 45%, #ffffff) 60%, var(--blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 40px color-mix(in srgb, var(--blue) 50%, transparent));
  animation: logoIn 1.6s ease both;
}
@keyframes logoIn {
  0%   { opacity: 0; letter-spacing: 60px; filter: blur(10px); }
  100% { opacity: 1; letter-spacing: 24px; }
}
.intro-sub {
  font-size: 12px;
  letter-spacing: 10px;
  color: var(--dim);
  animation: subIn 1.2s ease .5s both;
}
@keyframes subIn { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform:none; } }
.intro-line {
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cyan), transparent);
  animation: lineIn 1.4s ease .7s forwards;
}
@keyframes lineIn { to { width: 420px; } }

/* ============ 舞台 ============ */
.stage {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

/* ============ 头部 ============ */
.home-header {
  position: relative;
  height: 84px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 44px;
}
.title-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}
h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 12px;
  background: linear-gradient(180deg, var(--text) 20%, color-mix(in srgb, var(--blue) 45%, #ffffff) 60%, var(--blue) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 24px color-mix(in srgb, var(--blue) 45%, transparent));
}
.hd-side {
  display: flex;
  gap: 24px;
  align-items: center;
  min-width: 260px;
}
.hd-side.right { justify-content: flex-end; }
.clock {
  font-family: "Consolas", monospace;
  font-size: 20px;
  color: color-mix(in srgb, var(--blue) 30%, var(--text));
  text-shadow: 0 0 12px color-mix(in srgb, var(--blue) 60%, transparent);
}
.date { font-size: 11px; color: var(--dim); letter-spacing: 2px; text-align: right; }
.hd-line {
  position: absolute;
  left: 44px;
  right: 44px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cyan) 30%, var(--violet) 60%, transparent);
  opacity: .5;
}

/* ============ 环形舞台 ============ */
.ring-wrap {
  flex: 1;
  position: relative;
  perspective: 1750px;
  overflow: hidden;
  cursor: grab;
}
.ring-wrap.grabbing { cursor: grabbing; }
.ring-tilt {
  position: absolute;
  inset: 0;
  will-change: transform;
}
.ring { position: absolute; inset: 0; }
.slot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--cw);
  will-change: transform, opacity;
  cursor: pointer;
}
.orbit-line {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--cyo, 0px));
  pointer-events: none;
  border-radius: 50%;
  width: calc(var(--R) * 2.7);
  height: calc(var(--R) * 2.7 * var(--tf,.24));
  transform: translate(-50%,-50%);
  border: 1px solid color-mix(in srgb, var(--cyan) 20%, transparent);
  box-shadow: 0 0 30px color-mix(in srgb, var(--blue) 10%, transparent), inset 0 0 30px color-mix(in srgb, var(--blue) 8%, transparent);
}
.orbit-line.l2 {
  width: calc(var(--R) * 3.4);
  height: calc(var(--R) * 3.4 * var(--tf,.24));
  border-color: color-mix(in srgb, var(--violet) 14%, transparent);
}
.orbit-halo {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--cyo, 0px));
  width: calc(var(--R) * 2.4);
  height: calc(var(--R) * 2.4 * var(--tf,.24));
  transform: translate(-50%,-50%);
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--blue) 16%, transparent) 0%, color-mix(in srgb, var(--blue) 5%, transparent) 45%, transparent 72%);
  animation: haloPulse 4s ease-in-out infinite;
}
@keyframes haloPulse {
  50% { opacity: .6; transform: translate(-50%,-50%) scale(1.05); }
}

/* ============ 中心 LOGO ============ */
.center-logo {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  z-index: 60;
}
.logo-calb {
  font-size: 84px;
  font-weight: 900;
  letter-spacing: 14px;
  background: linear-gradient(180deg, var(--text) 20%, color-mix(in srgb, var(--blue) 45%, #ffffff) 55%, var(--blue) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 28px color-mix(in srgb, var(--blue) 55%, transparent));
}
.logo-sub {
  margin-top: 14px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 10px;
  color: color-mix(in srgb, var(--blue) 25%, var(--text));
  text-shadow: 0 0 16px color-mix(in srgb, var(--blue) 50%, transparent);
}
.logo-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--cyan) 35%, transparent);
  transform: translate(-50%,-50%);
  pointer-events: none;
}
.logo-ring.r1 { width: 380px; height: 380px; box-shadow: 0 0 30px color-mix(in srgb, var(--blue) 15%, transparent); }
.logo-ring.r2 {
  width: 470px; height: 470px;
  border-style: dashed;
  border-color: color-mix(in srgb, var(--violet) 25%, transparent);
  animation: spin 40s linear infinite;
}
.logo-ring.r3 {
  width: 560px; height: 560px;
  border-color: color-mix(in srgb, var(--cyan) 18%, transparent);
  box-shadow: 0 0 40px color-mix(in srgb, var(--blue) 10%, transparent);
}
@keyframes spin { to { transform: translate(-50%,-50%) rotate(360deg); } }

/* ============ 卡片 ============ */
.card {
  position: relative;
  border-radius: 14px;
  padding: 18px 22px;
  overflow: hidden;
  height: 100%;
  background: var(--card-glass);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 1;
  transition: border-color .4s ease, box-shadow .4s ease;
}
.card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ac, var(--cyan)), transparent);
  opacity: .8;
}
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(300px 200px at var(--mx,50%) var(--my,50%),
              color-mix(in srgb, var(--ac, var(--cyan)) 13%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity .4s;
}
.card:hover::after { opacity: 1; }
.corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: var(--ac, var(--cyan));
  opacity: .85;
}
.corner.tl { top:7px; left:7px; border-top:2px solid; border-left:2px solid; }
.corner.tr { top:7px; right:7px; border-top:2px solid; border-right:2px solid; }
.corner.bl { bottom:7px; left:7px; border-bottom:2px solid; border-left:2px solid; }
.corner.br { bottom:7px; right:7px; border-bottom:2px solid; border-right:2px solid; }
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.card-name {
  font-size: 22px;
  color: var(--text);
  letter-spacing: 3px;
  font-weight: 700;
  text-shadow: 0 0 14px color-mix(in srgb, var(--ac, var(--cyan)) 40%, transparent);
}
.card-badge {
  display: inline-block;
  margin-top: 8px;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 20px;
  letter-spacing: 2px;
  background: color-mix(in srgb, var(--ac) 15%, transparent);
  color: var(--ac);
  border: 1px solid color-mix(in srgb, var(--ac) 40%, transparent);
}
.card-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--ac, var(--cyan)) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--ac, var(--cyan)) 35%, transparent);
}
.card-icon :deep(svg) {
  width: 24px; height: 24px;
  stroke: var(--ac, var(--cyan));
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 6px var(--ac, var(--cyan)));
}
.card-desc {
  margin-top: 18px;
  font-size: 13px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--blue) 30%, var(--color-text-secondary));
  letter-spacing: 1px;
}
.card.spot {
  border-color: color-mix(in srgb, var(--ac) 75%, transparent) !important;
  box-shadow:
    0 0 44px color-mix(in srgb, var(--ac) 30%, transparent),
    inset 0 0 30px color-mix(in srgb, var(--ac) 10%, transparent) !important;
}
.card.spot .card-name {
  animation: namePulse 1.8s ease infinite;
}
@keyframes namePulse {
  50% { text-shadow: 0 0 22px var(--ac), 0 0 40px var(--ac); }
}

/* ============ 底栏 ============ */
.home-footer {
  flex: 0 0 auto;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 11px;
  letter-spacing: 4px;
  color: color-mix(in srgb, var(--dim) 70%, transparent);
}
.home-footer .sep { color: color-mix(in srgb, var(--dim) 40%, transparent); }
</style>
