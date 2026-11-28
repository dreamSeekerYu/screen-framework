import { ref, onUnmounted } from 'vue'

/**
 * 数值滚动动画（kpi-top 主题）
 * @param {object} props StatCard props（需包含 value/countUp/countDuration）
 */
export function useCountUp(props) {
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

    onUnmounted(() => {
        if (countTimer) {
            cancelAnimationFrame(countTimer)
            countTimer = null
        }
    })

    return { displayValue, runCountUp }
}
