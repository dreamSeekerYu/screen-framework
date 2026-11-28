<template>
    <div class="kpi-top">
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
                            :class="{ 'kpi-top__value--loaded': !animated || entered }">{{ displayValue }}</span>
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
</template>

<script setup>
defineProps({
    title: { type: String, default: '' },
    subTitle: { type: String, default: '' },
    unit: { type: String, default: '' },
    // 实际展示值（可能经过滚动动画处理）
    displayValue: { type: [Number, String], default: '' },
    badge: { type: String, default: '' },
    badgeStyle: { type: Object, default: () => ({}) },
    animated: { type: Boolean, default: false },
    entered: { type: Boolean, default: false }
})
</script>
