<template>
  <div class="pack-client-card" :class="{ selected }" @click="$emit('click')">
    <div class="cc-head">
      <h3 class="cc-name">{{ card.name }}</h3>
      <StatusTag :type="card.riskLevel" effect="light" size="small" :text="card.riskText" />
    </div>
    <div class="cc-body">
      <div class="cc-metrics">
        <div v-for="m in card.metrics" :key="m.label" class="cc-row">
          <span class="cc-label">{{ m.label }}</span>
          <span class="cc-val" :class="m.colorClass">{{ m.value }}</span>
        </div>
      </div>
      <div class="cc-ring" :style="ringStyle">
        <div class="cc-ring-hole">
          <span class="cc-ring-num">{{ card.passRate }}%</span>
          <span class="cc-ring-label">达标率</span>
        </div>
      </div>
    </div>
    <div class="cc-spark">
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" class="cc-spark-svg">
        <polygon :points="`0,26 ${card.sparkPoints} 100,26`"
          :fill="`var(--color-${card.sparkColor}-bg)`" opacity="0.5" />
        <polyline :points="card.sparkPoints" fill="none" stroke-width="1.6"
          :stroke="`var(--color-${card.sparkColor})`" vector-effect="non-scaling-stroke" />
      </svg>
      <span class="cc-spark-label">0KM PPM 走势</span>
    </div>
    <div class="cc-remark">{{ card.remark }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatusTag from '@/components/common/StatusTag.vue'

const props = defineProps({
  card: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})
defineEmits(['click'])

/** 达标率环形（conic-gradient，颜色随风险等级） */
const ringStyle = computed(() => {
  const c = props.card
  const color = `var(--color-${c.ringColor === 'danger' ? 'danger' : c.ringColor})`
  return { background: `conic-gradient(${color} ${c.passRate}%, var(--color-bg-soft) 0)` }
})
</script>
