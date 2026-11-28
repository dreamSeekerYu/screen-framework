<template>
  <!-- A1/A2/A3 详情：通用A型布局 -->
  <div v-if="customer" class="pack-detail-card">
    <div class="detail-head">
      <h3 class="detail-title">{{ customer.meta.fullName }} - 质量表现详情</h3>
      <StatusTag :type="risk.level" effect="light" size="small" :text="`${risk.text} · ${risk.score}分`" />
    </div>

    <div class="detail-chart-grid">
      <ScreenCard v-for="p in charts" :key="p.key" class="detail-chart-block" :show-corners="false">
        <template #title>
          <div class="detail-sub-title">{{ p.title }}</div>
        </template>
        <div class="chart-box-h240">
          <BaseChart :option="p.option" />
        </div>
      </ScreenCard>
    </div>

    <div class="detail-table-wrap">
      <h4 class="detail-sub-title">详细数据表（最近 5 周）</h4>
      <table class="pack-data-table">
        <thead>
          <tr>
            <th>项目</th>
            <th v-for="w in weeks" :key="w">{{ w }}</th>
            <th>目标</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name">
            <td class="tl">{{ row.name }}</td>
            <td v-for="(v,i) in row.weekly" :key="i" :class="valColor(row, v)">{{ formatVal(v) }}</td>
            <td>{{ row.target === '—' ? '—' : '≤' + row.target + ' PPM' }}</td>
            <td>
              <span class="cc-status" :class="`status-${row.status}`">{{ row.statusText }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import StatusTag from '@/components/common/StatusTag.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import { valColor, formatVal } from '../packFormat.js'

defineProps({
  customer: { type: Object, default: null },
  risk: { type: Object, required: true },
  charts: { type: Array, default: () => [] },
  weeks: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] }
})
</script>
