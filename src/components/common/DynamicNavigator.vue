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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

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
  { path: '/LPA',   key: 'LPA',      title: '过程审核',   subtitle: 'LPA' },
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

  ctx.clearRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2
  // 整体尺寸：整体视觉直径 ≈ 页面的 1/2
  const vmin = Math.min(W, H)

  // ---- 背景：中心聚焦 + 周边半透明渐隐（非全屏深色遮罩） ----
  const focusR = vmin * 0.36
  const bgGrad = ctx.createRadialGradient(cx, cy, focusR * 0.3, cx, cy, Math.max(W, H) * 0.8)
  bgGrad.addColorStop(0, 'rgba(5, 20, 50, 0.92)')
  bgGrad.addColorStop(0.35, 'rgba(6, 22, 52, 0.72)')
  bgGrad.addColorStop(0.6, 'rgba(4, 14, 36, 0.28)')
  bgGrad.addColorStop(1, 'rgba(2, 8, 22, 0)')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 网格
  ctx.strokeStyle = 'rgba(120, 180, 255, 0.08)'
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
  cornerGlow(0, 0, 500, 400, 'rgba(40, 120, 255, 0.25)')
  cornerGlow(W, 0, 500, 400, 'rgba(20, 80, 200, 0.22)')
  cornerGlow(W, H, 500, 400, 'rgba(10, 60, 160, 0.2)')
  cornerGlow(0, H, 500, 400, 'rgba(30, 100, 220, 0.2)')

  // 左上角小柱图
  ctx.save()
  ctx.globalAlpha = 0.32
  const barX = 60, barY = H - 180
  const barH = [20, 40, 28, 55, 70, 50, 85, 100, 75, 120]
  barH.forEach((h, i) => {
    const grad = ctx.createLinearGradient(0, barY - h, 0, barY)
    grad.addColorStop(0, 'rgba(80,180,255,0.9)')
    grad.addColorStop(1, 'rgba(20,80,180,0.2)')
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
    grad.addColorStop(0, 'rgba(80,200,255,0.9)')
    grad.addColorStop(1, 'rgba(20,100,200,0.2)')
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

  // 整体尺寸：中心亮圆 + 外圈 + 卡片弧
  const innerR = vmin * 0.085
  const midR = innerR * 1.28
  const outerR = innerR * 1.62
  const cardR = vmin * 0.20       // 卡片弧半径（整体视觉直径 ≈ 2*(cardR+ch/2) ≈ vmin*0.48 ≈ 1/2 视口）

  // ---- 三层同心圆 ----
  // 内层亮环
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  const inG = ctx.createRadialGradient(cx, cy, innerR - 20, cx, cy, innerR + 4)
  inG.addColorStop(0, 'rgba(120, 200, 255, 0)')
  inG.addColorStop(0.85, 'rgba(140, 220, 255, 0.5)')
  inG.addColorStop(1, 'rgba(180, 230, 255, 0.95)')
  ctx.strokeStyle = inG
  ctx.lineWidth = 2.5
  ctx.shadowColor = 'rgba(120, 220, 255, 0.9)'
  ctx.shadowBlur = 20
  ctx.stroke()
  ctx.shadowBlur = 0

  // 中层实环
  ctx.beginPath()
  ctx.arc(cx, cy, midR, 0, Math.PI * 2)
  const midG = ctx.createLinearGradient(cx - midR, cy, cx + midR, cy)
  midG.addColorStop(0, 'rgba(40, 120, 220, 0.2)')
  midG.addColorStop(0.5, 'rgba(80, 170, 255, 0.8)')
  midG.addColorStop(1, 'rgba(40, 120, 220, 0.2)')
  ctx.strokeStyle = midG
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(60, 150, 255, 0.7)'
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
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.55)'
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
    beam.addColorStop(0, 'rgba(100, 190, 255, 0)')
    beam.addColorStop(0.45, `rgba(140, 220, 255, ${0.25 * pulse})`)
    beam.addColorStop(0.5, `rgba(200, 240, 255, ${0.55 * pulse})`)
    beam.addColorStop(0.55, `rgba(140, 220, 255, ${0.25 * pulse})`)
    beam.addColorStop(1, 'rgba(100, 190, 255, 0)')
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
    ctx.fillStyle = `rgba(160, 220, 255, ${alpha})`
    ctx.shadowColor = 'rgba(120, 200, 255, 0.8)'
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
  calbGrad.addColorStop(0, '#e8f4ff')
  calbGrad.addColorStop(0.45, '#9ec8ff')
  calbGrad.addColorStop(0.55, '#c9e2ff')
  calbGrad.addColorStop(1, '#3a6bb5')
  ctx.fillStyle = calbGrad
  ctx.shadowColor = 'rgba(100, 180, 255, 0.9)'
  ctx.shadowBlur = 14
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)'
  ctx.lineWidth = 1
  ctx.strokeText('CALB', cx, cy - 18)
  ctx.fillText('CALB', cx, cy - 18)
  ctx.shadowBlur = 0

  ctx.font = 'bold 26px "Microsoft YaHei", "PingFang SC", sans-serif'
  const subGrad = ctx.createLinearGradient(cx, cy + 6, cx, cy + 48)
  subGrad.addColorStop(0, '#ffffff')
  subGrad.addColorStop(1, '#9ecbff')
  ctx.fillStyle = subGrad
  ctx.shadowColor = 'rgba(100, 180, 255, 0.8)'
  ctx.shadowBlur = 12
  ctx.fillText('集成工厂质量周报', cx, cy + 30)
  ctx.shadowBlur = 0
  ctx.restore()

  // ---- 卡片排布（弧面梯形 + 超大圆角 + 文字跟随卡片倾斜） ----
  const routes = getRoutes()
  const n = routes.length
  if (n === 0) {
    ctx.restore()
    rafId = requestAnimationFrame(draw)
    return
  }
  if (animatingCard) {
    cardAnimT += dt / 380
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

  const visibleCount = 5
  const halfSpan = Math.floor(visibleCount / 2) // 2
  // 弧角度（极坐标：0=右，π/2=下，π=左）——5 张卡片更宽，需要更大弧度
  const startAngle = Math.PI * 0.85   // 左下 153°
  const endAngle = Math.PI * 0.15     // 右下 27°
  const arcSpan = startAngle - endAngle
  const step = arcSpan / (visibleCount - 1)

  // 卡片几何参数（弧扇梯形：顶/底为同心圆弧，侧边沿径向，自然贴合发光弧带）
  const cardR_bot  = vmin * 0.36    // 卡片底边(外弧)所在圆半径——贴合发光环带
  const cardH_rad  = vmin * 0.072   // 卡片径向高度（外弧-内弧）——更扁，贴近原型比例
  const cardR_top  = cardR_bot - cardH_rad
  const cardAngHalf= 0.21           // 单片卡片占半弧角——更宽
  const cardCorner = cardH_rad * 0.45 // 四角圆角半径
  // 几何常量（绘制时用，不再每卡重算）
  const _cosA = Math.cos(cardAngHalf)
  const _sinA = Math.sin(cardAngHalf)

  // 底部贯穿发光弧带（与卡片底边共圆，完全贴合）
  ctx.save()
  const bandR = cardR_bot + 3
  const botG = ctx.createRadialGradient(cx, cy, bandR - 8, cx, cy, bandR + 12)
  botG.addColorStop(0, 'rgba(100, 200, 255, 0)')
  botG.addColorStop(0.5, 'rgba(120, 215, 255, 0.95)')
  botG.addColorStop(1, 'rgba(180, 235, 255, 0)')
  ctx.strokeStyle = botG
  ctx.lineWidth = 7
  ctx.shadowColor = 'rgba(100, 200, 255, 0.95)'
  ctx.shadowBlur = 28
  ctx.beginPath()
  ctx.arc(cx, cy, bandR, endAngle - cardAngHalf - 0.04, startAngle + cardAngHalf + 0.04)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()

  for (let i = 0; i < visibleCount; i++) {
    let realIdx = Math.round(displayAbsIdx) - halfSpan + i
    let rel = realIdx - displayAbsIdx
    let modIdx = ((realIdx % n) + n) % n
    const route = routes[modIdx]

    const dist = Math.abs(rel)
    let scale, alpha, extraR
    if (dist <= 0.5)      { scale = 1.10; alpha = 1;    extraR = 6 }
    else if (dist <= 1.5) { scale = 0.90; alpha = 0.80; extraR = -4 }
    else                  { scale = 0.70; alpha = 0.50; extraR = -12 }

    const ang = startAngle - i * step

    // 单片卡片实际半径（随选中状态上下浮动，让选中卡略微向外弹出）
    const rBot  = (cardR_bot + extraR) * scale
    const rTop  = rBot - cardH_rad * scale
    const aHalf = cardAngHalf / scale * 0.85   // 缩放时保持卡片"看着大小一致"，aHalf 反变
    const rCorn = cardCorner * scale

    // 卡片中心位置（用 rBot - cardH_rad/2 作为定位锚点，即卡片径向中点）
    const centerR = (rBot + rTop) / 2
    const px = cx + Math.cos(ang) * centerR
    const py = cy + Math.sin(ang) * centerR

    ctx.save()
    ctx.globalAlpha = alpha * sc

    // 选中卡底部向外发光光束（沿径向向外）
    if (dist <= 0.5) {
      const bp = 0.5 + 0.35 * Math.sin(t * 0.004)
      const beamG = ctx.createRadialGradient(0, cardH_rad * scale * 0.5 + 4, 2, 0, cardH_rad * scale * 0.5 + 22, 80)
      beamG.addColorStop(0, `rgba(140, 225, 255, ${0.8 * bp})`)
      beamG.addColorStop(1, 'rgba(80, 160, 255, 0)')
      ctx.fillStyle = beamG
      ctx.translate(px, py)
      ctx.rotate(ang - Math.PI / 2)
      ctx.beginPath()
      ctx.ellipse(0, cardH_rad * scale * 0.5 + 22, rBot * Math.sin(aHalf) * 0.7, 34, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = alpha * sc
    }

    // ---- 画卡片主体：同心圆弧梯形 + 四角圆角 ----
    // 不再使用 translate+rotate 的本地矩形，而是直接在全局坐标以 (cx,cy) 为圆心画弧扇梯形
    // 四个角点（未圆角前的"梯形"顶点，在以(cx,cy)为原点的极坐标中）：
    //   底右：(rBot, ang - aHalf)    底左：(rBot, ang + aHalf)
    //   顶左：(rTop, ang + aHalf)    顶右：(rTop, ang - aHalf)
    // 画圆圆角思路：在每个角点处，沿两条相邻边向内切长度 = rCorn，用半径 rCorn 的圆弧连接两个切点。

    // 四个角点坐标（全局）
    const pBR = { x: cx + Math.cos(ang - aHalf) * rBot, y: cy + Math.sin(ang - aHalf) * rBot }
    const pBL = { x: cx + Math.cos(ang + aHalf) * rBot, y: cy + Math.sin(ang + aHalf) * rBot }
    const pTL = { x: cx + Math.cos(ang + aHalf) * rTop, y: cy + Math.sin(ang + aHalf) * rTop }
    const pTR = { x: cx + Math.cos(ang - aHalf) * rTop, y: cy + Math.sin(ang - aHalf) * rTop }

    // 每条边上的两个"圆角切点"：从角点沿边向内退 rCorn 的位置
    // 切向单位向量（沿弧切线方向，即垂直径向，逆时针为正）
    // 径向单位向量 u_rad(θ) = (cosθ, sinθ)，切向单位向量 u_tan(θ) = (-sinθ, cosθ)（指向θ增大方向即逆时针）
    function uRad(theta){ return {x:Math.cos(theta), y:Math.sin(theta)} }
    function uTan(theta){ return {x:-Math.sin(theta), y:Math.cos(theta)} }
    function addP(p, u, s){ return {x:p.x+u.x*s, y:p.y+u.y*s} }

    // 外弧（底边）：角点 pBR（θ=ang-aHalf, r=rBot）、pBL（θ=ang+aHalf, r=rBot）
    //   右下切点（底边上的切向内退 rCorn）：θ = ang - aHalf + rCorn/rBot
    //   左下切点：θ = ang + aHalf - rCorn/rBot
    // 内弧（顶边）：角点 pTR（θ=ang-aHalf, r=rTop）、pTL（θ=ang+aHalf, r=rTop）
    //   右上切点：θ = ang - aHalf + rCorn/rTop
    //   左上切点：θ = ang + aHalf - rCorn/rTop
    const tBR_bot = ang - aHalf + rCorn / rBot
    const tBL_bot = ang + aHalf - rCorn / rBot
    const tTR_top = ang - aHalf + rCorn / rTop
    const tTL_top = ang + aHalf - rCorn / rTop

    // 四个切点坐标
    const T_BR_bot = { x: cx + Math.cos(tBR_bot) * rBot, y: cy + Math.sin(tBR_bot) * rBot }
    const T_BL_bot = { x: cx + Math.cos(tBL_bot) * rBot, y: cy + Math.sin(tBL_bot) * rBot }
    const T_TL_top = { x: cx + Math.cos(tTL_top) * rTop, y: cy + Math.sin(tTL_top) * rTop }
    const T_TR_top = { x: cx + Math.cos(tTR_top) * rTop, y: cy + Math.sin(tTR_top) * rTop }

    // 右侧直边（外弧右下 → 内弧右上，沿径向 rBot→rTop 在 θ=ang-aHalf 射线上）：
    //   右下直边切点：pBR 沿径向向内退 rCorn，即 r = rBot - rCorn
    //   右上直边切点：pTR 沿径向向外退 rCorn，即 r = rTop + rCorn
    const T_BR_side = { x: cx + Math.cos(ang - aHalf) * (rBot - rCorn), y: cy + Math.sin(ang - aHalf) * (rBot - rCorn) }
    const T_TR_side = { x: cx + Math.cos(ang - aHalf) * (rTop + rCorn), y: cy + Math.sin(ang - aHalf) * (rTop + rCorn) }

    // 左侧直边（内弧左上 → 外弧左下，沿径向 rTop→rBot 在 θ=ang+aHalf 射线上）：
    //   左上直边切点：pTL 沿径向向外退 rCorn，r = rTop + rCorn
    //   左下直边切点：pBL 沿径向向内退 rCorn，r = rBot - rCorn
    const T_TL_side = { x: cx + Math.cos(ang + aHalf) * (rTop + rCorn), y: cy + Math.sin(ang + aHalf) * (rTop + rCorn) }
    const T_BL_side = { x: cx + Math.cos(ang + aHalf) * (rBot - rCorn), y: cy + Math.sin(ang + aHalf) * (rBot - rCorn) }

    // 路径：右下底切 → 外(底)弧 → 左下底切 → 左下圆角 → 左下侧切 → 左直边 → 左上侧切 → 左上圆角 → 左上顶切 → 内(顶)弧(反向) → 右上顶切 → 右上圆角 → 右上侧切 → 右直边 → 右下侧切 → 右下圆角 → 回到起点
    ctx.beginPath()
    // 起点：右下底切（外弧右端）
    ctx.moveTo(T_BR_bot.x, T_BR_bot.y)
    // 1. 外弧（底边）：从右下底切 → 左下底切，逆时针方向画（θ从tBR_bot到tBL_bot）
    ctx.arc(cx, cy, rBot, tBR_bot, tBL_bot, false)
    // 2. 左下角圆角：在 T_BL_bot → T_BL_side 之间，半径 rCorn
    //    圆角圆心 = pBL 沿角平分线向内退 rCorn/ cos(φ/2)。更简单用 arcTo：先 lineTo 到角点，再 arcTo 到下一边切点。
    ctx.lineTo(pBL.x, pBL.y)
    ctx.arcTo(pBL.x, pBL.y, T_TL_side.x, T_TL_side.y, rCorn)
    // 3. 左直边：左下侧切 → 左上侧切（沿径向向内）
    ctx.lineTo(T_TL_side.x, T_TL_side.y)
    // 4. 左上角圆角
    ctx.lineTo(pTL.x, pTL.y)
    ctx.arcTo(pTL.x, pTL.y, T_TL_top.x, T_TL_top.y, rCorn)
    // 5. 内弧（顶边）：从左上顶切 → 右上顶切，顺时针方向（θ从tTL_top到tTR_top）
    ctx.arc(cx, cy, rTop, tTL_top, tTR_top, true)
    // 6. 右上角圆角
    ctx.lineTo(pTR.x, pTR.y)
    ctx.arcTo(pTR.x, pTR.y, T_TR_side.x, T_TR_side.y, rCorn)
    // 7. 右直边：右上侧切 → 右下侧切（沿径向向外）
    ctx.lineTo(T_BR_side.x, T_BR_side.y)
    // 8. 右下角圆角
    ctx.lineTo(pBR.x, pBR.y)
    ctx.arcTo(pBR.x, pBR.y, T_BR_bot.x, T_BR_bot.y, rCorn)
    ctx.closePath()

    // 填充（径向渐变：从圆心向外，模拟玻璃弧面的明暗——内弧较亮、外弧较深）
    if (dist <= 0.5) {
      const grad = ctx.createRadialGradient(cx, cy, rTop - 4, cx, cy, rBot + 4)
      grad.addColorStop(0, 'rgba(110, 200, 255, 0.92)')
      grad.addColorStop(0.45, 'rgba(50, 140, 252, 0.95)')
      grad.addColorStop(1, 'rgba(15, 70, 180, 0.92)')
      ctx.fillStyle = grad
      ctx.shadowColor = 'rgba(80, 180, 255, 1)'
      ctx.shadowBlur = 28
    } else {
      const grad = ctx.createRadialGradient(cx, cy, rTop - 4, cx, cy, rBot + 4)
      grad.addColorStop(0, 'rgba(65, 120, 205, 0.72)')
      grad.addColorStop(1, 'rgba(22, 45, 110, 0.78)')
      ctx.fillStyle = grad
      ctx.shadowColor = 'rgba(40, 100, 200, 0.4)'
      ctx.shadowBlur = 12
    }
    ctx.fill()
    ctx.shadowBlur = 0

    // 玻璃高光：顶部（内弧）一道亮白反光
    ctx.save()
    ctx.clip()
    // 在内弧附近画一个环形亮带，宽度约为卡片径向高度的 40%
    const hi = ctx.createRadialGradient(cx, cy, rTop, cx, cy, rTop + cardH_rad * scale * 0.5)
    hi.addColorStop(0, 'rgba(255,255,255,0.45)')
    hi.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hi
    ctx.beginPath()
    ctx.arc(cx, cy, rTop + cardH_rad * scale * 0.5, ang - aHalf - 0.02, ang + aHalf + 0.02)
    ctx.arc(cx, cy, rTop - 2, ang + aHalf + 0.02, ang - aHalf - 0.02, true)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // 外层发光描边
    ctx.lineWidth = dist <= 0.5 ? 2.2 : 1.4
    ctx.strokeStyle = dist <= 0.5 ? 'rgba(215, 240, 255, 0.95)' : 'rgba(140, 200, 255, 0.55)'
    ctx.shadowColor = dist <= 0.5 ? 'rgba(150, 225, 255, 0.9)' : 'rgba(80, 160, 220, 0.3)'
    ctx.shadowBlur = dist <= 0.5 ? 10 : 6
    ctx.stroke()
    ctx.shadowBlur = 0
    // 内层亮白细边（玻璃高光边框）：沿原路径向内缩 2px 再描一次
    ctx.save()
    ctx.clip()
    ctx.lineWidth = 0.8
    ctx.strokeStyle = 'rgba(230, 245, 255, 0.55)'
    // 简化处理：原路径再描一遍细白线（依靠 clip 限制在卡内，视觉上形成内亮边）
    ctx.beginPath()
    ctx.moveTo(T_BR_bot.x, T_BR_bot.y)
    ctx.arc(cx, cy, rBot, tBR_bot, tBL_bot, false)
    ctx.lineTo(pBL.x, pBL.y)
    ctx.arcTo(pBL.x, pBL.y, T_TL_side.x, T_TL_side.y, Math.max(1, rCorn - 2))
    ctx.lineTo(T_TL_side.x, T_TL_side.y)
    ctx.lineTo(pTL.x, pTL.y)
    ctx.arcTo(pTL.x, pTL.y, T_TL_top.x, T_TL_top.y, Math.max(1, rCorn - 2))
    ctx.arc(cx, cy, rTop, tTL_top, tTR_top, true)
    ctx.lineTo(pTR.x, pTR.y)
    ctx.arcTo(pTR.x, pTR.y, T_TR_side.x, T_TR_side.y, Math.max(1, rCorn - 2))
    ctx.lineTo(T_BR_side.x, T_BR_side.y)
    ctx.lineTo(pBR.x, pBR.y)
    ctx.arcTo(pBR.x, pBR.y, T_BR_bot.x, T_BR_bot.y, Math.max(1, rCorn - 2))
    ctx.closePath()
    ctx.stroke()
    ctx.restore()

    // 卡片文字：translate 到卡片径向中点 + rotate 到切线方向（文字自然随卡片倾斜）
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(ang - Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(18 * Math.min(scale, 1.08))}px "Microsoft YaHei", "PingFang SC", sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 4
    ctx.fillText(route.name, 0, 0)
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
    e.preventDefault(); closeNav(true); return
  }
  if (e.key === 'Escape') {
    if (e.repeat) return
    e.preventDefault(); closeNav(false); return
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    arrowHeld = false
    if (visible.value) closeNav(true)
    return
  }
  if (e.key === 'Alt' && visible.value && arrowHeld) {
    arrowHeld = false; closeNav(true)
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
    clearTimeout(onWheel._t)
    onWheel._t = setTimeout(() => { if (visible.value) closeNav(true) }, 420)
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
  document.addEventListener('click', onClick)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKeyDown, true)
  window.removeEventListener('keyup', onKeyUp, true)
  window.removeEventListener('wheel', onWheel, { passive: false, capture: true })
  window.removeEventListener('resize', onResize)
  window.removeEventListener('blur', onBlur)
  document.removeEventListener('click', onClick)
  clearTimeout(onWheel._t)
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
  color: rgba(200, 225, 255, 0.75);
  font-size: 13px;
  font-family: "Microsoft YaHei", sans-serif;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px rgba(0, 20, 60, 0.8);
  user-select: none;
  pointer-events: none;
  kbd {
    display: inline-block;
    padding: 2px 8px;
    margin: 0 2px;
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(80,140,220,0.4), rgba(30,80,160,0.4));
    border: 1px solid rgba(140,190,255,0.5);
    color: #e6f2ff;
    font-size: 12px;
    font-family: "SF Mono", Consolas, monospace;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }
}
</style>
