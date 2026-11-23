<template>
  <div class="section-block" :style="{ '--acc': accColor }">
    <div class="block-head" :style="{ borderLeftColor: accColor }">
      <span class="block-title">{{ title }}</span>
    </div>
    <div class="block-body">{{ content || '—' }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  color: { type: String, default: '' },
})

// 未传颜色时跟随全局主题主色
const accColor = computed(() => props.color || 'var(--color-primary)')
</script>

<style scoped lang="scss">
.section-block {
  background: var(--color-bg-soft);
  border-radius: $radius-md;
  overflow: hidden;
}
.block-head {
  padding: 8px 12px;
  font-size: $font-sm;
  font-weight: 600;
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--acc) 14%, transparent);
  border-left: 3px solid var(--acc);
}
.block-body {
  padding: 10px 12px;
  font-size: $font-sm;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
