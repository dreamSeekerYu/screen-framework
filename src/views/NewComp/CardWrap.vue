<template>
  <div :style="cardStyle">
    <p v-if="title" style="font-size: 15px; font-weight: 600; color: #1d2129; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f0f1f3;">
      {{ title }}
    </p>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  title: { type: String, default: '' }
})
const cardStyle = computed(() => ({
  background: '#ffffff',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  gridColumn: 'span 1'
}))
</script>
