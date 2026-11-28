<template>
  <!-- 主Tab导航（总览仪表盘 / 客户详情分析 / 问题与偏差分析） -->
  <div class="pack-main-tabs">
    <button
      v-for="t in tabs"
      :key="t.key"
      class="pack-tab-btn"
      :class="{ active: active === t.key }"
      @click="$emit('select', t.key)"
    >
      <span class="icon">{{ t.icon }}</span>{{ t.label }}
    </button>
    <button
      class="pack-tab-btn rotate-btn"
      :class="{ active: rotating }"
      :title="rotating ? '轮播中：总览 → 客户详情（逐客户）→ 问题分析 自动循环，点击关闭' : '开启投屏轮播（每 12 秒自动切换，手动操作自动重新计时）'"
      @click="$emit('toggle-rotate')"
    >
      <span class="icon">{{ rotating ? '⏸' : '📺' }}</span>{{ rotating ? '轮播中' : '投屏轮播' }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  tabs: { type: Array, required: true },
  active: { type: String, default: '' },
  rotating: { type: Boolean, default: false }
})
defineEmits(['select', 'toggle-rotate'])
</script>
