<template>
    <div class="mini-stat">
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

<script setup>
defineProps({
    title: { type: String, default: '' },
    value: { type: [Number, String], default: '' }
})
</script>
