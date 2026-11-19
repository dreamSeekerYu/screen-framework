<template>
  <div class="section-block" :style="{ '--acc': color }">
    <div class="block-head" :style="{ background: color + '22', borderLeftColor: color }">
      <span class="block-title">{{ title }}</span>
    </div>
    <div class="block-body">{{ content || '—' }}</div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  color: { type: String, default: '#1677ff' },
})
</script>

<style scoped lang="scss">
.section-block {
  background: var(--color-bg-hover);
  border-radius: $radius-md;
  overflow: hidden;
}
.block-head {
  padding: 8px 12px;
  font-size: $font-sm;
  font-weight: 600;
  border-left: 3px solid var(--acc);
}
.block-body {
  padding: 10px 12px;
  font-size: $font-sm;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
