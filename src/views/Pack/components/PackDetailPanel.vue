<template>
  <div class="pack-tab-panel">
    <PackClientTabs
      :clients="clients"
      :active-client="activeClient"
      :window-tabs="windowTabs"
      :time-window="timeWindow"
      @select-client="$emit('select-client', $event)"
      @select-window="$emit('select-window', $event)"
    />

    <!-- A1/A2/A3 详情：通用A型布局 -->
    <PackADetail
      v-if="currentA"
      :customer="currentA"
      :risk="currentRisk"
      :charts="currentACharts"
      :weeks="currentAWeeks"
      :rows="currentARows"
    />

    <!-- A4-M5 详情 -->
    <PackM5Detail
      v-if="activeClient === 'M5' && m5"
      :customer="m5"
      :risk="m5Risk"
      :chart-option="m5ChartOption"
      :rows="m5Rows"
      :conclusion="m5Conclusion"
    />

    <!-- A4-M6 详情 -->
    <PackM6Detail
      v-if="activeClient === 'M6' && m6"
      :customer="m6"
      :risk="m6Risk"
      :chart-option="m6ChartOption"
      :table-headers="m6TableHeaders"
      :table-rows="m6TableRows"
      :peak-delivery="m6PeakDelivery"
      :conclusion="m6Conclusion"
    />
  </div>
</template>

<script setup>
import PackClientTabs from './PackClientTabs.vue'
import PackADetail from './PackADetail.vue'
import PackM5Detail from './PackM5Detail.vue'
import PackM6Detail from './PackM6Detail.vue'

defineProps({
  clients: { type: Array, required: true },
  activeClient: { type: String, default: '' },
  windowTabs: { type: Array, required: true },
  timeWindow: { type: String, default: '' },

  currentA: { type: Object, default: null },
  currentRisk: { type: Object, required: true },
  currentACharts: { type: Array, default: () => [] },
  currentAWeeks: { type: Array, default: () => [] },
  currentARows: { type: Array, default: () => [] },

  m5: { type: Object, default: null },
  m5Risk: { type: Object, required: true },
  m5ChartOption: { type: Object, default: () => ({}) },
  m5Rows: { type: Array, default: () => [] },
  m5Conclusion: { type: String, default: '' },

  m6: { type: Object, default: null },
  m6Risk: { type: Object, required: true },
  m6ChartOption: { type: Object, default: () => ({}) },
  m6TableHeaders: { type: Array, default: () => [] },
  m6TableRows: { type: Array, default: () => [] },
  m6PeakDelivery: { type: Object, default: () => ({ value: 0, week: '' }) },
  m6Conclusion: { type: String, default: '' }
})
defineEmits(['select-client', 'select-window'])
</script>
