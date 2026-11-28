<template>
  <!-- 客户选择器 + 时间窗口切换（消灭 60+ 周挤一图的内滚动问题） -->
  <div class="pack-client-tabs">
    <button
      v-for="t in clients"
      :key="t.key"
      class="client-tab-btn"
      :class="{ active: activeClient === t.key }"
      @click="$emit('select-client', t.key)"
    >{{ t.label }}</button>
    <div class="pack-window-tabs">
      <span class="window-label">时间窗口</span>
      <button
        v-for="w in windowTabs"
        :key="w.key"
        class="window-tab-btn"
        :class="{ active: timeWindow === w.key }"
        @click="$emit('select-window', w.key)"
      >{{ w.label }}</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  clients: { type: Array, required: true },
  activeClient: { type: String, default: '' },
  windowTabs: { type: Array, required: true },
  timeWindow: { type: String, default: '' }
})
defineEmits(['select-client', 'select-window'])
</script>
