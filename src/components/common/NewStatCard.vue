<template>
    <div class="stat-card" :class="[
        `stat-card--theme-${theme}`,
        `stat-card--${variant}`,
        `stat-card--${size}`,
        `stat-card--status-${resolvedStatus}`,
        {
            'stat-card--brightness-light': brightness === 'light',
            'stat-card--brightness-dark': brightness === 'dark',
            'stat-card--accent': accent && theme === 'kpi-top',
            'stat-card--animated': animated,
            'stat-card--shine': resolvedShowShine
        }
    ]" :style="customStyle">
        <!-- 左侧色条（kpi-side 主题） -->
        <span v-if="theme === 'kpi-side'" class="stat-card__side-bar" :style="barStyle"></span>
        <!-- 顶部色条（kpi-top 主题） -->
        <span v-if="theme === 'kpi-top'" class="stat-card__top-bar" :style="barStyle"></span>
        <!-- 右上角圆形微光（kpi-top 主题） -->
        <span v-if="theme === 'kpi-top'" class="stat-card__halo" :style="haloStyle"></span>
        <!-- 扫光动效层 -->
        <span v-if="resolvedShowShine" class="stat-card__shine"></span>

        <!-- 默认插槽：完全自定义整个卡片内容（优先级最高，会覆盖所有内部布局） -->
        <slot v-if="$slots.default"></slot>

        <!-- 无默认插槽时使用默认布局 -->
        <template v-else>
            <!-- ========== 经典布局（保持原有左右结构） ========== -->
            <div v-if="theme === 'classic'" class="stat-card__content">
                <div class="stat-card__left">
                    <slot name="title">
                        <div class="stat-card__title">{{ title }}</div>
                    </slot>
                    <slot name="explain">
                        <div v-if="explain || $slots.explain" class="stat-card__explain">{{ explain }}</div>
                    </slot>
                    <slot name="left-extra"></slot>
                </div>
                <div class="stat-card__right">
                    <slot name="prefix"></slot>
                    <slot name="value">
                        <span class="stat-card__value">{{ value }}</span>
                    </slot>
                    <slot name="unit">
                        <span v-if="unit || $slots.unit" class="stat-card__unit">{{ unit }}</span>
                    </slot>
                    <slot name="suffix"></slot>
                    <slot name="right-extra"></slot>
                </div>
                <slot name="action"></slot>
            </div>

            <!-- ========== kpi-side：左侧色条 + 图标块 + 标题+副标题 + 右侧大数字 + 趋势（stat1 风格） ========== -->
            <div v-else-if="theme === 'kpi-side'" class="kpi-side">
                <div class="kpi-side__left">
                    <!-- 图标方块 -->
                    <div v-if="iconType || $slots.icon || icon" class="kpi-side__icon" :style="iconBgStyle">
                        <svg v-if="iconType == 'x_y_down'" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 3v18h18"></path>
                            <path d="M18 17l-5-5-4 4-3-3"></path>
                        </svg>
                        <svg v-if="iconType == 'right'" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <svg v-if="iconType == 'text_card'" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                            <path d="M7 7h10"></path>
                            <path d="M7 12h10"></path>
                            <path d="M7 17h6"></path>
                        </svg>
                        <svg v-if="iconType == 'warning'" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path
                                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z">
                            </path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <svg v-if="iconType == 'x_y_up'" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 3v18h18"></path>
                            <path d="M7 16l4-8 4 4 5-9"></path>
                        </svg>
                        <slot name="icon">{{ icon }}</slot>
                    </div>
                    <div class="kpi-side__text">
                        <slot name="title">
                            <div class="kpi-side__title">
                                {{ title }}
                                <small v-if="subTitle">{{ subTitle }}</small>
                            </div>
                        </slot>
                        <slot name="explain"></slot>
                    </div>
                </div>
                <div class="kpi-side__right">
                    <div class="kpi-side__value-row">
                        <slot name="prefix"></slot>
                        <slot name="value">
                            <span class="kpi-side__value">{{ value }}</span>
                        </slot>
                        <slot name="unit">
                            <span v-if="unit || $slots.unit" class="kpi-side__unit">{{ unit }}</span>
                        </slot>
                        <slot name="suffix"></slot>
                    </div>
                    <!-- 趋势文字 -->
                    <slot name="trend">
                        <div v-if="trend !== '' && trend !== null && trend !== undefined" class="kpi-side__trend"
                            :class="`kpi-side__trend--${trendType}`">
                            <template v-if="trendType === 'up'">↑</template>
                            <template v-else-if="trendType === 'down'">↓</template>
                            <template v-else>-</template>
                            {{ trend }}<span v-if="trendLabel"> {{ trendLabel }}</span>
                        </div>
                    </slot>
                    <slot name="right-extra"></slot>
                </div>
                <!-- 右上角 badge -->
                <span v-if="badge" class="kpi-side__badge" :style="badgeStyle">{{ badge }}</span>
                <slot name="action"></slot>
            </div>

            <!-- ========== kpi-top：顶部渐变彩条 + 立体质感 + 文字阴影（stat2 风格） ========== -->
            <div v-else-if="theme === 'kpi-top'" class="kpi-top">
                <div class="kpi-top__body">
                    <div class="kpi-top__left">
                        <slot name="title">
                            <div class="kpi-top__title">{{ title }}</div>
                        </slot>
                        <div v-if="subTitle || $slots.explain" class="kpi-top__sub">
                            <slot name="explain">{{ subTitle }}</slot>
                        </div>
                        <slot name="left-extra"></slot>
                    </div>
                    <div class="kpi-top__right">
                        <div class="kpi-top__value-row">
                            <slot name="prefix"></slot>
                            <slot name="value">
                                <span class="kpi-top__value"
                                    :class="{ 'kpi-top__value--loaded': !animated || entered }">{{ displayValue
                                    }}</span>
                            </slot>
                            <slot name="unit">
                                <span v-if="unit || $slots.unit" class="kpi-top__unit"
                                    :class="{ 'kpi-top__unit--loaded': !animated || entered }">{{ unit }}</span>
                            </slot>
                            <slot name="suffix"></slot>
                        </div>
                        <slot name="right-extra"></slot>
                    </div>
                </div>
                <span v-if="badge" class="kpi-top__badge" :style="badgeStyle">{{ badge }}</span>
                <slot name="action"></slot>
            </div>

            <!-- ========== mini：居中小统计块（stat1 中间列等级分布卡片） ========== -->
            <div v-else-if="theme === 'mini'" class="mini-stat">
                <slot name="value">
                    <div class="mini-stat__value">{{ value }}</div>
                </slot>
                <slot name="title">
                    <div v-if="title" class="mini-stat__label">{{ title }}</div>
                </slot>
                <slot name="explain"></slot>
                <slot name="suffix"></slot>
            </div>
        </template>
    </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted, useSlots, getCurrentInstance } from 'vue'

const slots = useSlots()
const entered = ref(false)

const props = defineProps({
    // 常见的 iconType
    iconType: {
        type: String,
        default: '',
        validator: (val) => ['', 'x_y_up', 'x_y_down', 'right', 'warning', 'text_card'].includes(val)
    },
    // ===== 通用基础字段（保持向后兼容）=====
    title: { type: String, default: '' },
    explain: { type: String, default: '' },
    value: { type: [Number, String], default: '' },
    unit: { type: String, default: '' },
    // 状态颜色: primary | success | warning | danger | info | purple | cyan | 自定义色值
    status: {
        type: String,
        default: 'primary',
        validator: (val) =>
            ['primary', 'success', 'warning', 'danger', 'info', 'purple', 'cyan'].includes(val) ||
            (typeof val === 'string' && val.startsWith('#'))
    },
    // 卡片样式变体: default(白底) | outlined(实线边框) | dash(虚线边框) | plain(浅色填充)
    variant: {
        type: String,
        default: 'default',
        validator: (val) => ['default', 'outlined', 'dash', 'plain'].includes(val)
    },
    brightness: {
        type: String,
        default: 'default',
        validator: (val) => ['default', 'light', 'dark'].includes(val)
    },
    size: {
        type: String,
        default: 'default',
        validator: (val) => ['small', 'default', 'large'].includes(val)
    },
    color: { type: String, default: '' },
    borderColor: { type: String, default: '' },
    bgColor: { type: String, default: '' },

    // ===== 新增：主题与大屏特性 =====
    // 主题：classic(原布局) | kpi-side(左侧色条玻璃卡) | kpi-top(顶部色条立体卡) | mini(迷你统计块)
    theme: {
        type: String,
        default: 'classic',
        validator: (val) => ['classic', 'kpi-side', 'kpi-top', 'mini'].includes(val)
    },
    // 副标题（kpi-side / kpi-top 下标题下方小字）
    subTitle: { type: String, default: '' },
    // 图标（emoji/文字，也可用 #icon 插槽自定义 SVG）
    icon: { type: String, default: '' },
    // 趋势值：数字或字符串，如 1.3、"-0.02"、"8项"
    trend: { type: [Number, String], default: '' },
    // 趋势方向：up(上升，绿色) | down(下降，红色) | flat(持平，灰色)
    trendType: {
        type: String,
        default: 'flat',
        validator: (val) => ['up', 'down', 'flat'].includes(val)
    },
    // 趋势说明文字，如"较上周"
    trendLabel: { type: String, default: '' },
    // 右上角角标
    badge: { type: String, default: '' },
    // 是否显示扫光动效（默认 kpi-top 开启，其他关闭）
    showShine: { type: Boolean, default: null },
    // 是否启用入场动画
    animated: { type: Boolean, default: false },
    // 动画延迟（ms）
    animationDelay: { type: Number, default: 0 },
    // kpi-top 第一张卡是否使用强调渐变背景（stat2 第一张绿色大卡风格）
    accent: { type: Boolean, default: false },
    // 数值是否开启滚动动画（kpi-top 主题且 value 为数字时生效）
    countUp: { type: Boolean, default: false },
    // 数值滚动动画时长（ms）
    countDuration: { type: Number, default: 1200 },
    // 数值文本过长时自动缩小字号（kpi-top 主题生效），避免长内容把卡片撑开
    fitValue: { type: Boolean, default: false }
})

// ===== 预设状态颜色映射（扩展 stat2 的 purple/cyan） =====
const statusColors = {
    primary: {
        text: '#1e40af',
        textSoft: '#2563eb',
        border: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.06)',
        iconBg: 'rgba(59, 130, 246, 0.08)',
        gradient: ['#1e40af', '#2563eb', '#3b82f6'],
        halo: 'rgba(59,130,246,0.10)',
        accentBg: ['#eff6ff', '#ffffff', '#dbeafe']
    },
    success: {
        text: '#047857',
        textSoft: '#059669',
        border: '#10b981',
        bg: 'rgba(16, 185, 129, 0.06)',
        iconBg: 'rgba(16, 185, 129, 0.08)',
        gradient: ['#059669', '#10b981', '#34d399'],
        halo: 'rgba(16,185,129,0.12)',
        accentBg: ['#ecfdf5', '#ffffff', '#d1fae5']
    },
    warning: {
        text: '#c2410c',
        textSoft: '#d97706',
        border: '#f97316',
        bg: 'rgba(249, 115, 22, 0.06)',
        iconBg: 'rgba(249, 115, 22, 0.08)',
        gradient: ['#d97706', '#f59e0b', '#fbbf24'],
        halo: 'rgba(245,158,11,0.10)',
        accentBg: ['#fff7ed', '#ffffff', '#ffedd5']
    },
    danger: {
        text: '#b91c1c',
        textSoft: '#dc2626',
        border: '#ef4444',
        bg: 'rgba(239, 68, 63, 0.06)',
        iconBg: 'rgba(239, 68, 63, 0.08)',
        gradient: ['#b91c1c', '#dc2626', '#f87171'],
        halo: 'rgba(239,68,68,0.10)',
        accentBg: ['#fef2f2', '#ffffff', '#fee2e2']
    },
    info: {
        text: '#475569',
        textSoft: '#64748b',
        border: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.06)',
        iconBg: 'rgba(148, 163, 184, 0.08)',
        gradient: ['#475569', '#64748b', '#94a3b8'],
        halo: 'rgba(148,163,184,0.10)',
        accentBg: ['#f8fafc', '#ffffff', '#f1f5f9']
    },
    purple: {
        text: '#6d28d9',
        textSoft: '#7c3aed',
        border: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.06)',
        iconBg: 'rgba(139, 92, 246, 0.08)',
        gradient: ['#7c3aed', '#8b5cf6', '#a78bfa'],
        halo: 'rgba(139,92,246,0.10)',
        accentBg: ['#f5f3ff', '#ffffff', '#ede9fe']
    },
    cyan: {
        text: '#0e7490',
        textSoft: '#0891b2',
        border: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.06)',
        iconBg: 'rgba(6, 182, 212, 0.08)',
        gradient: ['#0891b2', '#06b6d4', '#22d3ee'],
        halo: 'rgba(6,182,212,0.10)',
        accentBg: ['#ecfeff', '#ffffff', '#cffafe']
    }
}

// 解析当前状态（支持自定义色值）
const resolvedStatus = computed(() => {
    if (typeof props.status === 'string' && props.status.startsWith('#')) return 'custom'
    return props.status
})

function hexToRgba(hex, alpha = 1) {
    if (!hex || !hex.startsWith('#')) return hex
    const h = hex.length === 4
        ? '#' + hex.slice(1).split('').map(c => c + c).join('')
        : hex
    const r = parseInt(h.slice(1, 3), 16)
    const g = parseInt(h.slice(3, 5), 16)
    const b = parseInt(h.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function pickColorConfig() {
    // 自定义主色
    if (props.color && props.color.startsWith('#')) {
        const base = props.color
        return {
            text: base,
            textSoft: base,
            border: base,
            bg: hexToRgba(base, 0.06),
            iconBg: hexToRgba(base, 0.08),
            gradient: [base, base, base],
            halo: hexToRgba(base, 0.10),
            accentBg: [hexToRgba(base, 0.05), '#ffffff', hexToRgba(base, 0.08)]
        }
    }
    // 自定义 status 为 hex
    if (typeof props.status === 'string' && props.status.startsWith('#')) {
        const base = props.status
        return {
            text: base,
            textSoft: base,
            border: base,
            bg: hexToRgba(base, 0.06),
            iconBg: hexToRgba(base, 0.08),
            gradient: [base, base, base],
            halo: hexToRgba(base, 0.10),
            accentBg: [hexToRgba(base, 0.05), '#ffffff', hexToRgba(base, 0.08)]
        }
    }
    return statusColors[props.status] || statusColors.primary
}

const colorConfig = computed(() => pickColorConfig())

// 控制扫光是否显示（默认 kpi-top 自动开启）
const resolvedShowShine = computed(() => {
    if (props.showShine === true || props.showShine === false) return props.showShine
    return props.theme === 'kpi-top'
})

// ===== 计算主题样式变量 =====
const customStyle = computed(() => {
    const style = {}
    const cfg = colorConfig.value

    // ---- 经典模式保留原逻辑 ----
    if (props.theme === 'classic') {
        let textColor = cfg.textSoft || cfg.text
        let borderColor = cfg.border
        let bgColor = ''

        if (props.color && props.color.startsWith('#')) {
            textColor = props.color
            borderColor = props.color
            bgColor = hexToRgba(props.color, props.brightness === 'light' ? 0.06 : props.brightness === 'dark' ? 0.15 : 0.1)
        }

        if (props.borderColor) {
            style['--card-border-color'] = props.borderColor
        } else if (props.variant !== 'default') {
            style['--card-border-color'] = borderColor
        }

        if (props.bgColor) {
            style['--card-bg-color'] = props.bgColor
        } else if (props.variant === 'plain') {
            let bgOpacity = 0.08
            if (props.brightness === 'light') bgOpacity = 0.05
            if (props.brightness === 'dark') bgOpacity = 0.15
            style['--card-bg-color'] = hexToRgba(borderColor, bgOpacity)
        }

        style['--value-color'] = textColor
        return style
    }

    // ---- 大屏主题：把颜色通过 CSS 变量传给内部元素 ----
    style['--accent-text'] = cfg.text
    style['--accent-text-soft'] = cfg.textSoft
    style['--accent-border'] = cfg.border
    style['--accent-bg'] = cfg.bg
    style['--accent-icon-bg'] = cfg.iconBg
    style['--accent-halo'] = cfg.halo
    style['--accent-gradient'] = `linear-gradient(90deg, ${cfg.gradient[0]} 0%, ${cfg.gradient[1]} 50%, ${cfg.gradient[2]} 100%)`
    style['--accent-card-bg'] =
        `linear-gradient(135deg, ${cfg.accentBg[0]} 0%, ${cfg.accentBg[1]} 50%, ${cfg.accentBg[2]} 100%)`

    // 用户自定义背景/边框
    if (props.bgColor) style['--card-bg-color'] = props.bgColor
    if (props.borderColor) style['--card-border-color'] = props.borderColor

    // 动画延迟
    if (props.animated) {
        style['animationDelay'] = props.animationDelay + 'ms'
    }

    return style
})

// 色条样式
const barStyle = computed(() => {
    const cfg = colorConfig.value
    if (props.theme === 'kpi-side') {
        return { background: cfg.border }
    }
    if (props.theme === 'kpi-top') {
        return { background: `linear-gradient(90deg, ${cfg.gradient[0]} 0%, ${cfg.gradient[1]} 50%, ${cfg.gradient[2]} 100%)` }
    }
    return {}
})

// 右上角光晕
const haloStyle = computed(() => {
    const cfg = colorConfig.value
    return { background: `radial-gradient(circle, ${cfg.halo} 0%, transparent 70%)` }
})

// 图标底色
const iconBgStyle = computed(() => {
    const cfg = colorConfig.value
    return { background: cfg.iconBg, color: cfg.border }
})

// badge 配色
const badgeStyle = computed(() => {
    const cfg = colorConfig.value
    return {
        background: cfg.bg,
        color: cfg.textSoft,
        border: `1px solid ${hexToRgba(cfg.border, 0.2)}`
    }
})

// ===== kpi-top 数值滚动动画 =====
const displayValue = ref(props.value)
let countTimer = null

function runCountUp() {
    const target = Number(props.value)
    if (!props.countUp || !Number.isFinite(target)) {
        displayValue.value = props.value
        return
    }
    if (countTimer) cancelAnimationFrame(countTimer)
    const dur = props.countDuration
    const startTime = performance.now()
    const tick = (now) => {
        const p = Math.min((now - startTime) / dur, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        displayValue.value = Math.floor(target * eased)
        if (p < 1) countTimer = requestAnimationFrame(tick)
        else displayValue.value = target
    }
    countTimer = requestAnimationFrame(tick)
}

// ===== kpi-top 长数值自适应字号（内容过多时不撑开卡片） =====
const inst = getCurrentInstance()

// 字号校正调度：合并高频触发，避免反复同步重排
let fitObserver = null
let fitRaf = 0
function scheduleFitValue() {
    if (fitRaf) cancelAnimationFrame(fitRaf)
    fitRaf = requestAnimationFrame(() => {
        fitRaf = 0
        applyFitValue()
    })
}

async function applyFitValue() {
    // 用组件根元素定位，避免模板 ref 在条件分支下取不到
    const root = inst?.proxy?.$el
    if (!root || typeof root.querySelector !== 'function') return
    const valueEl = root.querySelector('.kpi-top__value')
    if (!valueEl) return
    if (!props.fitValue) return
    const box = root.querySelector('.kpi-top__right')
    if (!box || box.clientWidth === 0) return

    valueEl.style.fontSize = ''
    const cs = getComputedStyle(valueEl)
    const base = parseFloat(cs.fontSize) || 38
    const avail = box.clientWidth
    const unitEl = root.querySelector('.kpi-top__unit')
    const unitW = unitEl ? unitEl.offsetWidth + 4 : 0
    const text = valueEl.textContent || ''

    // 用 canvas 量文本自然宽度：与 DOM 布局无关，不受 flex 压缩和字体加载时序影响
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${base}px ${cs.fontFamily}`
    const textW = ctx.measureText(text).width
    if (textW + unitW > avail) {
        const fs = Math.max(13, Math.floor((base * (avail - unitW)) / textW))
        valueEl.style.fontSize = fs + 'px'
    }
}

watch(() => props.value, () => {
    displayValue.value = props.value
    runCountUp()
    applyFitValue()
})

// 入场触发（kpi-top 数字的淡入上浮）
onMounted(() => {
    if (props.animated) {
        setTimeout(() => { entered.value = true }, 30)
    } else {
        entered.value = true
    }
    if (props.countUp) setTimeout(runCountUp, props.animated ? 150 : 300)
    applyFitValue()
    // 大屏缩放、字体加载、入场动画都会在挂载后才让可用宽度稳定，多档延迟校正
    scheduleFitValue()
    ;[80, 200, 400, 800].forEach((t) => setTimeout(scheduleFitValue, t))
    const rootEl = inst?.proxy?.$el
    if (window.ResizeObserver && rootEl && typeof rootEl.querySelector === 'function') {
        const boxEl = rootEl.querySelector('.kpi-top__right')
        if (boxEl) {
            fitObserver = new ResizeObserver(scheduleFitValue)
            fitObserver.observe(boxEl)
        }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFitValue)
    window.addEventListener('resize', scheduleFitValue)
})

onUnmounted(() => {
    window.removeEventListener('resize', scheduleFitValue)
    if (fitObserver) {
        fitObserver.disconnect()
        fitObserver = null
    }
    if (fitRaf) {
        cancelAnimationFrame(fitRaf)
        fitRaf = 0
    }
})

defineExpose({ statusColors, hexToRgba })
</script>

<style scoped>
/* =========================================================
 * 基础：所有主题共享的卡片容器
 * ========================================================= */
.stat-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
}

/* =========================================================
 * 一、经典主题（向后兼容：原 StatCard 样式原封不动）
 * ========================================================= */
.stat-card--theme-classic {
    --card-bg-color: #ffffff;
    --card-border-color: transparent;
    --value-color: #4080ff;
    --border-radius: 16px;
    --padding: 20px 28px;
    --title-size: 22px;
    --explain-size: 16px;
    --value-size: 42px;
    --unit-size: 28px;
    background: var(--card-bg-color);
    border-radius: var(--border-radius);
    padding: var(--padding);
    border: 2px solid var(--card-border-color);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
}

.stat-card--theme-classic:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-card--theme-classic.stat-card--small {
    --border-radius: 12px;
    --padding: 14px 20px;
    --title-size: 16px;
    --explain-size: 13px;
    --value-size: 28px;
    --unit-size: 18px;
}

.stat-card--theme-classic.stat-card--large {
    --border-radius: 20px;
    --padding: 28px 36px;
    --title-size: 26px;
    --explain-size: 18px;
    --value-size: 56px;
    --unit-size: 36px;
}

.stat-card--theme-classic.stat-card--dash {
    border-style: dashed;
}

.stat-card--theme-classic.stat-card--default {
    border-color: #f0f2f5;
    background: #ffffff;
}

.stat-card--theme-classic.stat-card--outlined {
    background: #ffffff;
}

.stat-card--theme-classic .stat-card__content {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    position: relative;
}

.stat-card--theme-classic .stat-card__left {
    flex: 1;
    min-width: 0;
}

.stat-card--theme-classic .stat-card__title {
    font-size: var(--title-size);
    font-weight: 500;
    color: #1d2129;
    line-height: 1.4;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-card--theme-classic .stat-card__explain {
    font-size: var(--explain-size);
    color: #4e5969;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-card--theme-classic .stat-card__right {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    font-weight: 700;
}

.stat-card--theme-classic .stat-card__value {
    font-size: var(--value-size);
    color: var(--value-color);
    line-height: 1;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stat-card--theme-classic .stat-card__unit {
    font-size: var(--unit-size);
    color: var(--value-color);
    margin-left: 4px;
    line-height: 1;
}

.stat-card--theme-classic.stat-card--brightness-light.stat-card--plain {
    --card-bg-color: rgba(255, 255, 255, 0.9);
}

/* =========================================================
 * 二、kpi-side 主题（stat1 风格：玻璃拟态 + 左侧色条 + 图标块）
 * ========================================================= */
.stat-card--theme-kpi-side {
    background: linear-gradient(90deg, var(--accent-bg) 0%, rgba(255, 255, 255, 0.95) 60%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(59, 130, 246, 0.08);
    border-radius: 10px;
    box-shadow:
        0 1px 3px rgba(59, 130, 246, 0.04),
        0 1px 2px rgba(0, 0, 0, 0.02);
    padding: 0 22px;
    min-height: 105px;
    display: flex;
    align-items: stretch;
}

.stat-card--theme-kpi-side:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03);
    border-color: rgba(59, 130, 246, 0.15);
}

.stat-card--theme-kpi-side.stat-card--small {
    min-height: 80px;
    padding: 0 16px;
}

.stat-card--theme-kpi-side.stat-card--large {
    min-height: 125px;
    padding: 0 28px;
}

.stat-card--theme-kpi-side .stat-card__side-bar {
    position: absolute;
    top: 14px;
    left: 0;
    bottom: 14px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    z-index: 2;
}

.stat-card--theme-kpi-side.stat-card--small .stat-card__side-bar {
    top: 10px;
    bottom: 10px;
}

.stat-card--theme-kpi-side.stat-card--large .stat-card__side-bar {
    top: 18px;
    bottom: 18px;
    width: 4px;
}

.stat-card--theme-kpi-side .kpi-side {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 16px 0;
    position: relative;
    z-index: 1;
}

.kpi-side__left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.kpi-side__icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.stat-card--theme-kpi-side.stat-card--small .kpi-side__icon {
    width: 32px;
    height: 32px;
    font-size: 15px;
    border-radius: 6px;
}

.stat-card--theme-kpi-side.stat-card--large .kpi-side__icon {
    width: 48px;
    height: 48px;
    font-size: 22px;
    border-radius: 10px;
}

.kpi-side__text {
    flex: 1;
    min-width: 0;
}

.kpi-side__title {
    font-size: 14px;
    color: #475569;
    text-align: left;
    line-height: 1.4;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-card--theme-kpi-side.stat-card--small .kpi-side__title {
    font-size: 13px;
}

.stat-card--theme-kpi-side.stat-card--large .kpi-side__title {
    font-size: 16px;
}

.kpi-side__title small {
    display: block;
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.kpi-side__right {
    text-align: right;
    flex-shrink: 0;
}

.kpi-side__value-row {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
}

.kpi-side__value {
    font-size: 38px;
    font-weight: 700;
    line-height: 1;
    font-family: 'DIN Alternate', 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    color: var(--accent-text);
}

.stat-card--theme-kpi-side.stat-card--small .kpi-side__value {
    font-size: 28px;
}

.stat-card--theme-kpi-side.stat-card--large .kpi-side__value {
    font-size: 44px;
}

.kpi-side__unit {
    font-size: 16px;
    font-weight: 500;
    margin-left: 3px;
    color: var(--accent-text);
    line-height: 1;
}

.stat-card--theme-kpi-side.stat-card--small .kpi-side__unit {
    font-size: 13px;
}

.stat-card--theme-kpi-side.stat-card--large .kpi-side__unit {
    font-size: 18px;
}

.kpi-side__trend {
    font-size: 12px;
    text-align: right;
    margin-top: 7px;
    font-weight: 500;
    color: #64748b;
}

.kpi-side__trend--up {
    color: #059669;
}

.kpi-side__trend--down {
    color: #dc2626;
}

.kpi-side__badge {
    position: absolute;
    top: 10px;
    right: 0;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

/* =========================================================
 * 三、kpi-top 主题（stat2 风格：顶部渐变彩条 + 立体质感 + 光晕扫光）
 * ========================================================= */
.stat-card--theme-kpi-top {
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    border-radius: 12px;
    padding: 18px 18px 16px;
    border: 1px solid rgba(30, 120, 208, 0.12);
    box-shadow:
        0 4px 16px rgba(30, 64, 175, 0.06),
        0 1px 3px rgba(30, 64, 175, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    display: block;
}

.stat-card--theme-kpi-top:hover {
    transform: translateY(-2px);
    box-shadow:
        0 8px 24px rgba(30, 64, 175, 0.10),
        0 2px 6px rgba(30, 64, 175, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.stat-card--theme-kpi-top.stat-card--small {
    padding: 14px 14px 12px;
    border-radius: 10px;
}

.stat-card--theme-kpi-top.stat-card--large {
    padding: 22px 24px 20px;
    border-radius: 14px;
}

/* 强调渐变背景（第一张卡风格） */
.stat-card--theme-kpi-top.stat-card--accent {
    background: var(--accent-card-bg);
    border-color: var(--accent-border);
    border-color: rgba(16, 185, 129, 0.2);
}

.stat-card--theme-kpi-top .stat-card__top-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 12px 12px 0 0;
}

.stat-card--theme-kpi-top .stat-card__halo {
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    opacity: 0.4;
    pointer-events: none;
}

.kpi-top {
    position: relative;
    z-index: 1;
}

.kpi-top__body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.kpi-top__left {
    flex: 1;
    min-width: 0;
}

.kpi-top__title {
    font-size: 13px;
    color: #475569;
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-card--theme-kpi-top.stat-card--small .kpi-top__title {
    font-size: 12px;
}

.stat-card--theme-kpi-top.stat-card--large .kpi-top__title {
    font-size: 15px;
}

.kpi-top__sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.kpi-top__right {
    /* 固定占比：宽度不随数值内容浮动，字号自适应才能收敛 */
    flex: 0 0 auto;
    width: 58%;
    min-width: 0;
    text-align: right;
}

.kpi-top__value-row {
    display: flex;
    align-items: baseline;
    gap: 3px;
    justify-content: flex-end;
    /* 阻断 min-content 传递：否则长数值会把外层 grid 的 1fr 轨道撑开，形成测量回流 */
    min-width: 0;
}

.kpi-top__value {
    font-size: 38px;
    font-weight: 800;
    line-height: 1;
    /* 不换行 + 裁剪：换行/溢出会污染测量，溢出部分交给字号自适应处理 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    font-variant-numeric: tabular-nums;
    letter-spacing: -1px;
    color: var(--accent-text);
    text-shadow: 0 2px 12px var(--accent-halo);
    font-family: 'DIN Alternate', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card--theme-kpi-top.stat-card--small .kpi-top__value {
    font-size: 28px;
}

.stat-card--theme-kpi-top.stat-card--large .kpi-top__value {
    font-size: 46px;
}

.stat-card--theme-kpi-top.stat-card--accent .kpi-top__value {
    font-size: 42px;
}

.kpi-top__unit {
    font-size: 16px;
    font-weight: 600;
    margin-left: 2px;
    color: var(--accent-text);
    line-height: 1;
    transition: opacity 0.4s ease 0.3s;
}

.stat-card--theme-kpi-top.stat-card--small .kpi-top__unit {
    font-size: 13px;
}

.stat-card--theme-kpi-top.stat-card--large .kpi-top__unit {
    font-size: 19px;
}

/* 入场动画初始态 */
.stat-card--theme-kpi-top.stat-card--animated .kpi-top__value {
    opacity: 0;
    transform: translateY(8px);
}

.stat-card--theme-kpi-top.stat-card--animated .kpi-top__unit {
    opacity: 0;
}

.stat-card--theme-kpi-top .kpi-top__value--loaded {
    opacity: 1 !important;
    transform: translateY(0) !important;
}

.stat-card--theme-kpi-top .kpi-top__unit--loaded {
    opacity: 1 !important;
}

.kpi-top__badge {
    position: absolute;
    top: -4px;
    right: 0;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
}

/* =========================================================
 * 四、mini 主题（stat1 中间列小统计块：居中+浅底+大数字+标签）
 * ========================================================= */
.stat-card--theme-mini {
    padding: 12px 8px;
    border-radius: 8px;
    text-align: center;
    background: var(--accent-bg);
    border: 1px solid var(--accent-border);
    display: block;
}

.stat-card--theme-mini:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-card--theme-mini .mini-stat {
    width: 100%;
}

.mini-stat__value {
    font-size: 20px;
    font-weight: 700;
    color: var(--accent-text-soft);
    font-family: 'DIN Alternate', 'PingFang SC', sans-serif;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
}

.stat-card--theme-mini.stat-card--small .mini-stat__value {
    font-size: 17px;
}

.stat-card--theme-mini.stat-card--large .mini-stat__value {
    font-size: 24px;
}

.mini-stat__label {
    font-size: 12px;
    color: #475569;
    margin-top: 4px;
    line-height: 1.4;
}

/* =========================================================
 * 五、动效：扫光 + 入场 fadeInUp
 * ========================================================= */
.stat-card__shine {
    position: absolute;
    top: 0;
    left: -100%;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: statCardShine 8s ease-in-out infinite;
    pointer-events: none;
    z-index: 2;
}

@keyframes statCardShine {
    0% {
        left: -40%;
    }

    20%,
    100% {
        left: 140%;
    }
}

/* 入场动画 */
.stat-card--animated {
    opacity: 0;
    transform: translateY(10px);
    animation: statCardFadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes statCardFadeInUp {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* =========================================================
 * 右上角 action 通用定位
 * ========================================================= */
:deep(.stat-card__action) {
    position: absolute;
    top: 16px;
    right: 20px;
    font-size: 14px;
    color: #86909c;
    cursor: pointer;
}

.stat-card :deep(*) {
    box-sizing: border-box;
}
</style>
