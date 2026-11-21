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

// 菱形斜切角：四角切 cutRatio，圆角 r，中心在(0,0)
function drawRoundedDiamondAtOrigin(w, h, cutRatio = 0.18, r = 8) {
  const cw = w * cutRatio
  const ch = h * cutRatio
  ctx.beginPath()
  ctx.moveTo(-w / 2 + cw, -h / 2)
  ctx.lineTo(w / 2 - cw, -h / 2)
  ctx.arcTo(w / 2, -h / 2, w / 2, -h / 2 + ch, r)
  ctx.lineTo(w / 2, h / 2 - ch)
  ctx.arcTo(w / 2, h / 2, w / 2 - cw, h / 2, r)
  ctx.lineTo(-w / 2 + cw, h / 2)
  ctx.arcTo(-w / 2, h / 2, -w / 2, h / 2 - ch, r)
  ctx.lineTo(-w / 2, -h / 2 + ch)
  ctx.arcTo(-w / 2, -h / 2, -w / 2 + cw, -h / 2, r)
  ctx.closePath()
}

function draw(t) {
  if (!ctx) return
  const dt = lastT ? t - lastT : 16
  lastT = t

  ctx.clearRect(0, 0, W, H)

  // ---- 背景 ----
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H) * 0.7)
  bgGrad.addColorStop(0, '#0d2a5e')
  bgGrad.addColorStop(0.55, '#071a40')
  bgGrad.addColorStop(1, '#030c24')
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
  ctx.translate(W / 2, H / 2)
  ctx.scale(sc, sc)
  ctx.translate(-W / 2, -H / 2)

  const cx = W / 2
  const cy = H / 2

  // 整体尺寸：中心圆占视口 1/3，卡片弧占视口约 1/2（宽高均为页面的 1/2）
  const vmin = Math.min(W, H)
  const innerR = vmin * 0.085     // 中心亮圆半径（CALB 字装下即可）
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

  // ---- 卡片排布 ----
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
  // 弧角度（极坐标：0=右，π/2=下，π=左）
  const startAngle = Math.PI * 0.80   // 左下 144°
  const endAngle = Math.PI * 0.20     // 右下 36°
  const arcSpan = startAngle - endAngle
  const step = arcSpan / (visibleCount - 1)

  // 底部发光弧线（在卡片外弧下方）
  ctx.save()
  const arcR = cardR + 60
  const botG = ctx.createLinearGradient(cx, cy + arcR - 80, cx, cy + arcR + 20)
  botG.addColorStop(0, 'rgba(80, 180, 255, 0)')
  botG.addColorStop(0.6, 'rgba(100, 200, 255, 0.9)')
  botG.addColorStop(1, 'rgba(180, 230, 255, 0.3)')
  ctx.strokeStyle = botG
  ctx.lineWidth = 3
  ctx.shadowColor = 'rgba(100, 200, 255, 0.8)'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.arc(cx, cy, arcR, endAngle - 0.05, startAngle + 0.05)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()

  for (let i = 0; i < visibleCount; i++) {
    let realIdx = Math.round(displayAbsIdx) - halfSpan + i
    let rel = realIdx - displayAbsIdx
    let modIdx = ((realIdx % n) + n) % n
    const route = routes[modIdx]

    const dist = Math.abs(rel)
    let scale, alpha, yOff
    if (dist <= 0.5) { scale = 1.08; alpha = 1; yOff = 0 }
    else if (dist <= 1.5) { scale = 0.92; alpha = 0.82; yOff = 10 }
    else { scale = 0.76; alpha = 0.55; yOff = 22 }

    const ang = startAngle - i * step
    const px = cx + Math.cos(ang) * cardR
    const py = cy + Math.sin(ang) * cardR + yOff

    const cw = 128 * scale
    const ch = 70 * scale

    ctx.save()
    ctx.globalAlpha = alpha * sc

    // 移到卡片中心并旋转：让卡片"顶边朝外"——正下方时卡片竖直朝上（rotate 0）
    ctx.translate(px, py)
    ctx.rotate(ang - Math.PI / 2) // 极角90°(下)→0°旋转，144°→+54°，36°→-54°

    // 选中卡底部光束（在旋转坐标系里朝下+y方向发光）
    if (dist <= 0.5) {
      const beamG = ctx.createRadialGradient(0, ch / 2 + 6, 3, 0, ch / 2 + 16, 72)
      const bp = 0.45 + 0.35 * Math.sin(t * 0.004)
      beamG.addColorStop(0, `rgba(120, 220, 255, ${0.75 * bp})`)
      beamG.addColorStop(1, 'rgba(80, 160, 255, 0)')
      ctx.fillStyle = beamG
      ctx.beginPath()
      ctx.ellipse(0, ch / 2 + 16, cw * 0.55, 28, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // 卡片主体（菱形斜切角）
    drawRoundedDiamondAtOrigin(cw, ch, 0.18, 5 * scale)

    if (dist <= 0.5) {
      const cardG = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2)
      cardG.addColorStop(0, 'rgba(40, 130, 240, 0.95)')
      cardG.addColorStop(0.5, 'rgba(20, 90, 210, 0.9)')
      cardG.addColorStop(1, 'rgba(10, 50, 150, 0.9)')
      ctx.fillStyle = cardG
      ctx.shadowColor = 'rgba(80, 180, 255, 0.95)'
      ctx.shadowBlur = 22
    } else {
      const cardG = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2)
      cardG.addColorStop(0, 'rgba(40, 80, 160, 0.7)')
      cardG.addColorStop(1, 'rgba(15, 35, 90, 0.75)')
      ctx.fillStyle = cardG
      ctx.shadowColor = 'rgba(40, 100, 200, 0.4)'
      ctx.shadowBlur = 10
    }
    ctx.fill()
    ctx.shadowBlur = 0

    // 上高光 + 描边
    ctx.save()
    ctx.clip()
    const hi = ctx.createLinearGradient(0, -ch / 2, 0, -ch / 2 + ch * 0.35)
    hi.addColorStop(0, 'rgba(255,255,255,0.25)')
    hi.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hi
    ctx.fillRect(-cw, -ch, cw * 2, ch)
    ctx.strokeStyle = dist <= 0.5 ? 'rgba(180, 230, 255, 0.8)' : 'rgba(120, 180, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    // 文字（跟随卡片旋转）
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 序号（顶部）
    ctx.fillStyle = dist <= 0.5 ? 'rgba(220, 240, 255, 0.95)' : 'rgba(160, 200, 240, 0.7)'
    ctx.font = `bold ${9 * scale}px "Microsoft YaHei", sans-serif`
    ctx.fillText(`NO.${String(modIdx + 1).padStart(2, '0')}`, 0, -ch * 0.33)
    // 标题
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${14 * scale}px "Microsoft YaHei", sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 3
    const title = route.name.length > 7 ? route.name.slice(0, 7) : route.name
    ctx.fillText(title, 0, 0)
    ctx.shadowBlur = 0
    // 副标题
    if (route.sub) {
      ctx.fillStyle = dist <= 0.5 ? 'rgba(200, 230, 255, 0.8)' : 'rgba(150, 190, 230, 0.6)'
      ctx.font = `${8 * scale}px "Microsoft YaHei", sans-serif`
      ctx.fillText(route.sub, 0, ch * 0.32)
    }

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
  background: rgba(3, 10, 30, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
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
