import { getCurrentInstance, onMounted, onUnmounted } from 'vue'

/**
 * kpi-top 长数值自适应字号（内容过多时不撑开卡片）
 * 通过 canvas 量文本自然宽度，再按容器可用宽度收缩字号。
 * @param {object} props StatCard props（需包含 fitValue）
 */
export function useFitValue(props) {
    const inst = getCurrentInstance()

    // 字号校正调度：合并高频触发，避免反复同步重排
    let fitObserver = null
    let fitRaf = 0
    const fitTimers = []

    function scheduleFitValue() {
        if (fitRaf) cancelAnimationFrame(fitRaf)
        fitRaf = requestAnimationFrame(() => {
            fitRaf = 0
            applyFitValue()
        })
    }

    async function applyFitValue() {
        if (!props.fitValue) return
        // 用组件根元素定位，避免模板 ref 在条件分支下取不到
        const root = inst?.proxy?.$el
        if (!root || typeof root.querySelector !== 'function') return
        const valueEl = root.querySelector('.kpi-top__value')
        if (!valueEl) return
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

    onMounted(() => {
        applyFitValue()
        // 大屏缩放、字体加载、入场动画都会在挂载后才让可用宽度稳定，多档延迟校正
        scheduleFitValue()
        ;[80, 200, 400, 800].forEach((t) => fitTimers.push(setTimeout(scheduleFitValue, t)))
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
        fitTimers.forEach((t) => clearTimeout(t))
        fitTimers.length = 0
        if (fitObserver) {
            fitObserver.disconnect()
            fitObserver = null
        }
        if (fitRaf) {
            cancelAnimationFrame(fitRaf)
            fitRaf = 0
        }
    })

    return { scheduleFitValue, applyFitValue }
}
