<template>
  <!-- 总览仪表盘 -->
  <div class="pack-tab-panel pack-tab-panel--overview">
    <!-- KPI 行：StatCardRow + StatCard，副标题/状态色由风险规则引擎动态生成 -->
    <StatCardRow class="pack-kpi-row" :gap="16" :min-card-width="200" :max-card-width="460">
      <StatCard
        v-for="(k, i) in kpis"
        :key="k.title"
        theme="kpi-top"
        :status="k.status"
        :title="k.title"
        :sub-title="k.sub"
        :value="k.value"
        :count-up="true"
        :fit-value="false"
        animated
        :animation-delay="i * 80"
      />
    </StatCardRow>

    <!-- 客户健康度矩阵：风险标签 + 达标率环形 + 0KM PPM sparkline 迷你趋势 -->
    <div class="pack-client-grid">
      <PackClientCard
        v-for="c in cards"
        :key="c.key"
        :card="c"
        :selected="activeClient === c.key"
        @click="$emit('jump', c.key)"
      />
    </div>

    <!-- 图表区域：ScreenCard + BaseChart -->
    <div class="pack-chart-grid">
      <ScreenCard class="pack-chart-card" :show-corners="false">
        <template #title>
          <div class="chart-title"><span class="chart-bar"></span>各客户0KM PPM趋势对比</div>
        </template>
        <div class="chart-box-h300">
          <BaseChart :option="trendOption" />
        </div>
      </ScreenCard>
      <ScreenCard class="pack-chart-card" :show-corners="false">
        <template #title>
          <div class="chart-title"><span class="chart-bar"></span>各周期PPM达标情况统计</div>
        </template>
        <template #subTitle>
          <div class="chart-sub">得分 = 目标/实际×100（封顶100），由数据实时计算</div>
        </template>
        <div class="chart-box-h300">
          <BaseChart :option="radarOption" />
        </div>
      </ScreenCard>
    </div>
  </div>
</template>

<script setup>
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import PackClientCard from './PackClientCard.vue'

defineProps({
  kpis: { type: Array, default: () => [] },
  cards: { type: Array, default: () => [] },
  activeClient: { type: String, default: '' },
  trendOption: { type: Object, default: () => ({}) },
  radarOption: { type: Object, default: () => ({}) }
})
defineEmits(['jump'])
</script>
