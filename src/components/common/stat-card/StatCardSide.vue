<template>
    <div class="kpi-side">
        <div class="kpi-side__left">
            <!-- 图标方块 -->
            <div v-if="iconType || $slots.icon || icon" class="kpi-side__icon" :style="iconBgStyle">
                <StatCardIcon :type="iconType">
                    <slot name="icon">{{ icon }}</slot>
                </StatCardIcon>
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
        <!-- <span v-if="badge" class="kpi-side__badge" :style="badgeStyle">{{ badge }}</span> -->
        <slot name="action"></slot>
    </div>
</template>

<script setup>
import StatCardIcon from './StatCardIcon.vue'

defineProps({
    title: { type: String, default: '' },
    subTitle: { type: String, default: '' },
    value: { type: [Number, String], default: '' },
    unit: { type: String, default: '' },
    iconType: { type: String, default: '' },
    icon: { type: String, default: '' },
    trend: { type: [Number, String], default: '' },
    trendType: { type: String, default: 'flat' },
    trendLabel: { type: String, default: '' },
    // 图标底色（由根组件的配色 composable 计算）
    iconBgStyle: { type: Object, default: () => ({}) }
})
</script>
