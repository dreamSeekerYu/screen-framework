<template>
  <!-- A4-M5 详情 -->
  <div v-if="customer" class="pack-detail-card">
    <div class="detail-head">
      <h3 class="detail-title">A4客户 - M5-XP (D03E) 质量表现</h3>
      <StatusTag :type="risk.level" effect="light" size="small" :text="`${risk.text} · ${risk.score}分`" />
    </div>
    <div class="detail-chart-grid--wide">
      <ScreenCard class="detail-chart-block full" :show-corners="false">
        <template #title>
          <div class="detail-sub-title">M5-XP 集成0KM表现</div>
        </template>
        <div class="chart-box-h300">
          <BaseChart :option="chartOption" />
        </div>
      </ScreenCard>
    </div>
    <div class="detail-table-wrap">
      <h4 class="detail-sub-title">M5-XP 关键数据</h4>
      <table class="pack-data-table">
        <thead>
          <tr><th>周期</th><th>故障数</th><th>供货数</th><th>0KM实际PPM</th><th>目标PPM</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.period">
            <td class="tl">{{ r.period }}</td>
            <td>{{ r.fail }}</td>
            <td>{{ r.supply }}</td>
            <td :class="r.ppmColor">{{ r.ppm }}</td>
            <td>{{ r.target }}</td>
            <td><span class="cc-status" :class="`status-${r.status}`">{{ r.statusText }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="detail-note note-blue">
      <h4>M5集成结论（由数据自动生成）</h4>
      <p>{{ conclusion }}</p>
    </div>
  </div>
</template>

<script setup>
import StatusTag from '@/components/common/StatusTag.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'

defineProps({
  customer: { type: Object, default: null },
  risk: { type: Object, required: true },
  chartOption: { type: Object, default: () => ({}) },
  rows: { type: Array, default: () => [] },
  conclusion: { type: String, default: '' }
})
</script>
