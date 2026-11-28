<template>
    <div class="stat-card__content">
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
</template>

<script setup>
defineProps({
    title: { type: String, default: '' },
    explain: { type: String, default: '' },
    value: { type: [Number, String], default: '' },
    unit: { type: String, default: '' }
})
</script>
