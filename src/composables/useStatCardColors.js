import { computed } from 'vue'

// ===== 预设状态颜色映射（扩展 stat2 的 purple/cyan） =====
// 全部改为主题变量驱动：text/textSoft 用于数字文字，border/gradient 用于色条，
// bg/iconBg/halo 为低透明度填充，accentBg 为强调卡背景。
// 语义色（success/warning/danger/info）每套主题单独定义，天然保证深浅主题对比度。
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
const darken = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, #000)`
const lighten = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, #fff)`

export const statusColors = {
    primary: {
        text: 'var(--color-primary)',
        textSoft: 'var(--color-primary)',
        border: 'var(--color-primary-light)',
        bg: tint('var(--color-primary)', 6),
        iconBg: tint('var(--color-primary)', 8),
        gradient: ['var(--color-primary-dark)', 'var(--color-primary)', 'var(--color-primary-light)'],
        halo: tint('var(--color-primary)', 10),
        accentBg: [tint('var(--color-primary)', 6), 'var(--color-bg-card)', tint('var(--color-primary)', 14)]
    },
    success: {
        text: 'var(--color-success)',
        textSoft: 'var(--color-success)',
        border: 'var(--color-success)',
        bg: tint('var(--color-success)', 6),
        iconBg: tint('var(--color-success)', 8),
        gradient: [darken('var(--color-success)', 25), 'var(--color-success)', lighten('var(--color-success)', 35)],
        halo: tint('var(--color-success)', 12),
        accentBg: [tint('var(--color-success)', 6), 'var(--color-bg-card)', tint('var(--color-success)', 12)]
    },
    warning: {
        text: 'var(--color-warning)',
        textSoft: 'var(--color-warning)',
        border: 'var(--color-warning)',
        bg: tint('var(--color-warning)', 6),
        iconBg: tint('var(--color-warning)', 8),
        gradient: [darken('var(--color-warning)', 25), 'var(--color-warning)', lighten('var(--color-warning)', 35)],
        halo: tint('var(--color-warning)', 10),
        accentBg: [tint('var(--color-warning)', 6), 'var(--color-bg-card)', tint('var(--color-warning)', 12)]
    },
    danger: {
        text: 'var(--color-danger)',
        textSoft: 'var(--color-danger)',
        border: 'var(--color-danger)',
        bg: tint('var(--color-danger)', 6),
        iconBg: tint('var(--color-danger)', 8),
        gradient: [darken('var(--color-danger)', 25), 'var(--color-danger)', lighten('var(--color-danger)', 35)],
        halo: tint('var(--color-danger)', 10),
        accentBg: [tint('var(--color-danger)', 6), 'var(--color-bg-card)', tint('var(--color-danger)', 12)]
    },
    info: {
        text: 'var(--color-info)',
        textSoft: 'var(--color-info)',
        border: 'color-mix(in srgb, var(--color-info) 65%, var(--color-text-secondary))',
        bg: tint('var(--color-info)', 6),
        iconBg: tint('var(--color-info)', 8),
        gradient: [
            'color-mix(in srgb, var(--color-info) 70%, var(--color-text-primary))',
            'var(--color-info)',
            'color-mix(in srgb, var(--color-info) 70%, var(--color-text-secondary))'
        ],
        halo: tint('var(--color-info)', 10),
        accentBg: [tint('var(--color-info)', 6), 'var(--color-bg-card)', tint('var(--color-info)', 10)]
    },
    purple: {
        text: 'color-mix(in srgb, var(--color-secondary) 60%, var(--color-primary))',
        textSoft: 'color-mix(in srgb, var(--color-secondary) 60%, var(--color-primary))',
        border: 'color-mix(in srgb, var(--color-secondary) 70%, var(--color-primary))',
        bg: tint('color-mix(in srgb, var(--color-secondary) 65%, var(--color-primary))', 8),
        iconBg: tint('color-mix(in srgb, var(--color-secondary) 65%, var(--color-primary))', 10),
        gradient: [
            'color-mix(in srgb, var(--color-secondary) 55%, var(--color-primary-dark))',
            'color-mix(in srgb, var(--color-secondary) 65%, var(--color-primary))',
            'color-mix(in srgb, var(--color-secondary) 75%, var(--color-primary-light))'
        ],
        halo: tint('color-mix(in srgb, var(--color-secondary) 65%, var(--color-primary))', 12),
        accentBg: [
            tint('color-mix(in srgb, var(--color-secondary) 65%, var(--color-primary))', 7),
            'var(--color-bg-card)',
            tint('color-mix(in srgb, var(--color-secondary) 65%, var(--color-primary))', 13)
        ]
    },
    cyan: {
        text: 'var(--color-secondary)',
        textSoft: 'var(--color-secondary)',
        border: 'var(--color-secondary)',
        bg: tint('var(--color-secondary)', 6),
        iconBg: tint('var(--color-secondary)', 8),
        gradient: [
            'color-mix(in srgb, var(--color-secondary) 75%, #000)',
            'var(--color-secondary)',
            'color-mix(in srgb, var(--color-secondary) 55%, #fff)'
        ],
        halo: tint('var(--color-secondary)', 10),
        accentBg: [tint('var(--color-secondary)', 6), 'var(--color-bg-card)', tint('var(--color-secondary)', 12)]
    }
}

export function hexToRgba(hex, alpha = 1) {
    if (!hex || !hex.startsWith('#')) return hex
    const h = hex.length === 4
        ? '#' + hex.slice(1).split('').map(c => c + c).join('')
        : hex
    const r = parseInt(h.slice(1, 3), 16)
    const g = parseInt(h.slice(3, 5), 16)
    const b = parseInt(h.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 把任意颜色（hex / var() / color-mix()）转为带透明度的版本：
// hex 走 rgba 计算，其余交给 color-mix（浏览器内解析变量）
export function alphaColor(color, alpha) {
    if (typeof color === 'string' && color.startsWith('#')) return hexToRgba(color, alpha)
    return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
}

/**
 * 统计卡配色与派生样式
 * @param {object} props StatCard 的 props（需包含 status/color/variant/brightness/bgColor/borderColor/theme/animated/animationDelay）
 */
export function useStatCardColors(props) {
    const pickColorConfig = () => {
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
                accentBg: [hexToRgba(base, 0.05), 'var(--color-bg-card)', hexToRgba(base, 0.08)]
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
                accentBg: [hexToRgba(base, 0.05), 'var(--color-bg-card)', hexToRgba(base, 0.08)]
            }
        }
        return statusColors[props.status] || statusColors.primary
    }

    const colorConfig = computed(() => pickColorConfig())

    // 解析当前状态（支持自定义色值）
    const resolvedStatus = computed(() => {
        if (typeof props.status === 'string' && props.status.startsWith('#')) return 'custom'
        return props.status
    })

    // ===== 计算主题样式变量 =====
    const customStyle = computed(() => {
        const style = {}
        const cfg = colorConfig.value

        // ---- 经典模式保留原 StatCard 逻辑 ----
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
                style['--stat-card-border'] = props.borderColor
            } else if (props.variant !== 'default') {
                style['--stat-card-border'] = borderColor
            }

            if (props.bgColor) {
                style['--stat-card-bg'] = props.bgColor
            } else if (props.variant === 'plain') {
                // 与原 StatCard 保持一致的透明度档位
                let bgOpacity = 0.1
                if (props.brightness === 'light') bgOpacity = 0.06
                if (props.brightness === 'dark') bgOpacity = 0.18
                style['--stat-card-bg'] = alphaColor(borderColor, bgOpacity)
            }

            style['--stat-card-value-color'] = textColor
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
        if (props.bgColor) style['--stat-card-bg'] = props.bgColor
        if (props.borderColor) style['--stat-card-border'] = props.borderColor

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
            border: `1px solid ${alphaColor(cfg.border, 0.2)}`
        }
    })

    return {
        statusColors,
        hexToRgba,
        alphaColor,
        colorConfig,
        resolvedStatus,
        customStyle,
        barStyle,
        haloStyle,
        iconBgStyle,
        badgeStyle
    }
}
