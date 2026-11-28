<template>
  <!-- A4-M6 详情 -->
  <div v-if="customer" class="pack-detail-card">
    <div class="detail-head">
      <h3 class="detail-title">A4客户 - M6-XM (小米-N1) 质量表现</h3>
      <StatusTag :type="risk.level" effect="light" size="small" :text="`${risk.text} · ${risk.score}分`" />
    </div>
    <div class="detail-chart-grid">
      <ScreenCard class="detail-chart-block" :show-corners="false">
        <template #title>
          <div class="detail-sub-title">小米-N1 0KM客户表现</div>
        </template>
        <div class="chart-box-h300">
          <BaseChart :option="chartOption" />
        </div>
      </ScreenCard>
      <ScreenCard class="detail-chart-block" :show-corners="false">
        <template #title>
          <div class="detail-sub-title">关键指标数据</div>
        </template>
        <div class="m6-metrics">
          <div class="m6-metric-item">
            <div class="m6-m-head">
              <span>{{ customer.kpi.km0.peakWeek || '窗口' }} 外观PPM峰值</span>
              <span class="m6-val" :class="customer.kpi.km0.status === 'success' ? 'text-green' : 'text-red'">{{ fmt(customer.kpi.km0.ppm) }}</span>
            </div>
            <div class="m6-bar"><div class="m6-bar-fill" :class="customer.kpi.km0.status === 'success' ? 'bar-green' : 'bar-red'" :style="{ width: Math.min(100, customer.kpi.km0.target ? customer.kpi.km0.ppm / customer.kpi.km0.target * 100 : 100) + '%' }"></div></div>
            <div class="m6-sub">目标值：{{ customer.kpi.km0.target || 300 }}PPM，{{ customer.kpi.km0.ppm > customer.kpi.km0.target ? `超标${(customer.kpi.km0.ppm / customer.kpi.km0.target).toFixed(1)}倍` : '达标' }}</div>
          </div>
          <div class="m6-metric-item">
            <div class="m6-m-head">
              <span>{{ customer.kpi.km3.peakWeek || '窗口' }} 性能PPM峰值</span>
              <span class="m6-val" :class="customer.kpi.km3.status === 'success' ? 'text-green' : 'text-red'">{{ fmt(customer.kpi.km3.ppm) }}</span>
            </div>
            <div class="m6-bar"><div class="m6-bar-fill" :class="customer.kpi.km3.status === 'success' ? 'bar-green' : 'bar-red'" :style="{ width: Math.min(100, customer.kpi.km3.target ? customer.kpi.km3.ppm / customer.kpi.km3.target * 100 : 100) + '%' }"></div></div>
            <div class="m6-sub">目标值：{{ customer.kpi.km3.target || 150 }}PPM，{{ customer.kpi.km3.ppm <= customer.kpi.km3.target ? '达标' : '超标' }}</div>
          </div>
          <div class="m6-metric-item">
            <div class="m6-m-head">
              <span>周交付量峰值</span>
              <span class="m6-val text-blue">{{ peakDelivery.value }}</span>
            </div>
            <div class="m6-bar"><div class="m6-bar-fill bar-blue" style="width:100%"></div></div>
            <div class="m6-sub">{{ peakDelivery.week }} 交付峰值，产能爬坡期</div>
          </div>
        </div>
      </ScreenCard>
    </div>
    <div class="detail-table-wrap">
      <h4 class="detail-sub-title">小米-N1 详细数据表</h4>
      <table class="pack-data-table">
        <thead>
          <tr>
            <th>项目</th>
            <th v-for="h in tableHeaders" :key="h">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.name">
            <td class="tl">{{ row.name }}</td>
            <td v-for="(v,i) in row.values" :key="i" :class="row.color[i]">{{ v }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="detail-note note-yellow">
      <h4>M6集成结论（由数据自动生成）与未计入问题说明</h4>
      <p>{{ conclusion }}</p>
      <p><strong>未计入0KM问题（业务备注）：</strong></p>
      <ul>
        <li>• 水管磕伤（翻包导致），客户端已处理，不计入</li>
        <li>• 箱盖及箱体变形6例（出厂照片无异常），判定为中储物流责任，不计入</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import StatusTag from '@/components/common/StatusTag.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import { formatVal as fmt } from '../packFormat.js'

defineProps({
  customer: { type: Object, default: null },
  risk: { type: Object, required: true },
  chartOption: { type: Object, default: () => ({}) },
  tableHeaders: { type: Array, default: () => [] },
  tableRows: { type: Array, default: () => [] },
  peakDelivery: { type: Object, default: () => ({ value: 0, week: '' }) },
  conclusion: { type: String, default: '' }
})
</script>
