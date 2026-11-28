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

        <!-- 无默认插槽时按主题渲染布局子组件 -->
        <template v-else>
            <!-- 经典布局（原 StatCard） -->
            <StatCardClassic v-if="theme === 'classic'" :title="title" :explain="explain" :value="value" :unit="unit">
                <template v-if="$slots.title" #title><slot name="title" /></template>
                <template v-if="$slots.explain" #explain><slot name="explain" /></template>
                <template v-if="$slots['left-extra']" #left-extra><slot name="left-extra" /></template>
                <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
                <template v-if="$slots.value" #value><slot name="value" /></template>
                <template v-if="$slots.unit" #unit><slot name="unit" /></template>
                <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
                <template v-if="$slots['right-extra']" #right-extra><slot name="right-extra" /></template>
                <template v-if="$slots.action" #action><slot name="action" /></template>
            </StatCardClassic>

            <!-- 左侧色条 + 图标块 + 大数字 + 趋势 -->
            <StatCardSide v-else-if="theme === 'kpi-side'" :title="title" :sub-title="subTitle" :value="value"
                :unit="unit" :icon-type="iconType" :icon="icon" :trend="trend" :trend-type="trendType"
                :trend-label="trendLabel" :icon-bg-style="iconBgStyle">
                <template v-if="$slots.icon" #icon><slot name="icon" /></template>
                <template v-if="$slots.title" #title><slot name="title" /></template>
                <template v-if="$slots.explain" #explain><slot name="explain" /></template>
                <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
                <template v-if="$slots.value" #value><slot name="value" /></template>
                <template v-if="$slots.unit" #unit><slot name="unit" /></template>
                <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
                <template v-if="$slots.trend" #trend><slot name="trend" /></template>
                <template v-if="$slots['right-extra']" #right-extra><slot name="right-extra" /></template>
                <template v-if="$slots.action" #action><slot name="action" /></template>
            </StatCardSide>

            <!-- 顶部渐变彩条 + 立体质感 -->
            <StatCardTop v-else-if="theme === 'kpi-top'" :title="title" :sub-title="subTitle" :unit="unit"
                :display-value="displayValue" :badge="badge" :badge-style="badgeStyle" :animated="animated"
                :entered="entered">
                <template v-if="$slots.title" #title><slot name="title" /></template>
                <template v-if="$slots.explain" #explain><slot name="explain" /></template>
                <template v-if="$slots['left-extra']" #left-extra><slot name="left-extra" /></template>
                <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
                <template v-if="$slots.value" #value><slot name="value" /></template>
                <template v-if="$slots.unit" #unit><slot name="unit" /></template>
                <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
                <template v-if="$slots['right-extra']" #right-extra><slot name="right-extra" /></template>
                <template v-if="$slots.action" #action><slot name="action" /></template>
            </StatCardTop>

            <!-- 迷你统计块 -->
            <StatCardMini v-else :title="title" :value="value">
                <template v-if="$slots.value" #value><slot name="value" /></template>
                <template v-if="$slots.title" #title><slot name="title" /></template>
                <template v-if="$slots.explain" #explain><slot name="explain" /></template>
                <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
            </StatCardMini>
        </template>
    </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import StatCardClassic from './stat-card/StatCardClassic.vue'
import StatCardSide from './stat-card/StatCardSide.vue'
import StatCardTop from './stat-card/StatCardTop.vue'
import StatCardMini from './stat-card/StatCardMini.vue'
import { useStatCardColors } from '@/composables/useStatCardColors.js'
import { useCountUp } from '@/composables/useCountUp.js'
import { useFitValue } from '@/composables/useFitValue.js'

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

    // ===== 主题与大屏特性 =====
    // 主题：classic(原 StatCard 布局) | kpi-side(左侧色条玻璃卡) | kpi-top(顶部色条立体卡) | mini(迷你统计块)
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
    // kpi-top 第一张卡是否使用强调渐变背景
    accent: { type: Boolean, default: false },
    // 数值是否开启滚动动画（kpi-top 主题且 value 为数字时生效）
    countUp: { type: Boolean, default: false },
    // 数值滚动动画时长（ms）
    countDuration: { type: Number, default: 1200 },
    // 数值文本过长时自动缩小字号（kpi-top 主题生效），避免长内容把卡片撑开
    fitValue: { type: Boolean, default: false }
})

const {
    statusColors,
    hexToRgba,
    resolvedStatus,
    customStyle,
    barStyle,
    haloStyle,
    iconBgStyle,
    badgeStyle
} = useStatCardColors(props)

// 控制扫光是否显示（默认 kpi-top 自动开启）
const resolvedShowShine = computed(() => {
    if (props.showShine === true || props.showShine === false) return props.showShine
    return props.theme === 'kpi-top'
})

const { displayValue, runCountUp } = useCountUp(props)
const { applyFitValue } = useFitValue(props)

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
})

defineExpose({ statusColors, hexToRgba })
</script>

<style src="./stat-card/stat-card.css"></style>
