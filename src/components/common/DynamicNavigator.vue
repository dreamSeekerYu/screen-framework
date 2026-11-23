<template>
  <Teleport to="body">
    <div v-show="visible" class="dynav" ref="wrapRef">
      <canvas ref="canvasRef" class="dynav-canvas"></canvas>
      <div class="dynav-hint">
        <kbd>Alt</kbd>+<kbd>K</kbd> 唤起/关闭 ·
        <kbd>↑</kbd><kbd>↓</kbd> 或 滚轮 选择 ·
        <kbd>Enter</kbd> 跳转 ·
        <kbd>Alt</kbd>+<kbd>[</kbd><kbd>]</kbd> 直接翻页
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

// ---- 主题色板：canvas 无法识别 var()，在每次 draw 时通过 getCssVar 读取实时主题色 ----
import { getCssVar } from '@/utils/color'

// 把任意颜色（hex / rgb(a) 字符串）转为指定透明度版本
function alphaColor(color, a) {
  const c = (color || '').trim()
  if (c.startsWith('#')) {
    let h = c.slice(1)
    if (h.length === 3) h = h.split('').map((x) => x + x).join('')
    const n = parseInt(h, 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s.trim()))
    return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${a})`
  }
  return c
}

function toRgb(color) {
  const c = (color || '').trim()
  if (c.startsWith('#')) {
    let h = c.slice(1)
    if (h.length === 3) h = h.split('').map((x) => x + x).join('')
    const n = parseInt(h, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s.trim()))
    return [p[0], p[1], p[2]]
  }
  return [0, 0, 0]
}

// canvas 内等价于 color-mix(in srgb, B w%, A) 的混色
function colorMixVar(a, b, w) {
  const [r1, g1, b1] = toRgb(a)
  const [r2, g2, b2] = toRgb(b)
  return `rgb(${Math.round(r1 * (1 - w) + r2 * w)}, ${Math.round(g1 * (1 - w) + g2 * w)}, ${Math.round(b1 * (1 - w) + b2 * w)})`
}

function readPalette() {
  return {
    overlay: getCssVar('--overlay-bg', 'rgba(0, 0, 0, 0.5)'),
    primary: getCssVar('--color-primary', '#2f54eb'),
    primaryLight: getCssVar('--color-primary-light', '#597ef7'),
    primaryDark: getCssVar('--color-primary-dark', '#1d39c4'),
    accent: getCssVar('--color-accent', '#13c2c2'),
    bgElevated: getCssVar('--color-bg-elevated', '#122d52'),
    text: getCssVar('--color-text-primary', '#ffffff'),
  }
}

// 主题切换时重绘（canvas 每帧都会重新读色板，这里只负责在主题变化时强制刷新一帧）
function redrawOnThemeChange() {
  if (visible.value) {
    cancelAnimationFrame(rafId)
    lastT = 0
    rafId = requestAnimationFrame(draw)
  }
}
watch(() => themeStore.currentTheme, redrawOnThemeChange)

const visible = ref(false)
const wrapRef = ref(null)
const canvasRef = ref(null)
let ctx = null
let dpr = 1
let W = 0
let H = 0
let rafId = 0
let lastT = 0
const dashOffset = ref(0)
let animScale = 0
let animatingCard = false
let cardAnimT = 0
let lastRenderedAbs = -1
let targetAbsIdx = 0
let displayAbsIdx = 0

let pendingIdx = null
let arrowHeld = false
let wakeLock = 0

const PARTICLES = 60
const particles = []

function initParticles() {
  particles.length = 0
  for (let i = 0; i < PARTICLES; i++) {
    particles.push({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
      a: Math.random() * 0.6 + 0.2,
      ph: Math.random() * Math.PI * 2,
    })
  }
}

// 大屏业务页白名单：按展示顺序排列，不在名单中的页面（组件演示页等）不出现在导航器里
const NAV_ROUTES = [
  { path: '/',      key: 'Home',     title: '大屏首页',   subtitle: 'Dashboard' },
  { path: '/pack',  key: 'Pack',     title: '客户表现',   subtitle: 'PACK' },
  { path: '/question', key: 'Question', title: '异常闭环', subtitle: 'Question' },
  { path: '/cpk',   key: 'Cpk',      title: '过程能力',   subtitle: 'CPK' },
  { path: '/qc',    key: 'Qc',       title: '人力规划',   subtitle: 'QC HR' },
  { path: '/plain', key: 'Plain',    title: '工作计划',   subtitle: 'Plan' },
  { path: '/think', key: 'Think',    title: '周度思考',   subtitle: 'Thinking' },
  // { path: '/LPA',   key: 'LPA',      title: '过程审核',   subtitle: 'LPA' },
]

function getRoutes() {
  // 以白名单为准，只有真实存在的路由才显示（避免页面未开发时出现空链接）
  const existing = new Set((router.options.routes || []).map(r => r.path))
  return NAV_ROUTES.filter(r => existing.has(r.path)).map(r => ({
    path: r.path,
    name: r.title,
    sub: r.subtitle,
  }))
}

function currentIndex(routes) {
  const p = route.path
  const i = routes.findIndex((r) => r.path === p)
  return i < 0 ? 0 : i
}

function resize() {
  if (!canvasRef.value) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  canvasRef.value.width = W * dpr
  canvasRef.value.height = H * dpr
  canvasRef.value.style.width = W + 'px'
  canvasRef.value.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// 弧面梯形卡片（顶边/底边为同心圆弧，左右为径向直边，四角大圆角）
// 圆心 (cx,cy)；R1=内弧（顶边）半径，R2=外弧（底边）半径；
// centerAng=卡片中心角(弧度，90°=正下)；cardAng=卡片跨角(不含圆角的直边夹角)；
// rOut=外(底)角圆角半径，rIn=内(顶)角圆角半径。
function drawArcTrapezoid(cx, cy, R1, R2, centerAng, cardAng, rOut, rIn) {
  const halfAng = cardAng / 2
  const aL = centerAng - halfAng   // 左侧径向方向角
  const aR = centerAng + halfAng   // 右侧径向方向角

  // 四个圆角圆心：沿径向方向从弧上缩进圆角半径的距离
  // 外角：圆心在 R2 - rOut 半径上
  // 内角：圆心在 R1 + rIn 半径上
  const cOutL = { x: cx + Math.cos(aL) * (R2 - rOut), y: cy + Math.sin(aL) * (R2 - rOut) }
  const cOutR = { x: cx + Math.cos(aR) * (R2 - rOut), y: cy + Math.sin(aR) * (R2 - rOut) }
  const cInR  = { x: cx + Math.cos(aR) * (R1 + rIn), y: cy + Math.sin(aR) * (R1 + rIn) }
  const cInL  = { x: cx + Math.cos(aL) * (R1 + rIn), y: cy + Math.sin(aL) * (R1 + rIn) }

  // 径向直边与内外弧的切点（未圆角时的四个角点）
  const pOutL0 = { x: cx + Math.cos(aL) * R2, y: cy + Math.sin(aL) * R2 }
  const pOutR0 = { x: cx + Math.cos(aR) * R2, y: cy + Math.sin(aR) * R2 }
  const pInR0  = { x: cx + Math.cos(aR) * R1, y: cy + Math.sin(aR) * R1 }
  const pInL0  = { x: cx + Math.cos(aL) * R1, y: cy + Math.sin(aL) * R1 }

  // 圆角在径向边上的切点：沿径向从弧切点向圆角圆心移动 rOut/rIn
  const pOutL_edge = { x: cOutL.x + Math.cos(aL) * rOut, y: cOutL.y + Math.sin(aL) * rOut } // = pOutL0
  const pOutR_edge = { x: cOutR.x - Math.cos(aR) * rOut, y: cOutR.y - Math.sin(aR) * rOut } // = pOutR0
  const pInR_edge  = { x: cInR.x  - Math.cos(aR) * rIn,  y: cInR.y  - Math.sin(aR) * rIn }  // = pInR0
  const pInL_edge  = { x: cInL.x  + Math.cos(aL) * rIn,  y: cInL.y  + Math.sin(aL) * rIn }  // = pInL0

  // 圆角在弧上的切点：从圆心(cx,cy)指向圆角圆心方向，再沿径向向外(内)移动 rOut/rIn 距离到弧上
  const pOutL_arc  = { x: cOutL.x + (cOutL.x - cx) / (R2 - rOut) * rOut, y: cOutL.y + (cOutL.y - cy) / (R2 - rOut) * rOut }
  const pOutR_arc  = { x: cOutR.x + (cOutR.x - cx) / (R2 - rOut) * rOut, y: cOutR.y + (cOutR.y - cy) / (R2 - rOut) * rOut }
  const pInR_arc   = { x: cInR.x  - (cInR.x  - cx) / (R1 + rIn)  * rIn,  y: cInR.y  - (cInR.y  - cy) / (R1 + rIn)  * rIn }
  const pInL_arc   = { x: cInL.x  - (cInL.x  - cx) / (R1 + rIn)  * rIn,  y: cInL.y  - (cInL.y  - cy) / (R1 + rIn)  * rIn }

  ctx.beginPath()
  // 1. 起点：左下外圆角在径向边上的切点
  ctx.moveTo(pOutL_edge.x, pOutL_edge.y)
  // 2. 左下外圆角：圆心 cOutL，半径 rOut，从径向边切点沿顺时针画到外弧切点
  ctx.arc(cOutL.x, cOutL.y, rOut,
          Math.atan2(pOutL_edge.y - cOutL.y, pOutL_edge.x - cOutL.x),
          Math.atan2(pOutL_arc.y  - cOutL.y, pOutL_arc.x  - cOutL.x), false)
  // 3. 底边外弧（R2）：从左下弧切点沿 R2 顺时针画到右下弧切点
  ctx.arc(cx, cy, R2,
          Math.atan2(pOutL_arc.y - cy, pOutL_arc.x - cx),
          Math.atan2(pOutR_arc.y - cy, pOutR_arc.x - cx), false)
  // 4. 右下外圆角
  ctx.arc(cOutR.x, cOutR.y, rOut,
          Math.atan2(pOutR_arc.y  - cOutR.y, pOutR_arc.x  - cOutR.x),
          Math.atan2(pOutR_edge.y - cOutR.y, pOutR_edge.x - cOutR.x), false)
  // 5. 右侧径向直边：到右上内圆角的径向边切点
  ctx.lineTo(pInR_edge.x, pInR_edge.y)
  // 6. 右上内圆角：圆心 cInR，半径 rIn，注意径向方向是从内向外=指向外弧
  ctx.arc(cInR.x, cInR.y, rIn,
          Math.atan2(pInR_edge.y - cInR.y, pInR_edge.x - cInR.x),
          Math.atan2(pInR_arc.y  - cInR.y, pInR_arc.x  - cInR.x), false)
  // 7. 顶边内弧（R1，逆时针）：从右内切点沿 R1 画到左内切点
  ctx.arc(cx, cy, R1,
          Math.atan2(pInR_arc.y - cy, pInR_arc.x - cx),
          Math.atan2(pInL_arc.y - cy, pInL_arc.x - cx), true)
  // 8. 左上内圆角
  ctx.arc(cInL.x, cInL.y, rIn,
          Math.atan2(pInL_arc.y  - cInL.y, pInL_arc.x  - cInL.x),
          Math.atan2(pInL_edge.y - cInL.y, pInL_edge.x - cInL.x), false)
  // 9. 左侧径向直边：回到起点
  ctx.lineTo(pOutL_edge.x, pOutL_edge.y)
  ctx.closePath()
}

function draw(t) {
  if (!ctx) return
  const dt = lastT ? t - lastT : 16
  lastT = t

  // 每帧读取实时主题色（主题切换后无需额外处理即可生效）
  const C = readPalette()

  ctx.clearRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2
  // 整体尺寸：整体视觉直径 ≈ 页面的 1/2
  const vmin = Math.min(W, H)

  // ---- 背景：中心聚焦 + 周边半透明渐隐（基于主题遮罩色 --overlay-bg） ----
  const focusR = vmin * 0.36
  const bgGrad = ctx.createRadialGradient(cx, cy, focusR * 0.3, cx, cy, Math.max(W, H) * 0.8)
  bgGrad.addColorStop(0, alphaColor(C.overlay, 0.92))
  bgGrad.addColorStop(0.35, alphaColor(C.overlay, 0.72))
  bgGrad.addColorStop(0.6, alphaColor(C.overlay, 0.28))
  bgGrad.addColorStop(1, alphaColor(C.overlay, 0))
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 网格
  ctx.strokeStyle = alphaColor(C.primary, 0.08)
  ctx.lineWidth = 1
  const gs = 60
  ctx.beginPath()
  for (let x = 0; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
  for (let y = 0; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
  ctx.stroke()

  // 四角光晕
  const cornerGlow = (x, y, rx, ry, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  cornerGlow(0, 0, 500, 400, alphaColor(C.primaryLight, 0.25))
  cornerGlow(W, 0, 500, 400, alphaColor(C.primary, 0.22))
  cornerGlow(W, H, 500, 400, alphaColor(C.primaryDark, 0.2))
  cornerGlow(0, H, 500, 400, alphaColor(C.primary, 0.2))

  // 左上角小柱图
  ctx.save()
  ctx.globalAlpha = 0.32
  const barX = 60, barY = H - 180
  const barH = [20, 40, 28, 55, 70, 50, 85, 100, 75, 120]
  barH.forEach((h, i) => {
    const grad = ctx.createLinearGradient(0, barY - h, 0, barY)
    grad.addColorStop(0, alphaColor(C.primaryLight, 0.9))
    grad.addColorStop(1, alphaColor(C.primaryDark, 0.2))
    ctx.fillStyle = grad
    ctx.fillRect(barX + i * 14, barY - h, 10, h)
  })
  ctx.restore()

  // 右上角小柱图
  ctx.save()
  ctx.globalAlpha = 0.28
  const barX2 = W - 220, barY2 = H - 120
  const barH2 = [30, 60, 45, 80, 55, 95, 70, 110]
  barH2.forEach((h, i) => {
    const grad = ctx.createLinearGradient(0, barY2 - h, 0, barY2)
    grad.addColorStop(0, alphaColor(C.accent, 0.9))
    grad.addColorStop(1, alphaColor(C.primaryDark, 0.2))
    ctx.fillStyle = grad
    ctx.fillRect(barX2 + i * 18, barY2 - h, 12, h)
  })
  ctx.restore()

  // 入场缩放
  const sc = animScale
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(sc, sc)
  ctx.translate(-cx, -cy)

  // 整体尺寸：中心亮圆 + 外圈
  const innerR = vmin * 0.085
  const midR = innerR * 1.28
  const outerR = innerR * 1.62

  // ====== 托盘大弧几何（与中心圆不同心） ======
  // 关键：卡片弧的圆心 arcC 不在屏幕中心 (cx,cy)，而是**上移**到中心圆上方很远；
  //       弧向下凸（∩ 形/手掌形），在中心圆下方只"露"出一小段平缓的托弧，
  //       形成"大半径、小弧度、从下方托举中心圆"的视觉。
  //
  //   (cx, cy - arcOffsetY) = arcC ── 卡片托盘弧的圆心（屏幕中心正上方很远）
  //        │
  //        │ arcOffsetY (向下偏移量，越大弧越平)
  //        ▼
  //   (cx, cy) ── 中心 CALB 圆圆心
  //        │
  //        │ cardYAtCenter
  //        ▼
  //   选中卡（位于弧最低点） → (cx, cy + cardYAtCenter)
  //
  // 以 arcC 为圆心、arcR 为半径画圆；在这个大圆上取一小段（±arcHalfSpan 角）
  // 位于中心圆下方的弧 → 就是"托举"中心圆的浅托盘。
  //
  // 几何关系：选中卡是弧上最低点，arcCy + arcR = cy + cardYAtCenter
  //           arcCy = cy - arcOffsetY → arcR - arcOffsetY = cardYAtCenter
  //           → arcOffsetY = arcR - cardYAtCenter
  const cardYAtCenter = vmin * 0.20   // 选中卡中线在中心圆下方多远（从 cy 往下量）
  const arcR          = vmin * 1.20   // 托盘弧半径（很大 → 弧度平缓）
  const arcOffsetY    = arcR - cardYAtCenter  // 弧心上移距离
  const arcCx         = cx
  const arcCy         = cy - arcOffsetY       // 弧心位置（屏幕中心正上方很远）
  const arcHalfSpan   = Math.PI * 0.17        // 托盘弧可见半角（≈30°，弧度很小）

  // ---- 三层同心圆 ----
  // 内层亮环
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  const inG = ctx.createRadialGradient(cx, cy, innerR - 20, cx, cy, innerR + 4)
  inG.addColorStop(0, alphaColor(C.accent, 0))
  inG.addColorStop(0.85, alphaColor(C.accent, 0.5))
  inG.addColorStop(1, alphaColor(C.primaryLight, 0.95))
  ctx.strokeStyle = inG
  ctx.lineWidth = 2.5
  ctx.shadowColor = alphaColor(C.accent, 0.9)
  ctx.shadowBlur = 20
  ctx.stroke()
  ctx.shadowBlur = 0

  // 中层实环
  ctx.beginPath()
  ctx.arc(cx, cy, midR, 0, Math.PI * 2)
  const midG = ctx.createLinearGradient(cx - midR, cy, cx + midR, cy)
  midG.addColorStop(0, alphaColor(C.primary, 0.2))
  midG.addColorStop(0.5, alphaColor(C.primaryLight, 0.8))
  midG.addColorStop(1, alphaColor(C.primary, 0.2))
  ctx.strokeStyle = midG
  ctx.lineWidth = 2
  ctx.shadowColor = alphaColor(C.primaryLight, 0.7)
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.shadowBlur = 0

  // 外层虚线自转环
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(dashOffset.value)
  ctx.beginPath()
  ctx.arc(0, 0, outerR, 0, Math.PI * 2)
  ctx.setLineDash([8, 14])
  ctx.strokeStyle = alphaColor(C.primaryLight, 0.55)
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // ---- 两条斜向光束 ----
  const pulse = 0.45 + 0.25 * Math.sin(t * 0.0015)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(cx, cy)
  for (let a of [-Math.PI / 4, Math.PI / 4]) {
    ctx.save()
    ctx.rotate(a)
    const beam = ctx.createLinearGradient(-outerR * 1.6, 0, outerR * 1.6, 0)
    beam.addColorStop(0, alphaColor(C.primaryLight, 0))
    beam.addColorStop(0.45, alphaColor(C.primaryLight, 0.25 * pulse))
    beam.addColorStop(0.5, alphaColor(C.accent, 0.55 * pulse))
    beam.addColorStop(0.55, alphaColor(C.primaryLight, 0.25 * pulse))
    beam.addColorStop(1, alphaColor(C.primaryLight, 0))
    ctx.fillStyle = beam
    ctx.fillRect(-outerR * 1.6, -1, outerR * 3.2, 2)
    ctx.restore()
  }
  ctx.restore()

  // ---- 粒子 ----
  particles.forEach((p) => {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.x > 1.2) p.x = -1.2
    if (p.x < -1.2) p.x = 1.2
    if (p.y > 1.2) p.y = -1.2
    if (p.y < -1.2) p.y = 1.2
    const px = cx + p.x * W / 2
    const py = cy + p.y * H / 2
    const alpha = p.a * (0.6 + 0.4 * Math.sin(t * 0.002 + p.ph))
    ctx.beginPath()
    ctx.arc(px, py, p.r, 0, Math.PI * 2)
    ctx.fillStyle = alphaColor(C.primaryLight, alpha)
    ctx.shadowColor = alphaColor(C.accent, 0.8)
    ctx.shadowBlur = 6
    ctx.fill()
  })
  ctx.shadowBlur = 0

  // ---- 中心文字 ----
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 54px Arial Black, "Helvetica Neue", sans-serif'
  const calbGrad = ctx.createLinearGradient(cx, cy - 45, cx, cy + 12)
  calbGrad.addColorStop(0, C.text)
  calbGrad.addColorStop(0.45, C.primaryLight)
  calbGrad.addColorStop(0.55, alphaColor(C.primaryLight, 0.9))
  calbGrad.addColorStop(1, C.primaryDark)
  ctx.fillStyle = calbGrad
  ctx.shadowColor = alphaColor(C.primaryLight, 0.9)
  ctx.shadowBlur = 14
  ctx.strokeStyle = alphaColor(C.primaryLight, 0.7)
  ctx.lineWidth = 1
  ctx.strokeText('CALB', cx, cy - 18)
  ctx.fillText('CALB', cx, cy - 18)
  ctx.shadowBlur = 0

  ctx.font = 'bold 26px "Microsoft YaHei", "PingFang SC", sans-serif'
  const subGrad = ctx.createLinearGradient(cx, cy + 6, cx, cy + 48)
  subGrad.addColorStop(0, C.text)
  subGrad.addColorStop(1, C.primaryLight)
  ctx.fillStyle = subGrad
  ctx.shadowColor = alphaColor(C.primaryLight, 0.8)
  ctx.shadowBlur = 12
  ctx.fillText('集成工厂质量周报', cx, cy + 30)
  ctx.shadowBlur = 0
  ctx.restore()

  // ---- 卡片排布（水平扁宽瓦片形：顶边水平、底边圆弧贴合发光带，文字横排不倾斜） ----
  const routes = getRoutes()
  const n = routes.length
  if (n === 0) {
    ctx.restore()
    rafId = requestAnimationFrame(draw)
    return
  }
  if (animatingCard) {
    cardAnimT += dt / CARD_ANIM_MS
    if (cardAnimT >= 1) {
      cardAnimT = 1
      animatingCard = false
      displayAbsIdx = targetAbsIdx
    } else {
      const k = 1 - Math.pow(1 - cardAnimT, 3)
      displayAbsIdx = lastRenderedAbs + (targetAbsIdx - lastRenderedAbs) * k
    }
  } else {
    displayAbsIdx = targetAbsIdx
  }

  // ====== 卡片布局：沿"上移弧心"的大托盘弧分布 ======
  // 每张卡片是一段同心圆弧扇片（以 arcC 为圆心），左右边沿径向（指向 arcC），
  // 顶底是大半径同心圆的圆弧；因弧半径很大、跨度角很小，卡片外观接近水平扁宽玻璃瓦片，
  // 但左右边保持径向垂直于弧切线 → 整体像被一个平缓大弧从下方"托"住中心圆。
  //
  // 角度约定（在以 arcC 为原点的极坐标里，0=右、π/2=下、π=左、-π/2=上）：
  //   正下方（选中卡位置，弧最低点）ang = +π/2（向下指屏幕下方）
  //   向左/向右各 k 张 = ang = π/2 ± k*stepAng
  // 可见 5 张在 ±arcHalfSpan 范围内（约 ±30°），之外自然渐隐。
  const stepAng     = arcHalfSpan * 2 / 7 // 8张均匀铺满比可见区稍大一点的范围（≈15°/步）
  const cardSpan    = stepAng * 0.70      // 卡片自身跨角（留出间隙 ≈30%）
  const cardRadialH = vmin * 0.052        // 卡片径向厚度（垂直于大弧方向），半径大→视觉上很扁
  const rCornerOut  = vmin * 0.010
  const rCornerIn   = vmin * 0.006

  // 底部贯穿发光弧带（贴合卡片外弧下方，位于托盘弧外弧之外，即 R 更大的同圆弧）
  ctx.save()
  const bandR2 = arcR + cardRadialH * 0.5 + 4
  const bandG2 = ctx.createRadialGradient(arcCx, arcCy, bandR2 - 8, arcCx, arcCy, bandR2 + 12)
  bandG2.addColorStop(0, alphaColor(C.accent, 0))
  bandG2.addColorStop(0.5, alphaColor(C.accent, 0.95))
  bandG2.addColorStop(1, alphaColor(C.primaryLight, 0))
  ctx.strokeStyle = bandG2
  ctx.lineWidth = 5
  ctx.shadowColor = alphaColor(C.accent, 0.95)
  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(arcCx, arcCy, bandR2,
          Math.PI/2 - arcHalfSpan * 1.08,
          Math.PI/2 + arcHalfSpan * 1.08)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()

  // 遍历全部卡片（8 路由沿大托盘弧均匀分布；选中卡固定在弧最低点）
  for (let k = -(n - 1); k <= n - 1; k++) {
    const realIdx = Math.round(displayAbsIdx) + k
    const modIdx  = ((realIdx % n) + n) % n
    const route   = routes[modIdx]
    const dist    = Math.abs(k)

    // 选中卡在弧最低点（相对 arcC 的正下方，即 +π/2），其他按 stepAng 沿大弧向两侧排布
    const ang = Math.PI / 2 + k * stepAng

    // 衰减：大弧度下 dist>=3 的卡离弧可见区较远，直接隐藏
    let alpha, scale, extraR
    if (dist === 0)      { alpha = 1.00; scale = 1.12; extraR = vmin * 0.015 }
    else if (dist === 1) { alpha = 0.85; scale = 0.95; extraR = 0 }
    else if (dist === 2) { alpha = 0.55; scale = 0.82; extraR = -vmin * 0.008 }
    else                 { alpha = 0;    scale = 0.70; extraR = -vmin * 0.020 }
    if (alpha <= 0.005) continue

    // 卡片内外弧半径（以 arcC 为圆心）
    const midRc = arcR + extraR
    const hR    = cardRadialH * scale * 0.5
    const R1    = midRc - hR              // 内弧（靠近 arcC → 屏幕上方、靠近中心圆）
    const R2    = midRc + hR              // 外弧（远离 arcC → 屏幕下方、朝外）
    const spanA = cardSpan * scale
    const ro    = rCornerOut * scale
    const ri    = rCornerIn * scale

    ctx.save()
    ctx.globalAlpha = alpha * sc

    // 选中卡底部向外发光（朝外下方，即从 arcC 指向 +π/2 方向）
    if (dist === 0) {
      const bp = 0.5 + 0.35 * Math.sin(t * 0.004)
      const bx = arcCx + Math.cos(ang) * (R2 + 22)
      const by = arcCy + Math.sin(ang) * (R2 + 22)
      const beamG = ctx.createRadialGradient(bx, by, 2, bx, by, 55)
      beamG.addColorStop(0, alphaColor(C.accent, 0.80 * bp))
      beamG.addColorStop(1, alphaColor(C.primary, 0))
      ctx.fillStyle = beamG
      ctx.beginPath()
      ctx.arc(bx, by, 55, 0, Math.PI * 2)
      ctx.fill()
    }

    // ---- 卡片填充（以 arcC 为圆心的弧面扇段） ----
    drawArcTrapezoid(arcCx, arcCy, R1, R2, ang, spanA, ro, ri)
    const fillGrad = ctx.createRadialGradient(arcCx, arcCy, R1, arcCx, arcCy, R2)
    if (dist === 0) {
      fillGrad.addColorStop(0, alphaColor(C.primaryDark, 0.85))
      fillGrad.addColorStop(0.55, alphaColor(C.primary, 0.90))
      fillGrad.addColorStop(1, alphaColor(C.primaryLight, 0.88))
    } else {
      // 非选中卡：悬浮卡面（--color-bg-elevated）+ 主色微光
      fillGrad.addColorStop(0, alphaColor(C.bgElevated, 0.85))
      fillGrad.addColorStop(0.5, alphaColor(colorMixVar(C.bgElevated, C.primary, 0.15), 0.55))
      fillGrad.addColorStop(1, alphaColor(C.bgElevated, 0.80))
    }
    ctx.fillStyle = fillGrad
    ctx.fill()

    // ---- 内高光（靠近中心圆一侧的内弧边白色反光带，即卡片顶边） ----
    ctx.save()
    ctx.globalAlpha = dist === 0 ? 0.28 : 0.15
    ctx.beginPath()
    const hlR1 = R1 + 2
    const hlR2 = R1 + (R2 - R1) * 0.22
    drawArcTrapezoid(arcCx, arcCy, hlR1, hlR2, ang, spanA * 0.96, ri * 0.5, ri * 0.3)
    const hlG = ctx.createRadialGradient(arcCx, arcCy, hlR1, arcCx, arcCy, hlR2)
    const hlBase = colorMixVar(C.accent, '#ffffff', 0.7)
    hlG.addColorStop(0, alphaColor(hlBase, 0.85))
    hlG.addColorStop(1, alphaColor(hlBase, 0))
    ctx.fillStyle = hlG
    ctx.fill()
    ctx.restore()

    // ---- 双层描边 ----
    drawArcTrapezoid(arcCx, arcCy, R1, R2, ang, spanA, ro, ri)
    ctx.strokeStyle = dist === 0
      ? alphaColor(C.accent, 0.95)
      : alphaColor(C.primaryLight, 0.55)
    ctx.lineWidth = dist === 0 ? 2.2 : 1.3
    ctx.shadowColor = dist === 0 ? alphaColor(C.accent, 0.9) : alphaColor(C.primary, 0.35)
    ctx.shadowBlur = dist === 0 ? 16 : 5
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.save()
    ctx.globalAlpha = dist === 0 ? 0.50 : 0.22
    ctx.beginPath()
    drawArcTrapezoid(arcCx, arcCy, R1 + 2, R2 - 3, ang, spanA * 0.94, Math.max(2, ro - 3), Math.max(2, ri - 3))
    ctx.strokeStyle = alphaColor(colorMixVar(C.accent, '#ffffff', 0.8), 0.95)
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()

    // ---- 卡片文字：位于扇段几何中心，沿大弧切线方向旋转 ----
    // 切线方向 = 垂直于 arcC→卡片 径向；即 ang + π/2（沿弧顺时针方向）
    const name = route.name
    const fs = dist === 0 ? 20 : (dist === 1 ? 16 : 14)
    const tx = arcCx + Math.cos(ang) * midRc
    const ty = arcCy + Math.sin(ang) * midRc
    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(ang - Math.PI / 2)   // 文字基线沿大弧切线方向（顺时针方向沿弧）
    ctx.font = `bold ${fs}px "Microsoft YaHei", "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = dist === 0 ? '#ffffff' : alphaColor(C.text, 0.92)
    ctx.shadowColor = alphaColor(C.primary, 0.75)
    ctx.shadowBlur = dist === 0 ? 10 : 4
    ctx.fillText(name, 0, 0)
    ctx.shadowBlur = 0
    ctx.restore()

    ctx.restore()
  }

  ctx.restore()

  dashOffset.value += 0.0008 * dt

  if (visible.value) {
    if (animScale < 1) animScale = Math.min(1, animScale + dt / 420)
    rafId = requestAnimationFrame(draw)
  }
}

function openNav() {
  if (visible.value) { closeNav(); return }
  const routes = getRoutes()
  const ci = currentIndex(routes)
  targetAbsIdx = ci
  displayAbsIdx = ci
  lastRenderedAbs = ci
  pendingIdx = ci
  animatingCard = false
  cardAnimT = 0
  animScale = 0
  wakeLock = performance.now()
  arrowHeld = false
  initParticles()
  visible.value = true
  nextTick(() => {
    resize()
    cancelAnimationFrame(rafId)
    lastT = 0
    rafId = requestAnimationFrame(draw)
  })
}

function closeNav(commit = false) {
  if (commit && pendingIdx !== null) {
    const routes = getRoutes()
    const n = routes.length
    const idx = ((pendingIdx % n) + n) % n
    if (routes[idx] && routes[idx].path !== route.path) {
      router.push(routes[idx].path)
    }
  }
  visible.value = false
  cancelAnimationFrame(rafId)
  pendingIdx = null
  arrowHeld = false
  animScale = 0
  clearTimeout(autoCommitTimer)
  autoCommitTimer = null
}

// 延迟提交：等卡片切换动画（500ms）走完并短暂停留再自动跳转+收起，
// 让用户能看清卡片滑入到目标位、选中高亮脉冲的完整过程。
let autoCommitTimer = null
const CARD_ANIM_MS = 720
const HOLD_AFTER_MS = 360  // 动画结束后短暂停留再收起，给用户看清最终选中态
const COMMIT_DELAY_MS = CARD_ANIM_MS + HOLD_AFTER_MS
function scheduleAutoCommit() {
  clearTimeout(autoCommitTimer)
  autoCommitTimer = setTimeout(() => {
    if (visible.value && pendingIdx !== null) closeNav(true)
    autoCommitTimer = null
  }, COMMIT_DELAY_MS)
}

function move(delta) {
  if (!visible.value) return
  if (animatingCard) return
  const routes = getRoutes()
  const n = routes.length
  if (n === 0) return
  lastRenderedAbs = displayAbsIdx
  const base = pendingIdx !== null ? pendingIdx : targetAbsIdx
  pendingIdx = base + delta
  targetAbsIdx = pendingIdx
  animatingCard = true
  cardAnimT = 0
  // 连续切换时不断重置自动提交计时器，等最后一次动画走完再跳转
  scheduleAutoCommit()
}

function onKeyDown(e) {
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return

  if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && (e.key === 'k' || e.key === 'K')) {
    if (e.repeat) return
    e.preventDefault(); e.stopPropagation()
    openNav(); return
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === '[') {
    if (e.repeat) return
    e.preventDefault(); e.stopPropagation()
    const routes = getRoutes(); const n = routes.length; const ci = currentIndex(routes)
    const next = (ci - 1 + n) % n
    if (routes[next]) router.push(routes[next].path)
    return
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === ']') {
    if (e.repeat) return
    e.preventDefault(); e.stopPropagation()
    const routes = getRoutes(); const n = routes.length; const ci = currentIndex(routes)
    const next = (ci + 1) % n
    if (routes[next]) router.push(routes[next].path)
    return
  }
  if (!visible.value) return

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    if (e.repeat) { e.preventDefault(); return }
    e.preventDefault(); e.stopPropagation()
    arrowHeld = true; move(1); return
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    if (e.repeat) { e.preventDefault(); return }
    e.preventDefault(); e.stopPropagation()
    arrowHeld = true; move(-1); return
  }
  if (e.key === 'Enter') {
    if (e.repeat) return
    e.preventDefault()
    // Enter 确认：重置自动计时器，等选中高亮脉冲结束再跳转
    scheduleAutoCommit()
    return
  }
  if (e.key === 'Escape') {
    if (e.repeat) return
    e.preventDefault(); closeNav(false); return
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    arrowHeld = false
    // 松开方向键时不立刻跳转——复用 scheduleAutoCommit，
    // 让最后一次 move 触发的卡片滑动动画完整播完再提交，
    // 避免"按一下就瞬间跳走"的问题。
    if (visible.value && pendingIdx !== null) scheduleAutoCommit()
    return
  }
  if (e.key === 'Alt' && visible.value && arrowHeld) {
    arrowHeld = false
    if (pendingIdx !== null) scheduleAutoCommit()
  }
}

let wheelLock = 0
function onWheel(e) {
  if (!visible.value) return
  const now = performance.now()
  if (now - wakeLock < 280) { e.preventDefault(); return }
  if (now - wheelLock < 260) { e.preventDefault(); return }
  wheelLock = now
  e.preventDefault()
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 5) {
    move(e.deltaY > 0 ? 1 : -1)
  }
}

function onClick(e) {
  if (!visible.value) return
  if (e.target === canvasRef.value || e.target === wrapRef.value) closeNav(false)
}

function onResize() { if (visible.value) resize() }
function onBlur() { if (visible.value) closeNav(false) }

onMounted(() => {
  nextTick(() => {
    if (canvasRef.value) ctx = canvasRef.value.getContext('2d')
    resize()
  })
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('blur', onBlur)
  window.addEventListener('themechange', redrawOnThemeChange)
  document.addEventListener('click', onClick)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKeyDown, true)
  window.removeEventListener('keyup', onKeyUp, true)
  window.removeEventListener('wheel', onWheel, { passive: false, capture: true })
  window.removeEventListener('resize', onResize)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('themechange', redrawOnThemeChange)
  document.removeEventListener('click', onClick)
  clearTimeout(autoCommitTimer)
})
</script>

<style scoped lang="scss">
.dynav {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: transparent;
  pointer-events: auto;
  animation: dn-fade 0.32s ease-out;
}
@keyframes dn-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.dynav-canvas {
  position: absolute;
  inset: 0;
  display: block;
}
.dynav-hint {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: "Microsoft YaHei", sans-serif;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px color-mix(in srgb, #000 60%, transparent);
  user-select: none;
  pointer-events: none;
  kbd {
    display: inline-block;
    padding: 2px 8px;
    margin: 0 2px;
    border-radius: 4px;
    background: linear-gradient(180deg,
        color-mix(in srgb, var(--color-primary) 40%, transparent),
        color-mix(in srgb, var(--color-primary-dark) 40%, transparent));
    border: 1px solid color-mix(in srgb, var(--color-primary-light) 50%, transparent);
    color: var(--color-text-primary);
    font-size: 12px;
    font-family: "SF Mono", Consolas, monospace;
    box-shadow: 0 2px 6px color-mix(in srgb, #000 40%, transparent);
  }
}
</style>
