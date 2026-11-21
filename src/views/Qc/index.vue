<template>
  <div class="qc-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader title="集成工厂QC人力规划" subtitle="制程质量部门 · 车间人力配置与缺口监控" />

    <!-- KPI 卡片区：4 张等宽 -->
    <StatCardRow class="qc-kpi-row" :gap="12" :min-card-width="200" :max-card-width="420">
      <StatCard
        v-for="(item, idx) in kpiCards"
        :key="idx"
        :theme="item.theme"
        :status="item.status"
        :title="item.title"
        :sub-title="item.subTitle"
        :value="item.value"
        :unit="item.unit"
        :trend="item.trend"
        :trend-type="item.trendType"
        :trend-label="item.trendLabel"
        :badge="item.badge"
      />
    </StatCardRow>

    <!-- 主体三列 Bento 布局 -->
    <div class="qc-main">
      <!-- 左侧：风险预警 + 人员充足率 -->
      <div class="qc-col qc-col--left">
        <!-- 风险预警 -->
        <ScreenCard class="qc-risk" title="风险预警">
          <template #extra>
            <span class="qc-risk-count" :class="{ warn: qc.warnCount > 0 }">
              {{ qc.highRiskCount }}个高风险
            </span>
          </template>
          <div class="risk-list">
            <div
              v-for="(r, i) in topRisks"
              :key="i"
              class="risk-item"
              :class="'risk-item--' + r.level"
            >
              <div class="risk-row">
                <span class="risk-name">{{ r.name }}车间</span>
                <span class="risk-gap">{{ r.gapText }}</span>
              </div>
              <p class="risk-msg">{{ r.msg }}</p>
            </div>
            <div v-if="!topRisks.length" class="risk-item risk-item--ok">
              <div class="risk-row">
                <span class="risk-name">全部车间</span>
                <span class="risk-gap" style="background:var(--color-success,#10b981)">充足</span>
              </div>
              <p class="risk-msg">各车间人力配置正常，无显著缺口</p>
            </div>
          </div>
        </ScreenCard>

        <!-- 人员充足率仪表盘 -->
        <ScreenCard class="qc-gauge" title="人员充足率">
          <div class="gauge-wrap">
            <BaseChart :option="gaugeOption" class="gauge-chart" />
          </div>
          <div class="gauge-meta">
            <div class="meta-item">
              <span class="meta-label">支援占比</span>
              <span class="meta-value primary">{{ qc.kpi.supportRate }}%</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">预离职占比</span>
              <span class="meta-value danger">{{ qc.kpi.preLeaveRate }}%</span>
            </div>
          </div>
        </ScreenCard>
      </div>

      <!-- 中间：人力配置柱状图 + 饼图 + 缺口对比图 -->
      <div class="qc-col qc-col--center">
        <ScreenCard class="qc-bar" title="各车间人力配置对比">
          <BaseChart :option="barOption" class="bar-chart" />
        </ScreenCard>
        <div class="qc-center-bottom">
          <ScreenCard class="qc-pie" title="人力分布结构">
            <BaseChart :option="pieOption" class="pie-chart" />
          </ScreenCard>
          <ScreenCard class="qc-compare" title="当前vs预计缺口">
            <BaseChart :option="compareOption" class="compare-chart" />
          </ScreenCard>
        </div>
      </div>

      <!-- 右侧：支援人员来源 + 预离职人员分布 -->
      <div class="qc-col qc-col--right">
        <ScreenCard class="qc-support" title="支援人员来源">
          <div class="support-list">
            <div v-for="(s, i) in qc.supportSources" :key="i" class="support-item">
              <div class="support-head">
                <span class="support-name">{{ s.name }}</span>
                <span class="support-count">{{ s.count }}人</span>
              </div>
              <div class="support-bar">
                <div
                  class="support-fill"
                  :class="'support-fill--' + s.color"
                  :style="{ width: (qc.maxSupport > 0 ? s.count / qc.maxSupport * 100 : 0) + '%' }"
                ></div>
              </div>
              <p class="support-desc">{{ s.desc }}</p>
            </div>
            <div v-if="qc.externalWait > 0" class="support-item support-item--ext">
              <div class="support-head">
                <span class="support-name">待外部支援</span>
                <span class="support-count warn">{{ qc.externalWait }}人</span>
              </div>
              <p class="support-desc">A2车间缺口最大，优先补充</p>
            </div>
          </div>
        </ScreenCard>

        <ScreenCard class="qc-leave" title="预离职人员分布">
          <div class="leave-wrap">
            <BaseChart :option="leaveOption" class="leave-chart" />
          </div>
          <div class="leave-legend">
            <div v-for="(l, i) in qc.leaveDist" :key="i" class="legend-item">
              <span class="legend-dot" :style="{ background: pieColors[i % pieColors.length] }"></span>
              <span class="legend-name">{{ l.name }}车间</span>
              <span class="legend-value">{{ l.value }}人 ({{ l.percent }}%)</span>
            </div>
            <div v-if="!qc.leaveDist.length" class="legend-empty">暂无预离职</div>
          </div>
        </ScreenCard>
      </div>
    </div>

    <!-- 底部结论条 -->
    <SummaryBar
      class="qc-summary"
      :type="summary.type"
      icon="warning"
    >
      {{ summary.text }}
      <template #tags>
        <StatusTag v-for="(tag, i) in summary.tags" :key="i" :text="tag.text" :type="tag.type" effect="dark" round />
      </template>
    </SummaryBar>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import StatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { parseQcData } from '@/utils/parseQc.js'

// ============ 数据 ============
const qc = ref({
  total: {}, shops: [], riskList: [], highRiskCount: 0, warnCount: 0,
  supportSources: [], externalWait: 0, maxSupport: 0, leaveDist: [],
  kpi: {
    totalConfig: 0, onjob: 0, configRate: 0, actual: 0, onjobFillRate: 0,
    gapNow: 0, gapRate: 0, gapExpect: 0, preLeave: 0, totalSupport: 0,
    fillRate: 0, supportRate: 0, preLeaveRate: 0,
  },
})

const loadError = ref('')
const loaded = ref(false)

onMounted(async () => {
  try {
    qc.value = await parseQcData()
    loaded.value = true
  } catch (e) {
    console.error('[QC] 数据加载失败', e)
    loadError.value = e.message || String(e)
  }
})

// ============ 颜色 ============
const pieColors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']

// ============ 派生：风险 Top3 ============
const topRisks = computed(() =>
  qc.value.riskList
    .filter(r => r.level !== 'ok')
    .sort((a, b) => {
      const lv = { danger: 0, warning: 1 }
      if (lv[a.level] !== lv[b.level]) return lv[a.level] - lv[b.level]
      return a.gapNow - b.gapNow
    })
    .slice(0, 3)
)

// ============ KPI 卡片 ============
const kpiCards = computed(() => {
  const k = qc.value.kpi
  return [
    {
      title: '总配置人力',
      subTitle: `在职${k.onjob}人`,
      value: k.totalConfig,
      unit: '人',
      theme: 'blue',
      status: 'default',
      trendLabel: `架构配置完成率 ${k.configRate.toFixed(1)}%`,
      trendType: 'up',
      trend: k.configRate - 100,
    },
    {
      title: '当前实际人力',
      subTitle: '含内部/其他工厂支援',
      value: k.actual,
      unit: '人',
      theme: 'green',
      status: 'default',
      trendLabel: `实际人力配置率 ${k.onjobFillRate.toFixed(1)}%`,
      trendType: k.onjobFillRate >= 100 ? 'up' : 'down',
      trend: k.onjobFillRate - 100,
    },
    {
      title: '当前缺口',
      subTitle: '实际人力 - 配置',
      value: Math.abs(k.gapNow),
      unit: '人',
      theme: 'orange',
      status: k.gapNow < 0 ? 'warning' : 'success',
      trendLabel: `缺口比例 ${k.gapRate.toFixed(1)}%`,
      trendType: k.gapNow < 0 ? 'down' : 'up',
      trend: -k.gapRate,
    },
    {
      title: '预计总缺口',
      subTitle: `预离职${k.preLeave}人`,
      value: Math.abs(k.gapExpect),
      unit: '人',
      theme: 'red',
      status: k.gapExpect < 0 ? 'danger' : 'success',
      trendLabel: `其他工厂预计支援${k.totalSupport}人`,
      trendType: k.gapExpect < 0 ? 'down' : 'up',
      trend: k.gapExpect,
    },
  ]
})

// ============ 图表 Option ============
const COLOR_PRIMARY = getCssVar('--color-primary', '#2563eb')
const COLOR_SECONDARY = getCssVar('--color-primary-light', '#0ea5e9')
const COLOR_WARNING = getCssVar('--color-warning', '#f59e0b')
const COLOR_DANGER = getCssVar('--color-danger', '#ef4444')
const COLOR_SUCCESS = getCssVar('--color-success', '#10b981')
const COLOR_TEXT = getCssVar('--color-text-secondary', '#64748b')
const COLOR_GRID = getCssVar('--color-border-light', '#f1f5f9')

function getCssVar(name, fallback = '') {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch { return fallback }
}

// 人员充足率仪表盘
const gaugeOption = computed(() => {
  const rate = qc.value.kpi.fillRate
  return {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 10,
      radius: '95%',
      center: ['50%', '62%'],
      axisLine: { lineStyle: { width: 12, color: [[1, '#e2e8f0']] } },
      progress: { show: true, width: 12, roundCap: true },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      title: { show: false },
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: COLOR_DANGER },
            { offset: 0.5, color: COLOR_WARNING },
            { offset: 1, color: COLOR_SUCCESS },
          ]
        }
      },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '0%'],
        fontSize: 28,
        fontWeight: 'bold',
        formatter: '{value}%',
        color: '#1e293b',
      },
      data: [{ value: +rate.toFixed(1) }],
    }]
  }
})

// 各车间人力配置对比：配置人力 / 在职架构 / 实际人力 / 预计缺口
const barOption = computed(() => {
  const shops = qc.value.shops
  const names = shops.map(s => s.name)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['配置人力', '在职架构', '实际人力', '预计缺口'],
      bottom: 0,
      itemWidth: 10, itemHeight: 10, itemGap: 16,
      textStyle: { color: COLOR_TEXT, fontSize: 11 },
    },
    grid: { left: '2%', right: '3%', bottom: '18%', top: '4%', containLabel: true },
    xAxis: {
      type: 'category', data: names,
      axisLine: { lineStyle: { color: COLOR_GRID } },
      axisTick: { show: false },
      axisLabel: { color: COLOR_TEXT, fontSize: 11, fontWeight: 500 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: COLOR_GRID, type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        name: '配置人力', type: 'bar', barWidth: '18%',
        itemStyle: { color: '#e2e8f0', borderRadius: [4, 4, 0, 0] },
        data: shops.map(s => s.config),
      },
      {
        name: '在职架构', type: 'bar', barWidth: '18%',
        itemStyle: { color: '#93c5fd', borderRadius: [4, 4, 0, 0] },
        data: shops.map(s => s.onjob),
      },
      {
        name: '实际人力', type: 'bar', barWidth: '18%',
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: COLOR_PRIMARY }, { offset: 1, color: COLOR_SECONDARY }
          ] },
          borderRadius: [4, 4, 0, 0],
        },
        data: shops.map(s => s.actual),
      },
      {
        name: '预计缺口', type: 'bar', barWidth: '18%',
        itemStyle: { color: '#f87171', borderRadius: [4, 4, 0, 0] },
        data: shops.map(s => Math.min(s.gapExpect, 0)), // 柱图只画负缺口
      },
    ],
  }
})

// 人力分布饼图
const pieOption = computed(() => {
  const shops = qc.value.shops
  return {
    tooltip: { trigger: 'item' },
    series: [{
      name: '人力分布',
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true, position: 'outside', fontSize: 11,
        formatter: '{b}: {c}人',
      },
      labelLine: { length: 8, length2: 6 },
      data: shops.map((s, i) => ({
        name: s.name,
        value: s.actual,
        itemStyle: { color: pieColors[i % pieColors.length] },
      })),
    }]
  }
})

// 当前 vs 预计缺口对比
const compareOption = computed(() => {
  const shops = qc.value.shops
  const names = shops.map(s => s.name)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['当前缺口', '预计缺口'], bottom: 0,
      itemWidth: 10, itemHeight: 10,
      textStyle: { color: COLOR_TEXT, fontSize: 10 },
    },
    grid: { left: '2%', right: '3%', bottom: '22%', top: '4%', containLabel: true },
    xAxis: {
      type: 'category', data: names,
      axisLine: { lineStyle: { color: COLOR_GRID } },
      axisTick: { show: false },
      axisLabel: { color: COLOR_TEXT, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: COLOR_GRID, type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
    series: [
      {
        name: '当前缺口', type: 'bar', barWidth: '32%',
        itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] },
        data: shops.map(s => Math.min(s.gapNow, 0)),
      },
      {
        name: '预计缺口', type: 'bar', barWidth: '32%',
        itemStyle: { color: COLOR_DANGER, borderRadius: [4, 4, 0, 0] },
        data: shops.map(s => Math.min(s.gapExpect, 0)),
      },
    ],
  }
})

// 预离职环形图
const leaveOption = computed(() => {
  const leave = qc.value.leaveDist
  const total = qc.value.kpi.preLeave
  return {
    tooltip: { trigger: 'item' },
    series: [{
      name: '预离职分布',
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '48%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true, position: 'center',
        formatter: `{total|${total}人}\n{sub|总预离职}`,
        rich: {
          total: { fontSize: 22, fontWeight: 'bold', color: COLOR_DANGER, lineHeight: 28 },
          sub: { fontSize: 10, color: COLOR_TEXT },
        },
      },
      labelLine: { show: false },
      data: leave.map((l, i) => ({
        name: l.name, value: l.value,
        itemStyle: { color: pieColors[i % pieColors.length] },
      })),
    }]
  }
})

// ============ 结论条 ============
const summary = computed(() => {
  const k = qc.value.kpi
  const hasGap = k.gapExpect < 0
  return {
    type: hasGap ? 'warning' : 'success',
    icon: hasGap ? 'warning' : 'success',
    text: hasGap
      ? `QC 人力整体配置率 ${k.onjobFillRate.toFixed(1)}%，当前缺口 ${Math.abs(k.gapNow)} 人，考虑预离职 ${k.preLeave} 人后预计总缺口 ${Math.abs(k.gapExpect)} 人；A2/M5 车间缺口最大，其他工厂支援 ${k.totalSupport} 人已就位，待外部支援 ${qc.value.externalWait} 人优先补充 A2 车间。`
      : 'QC 人力配置充足，无缺口。',
    tags: [
      ...(qc.value.highRiskCount > 0 ? [{ text: `高风险${qc.value.highRiskCount}个`, type: 'danger' }] : []),
      ...(qc.value.warnCount > 0 ? [{ text: `预警${qc.value.warnCount}个`, type: 'warning' }] : []),
      { text: `充足率 ${k.fillRate}%`, type: k.fillRate >= 95 ? 'success' : 'warning' },
    ],
  }
})
</script>

<style scoped lang="scss">
.qc-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.qc-kpi-row {
  margin-bottom: $spacing-md;
  flex-shrink: 0;
}

.qc-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: $spacing-md;
  min-height: 0;
  margin-bottom: $spacing-md;
}

.qc-col {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  min-height: 0;
}

// 左列
.qc-risk {
  flex-shrink: 0;
}

.qc-gauge {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;

  :deep(.screen-card-body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: $spacing-sm $spacing-md $spacing-md;
  }
}

.gauge-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
.gauge-chart {
  width: 100%;
  height: 100%;
}

.gauge-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-sm;
  margin-top: $spacing-sm;

  .meta-item {
    text-align: center;
    padding: $spacing-xs $spacing-sm;
    background: var(--color-bg-light, #f8fafc);
    border-radius: $radius-md;

    .meta-label {
      display: block;
      font-size: $font-xs;
      color: var(--color-text-muted);
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: $font-md;
      font-weight: 700;
      font-family: 'DIN Alternate', sans-serif;
      &.primary { color: var(--color-primary); }
      &.danger { color: var(--color-danger); }
    }
  }
}

// 风险预警
.qc-risk-count {
  font-size: $font-xs;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--color-danger-light, #fef2f2);
  color: var(--color-danger);
  font-weight: 600;
  &.warn { background: var(--color-warning-light, #fffbeb); color: var(--color-warning); }
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}
.risk-item {
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  border-left: 3px solid transparent;

  &--danger {
    background: var(--color-danger-light, #fef2f2);
    border-left-color: var(--color-danger);
  }
  &--warning {
    background: var(--color-warning-light, #fffbeb);
    border-left-color: var(--color-warning);
  }
  &--ok {
    background: var(--color-success-light, #ecfdf5);
    border-left-color: var(--color-success);
  }

  .risk-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .risk-name { font-weight: 600; font-size: $font-sm; color: var(--color-text-primary); }
  .risk-gap {
    font-size: $font-xs;
    padding: 1px 6px;
    border-radius: 12px;
    font-weight: 600;
    background: var(--color-danger);
    color: #fff;
  }
  .risk-msg { margin: 0; font-size: $font-xs; color: var(--color-text-secondary); line-height: 1.4; }
}

// 中列
.qc-bar {
  flex: 1.4;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  :deep(.screen-card-body) { flex: 1; min-height: 0; padding: $spacing-sm $spacing-md; }
}
.bar-chart { width: 100%; height: 100%; }

.qc-center-bottom {
  flex: 1;
  min-height: 240px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
}
.qc-pie, .qc-compare {
  display: flex;
  flex-direction: column;
  :deep(.screen-card-body) { flex: 1; min-height: 0; padding: $spacing-sm $spacing-md; }
}
.pie-chart, .compare-chart { width: 100%; height: 100%; }

// 右列
.qc-support {
  flex-shrink: 0;
}
.qc-leave {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  :deep(.screen-card-body) {
    flex: 1; min-height: 0;
    display: flex; flex-direction: column;
    padding: $spacing-sm $spacing-md $spacing-md;
  }
}

.support-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}
.support-item {
  .support-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 4px;
  }
  .support-name { font-size: $font-xs; font-weight: 500; color: var(--color-text-primary); }
  .support-count {
    font-size: $font-xs; font-weight: 700; color: var(--color-primary);
    font-family: 'DIN Alternate', sans-serif;
    &.warn { color: var(--color-warning); }
  }
  .support-bar {
    height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;
  }
  .support-fill {
    height: 100%; border-radius: 3px;
    transition: width 1s ease;
    &--primary { background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light, #0ea5e9)); }
    &--secondary { background: linear-gradient(90deg, var(--color-primary-light, #0ea5e9), #22d3ee); }
    &--success { background: linear-gradient(90deg, var(--color-success), #34d399); }
    &--warning { background: linear-gradient(90deg, var(--color-warning), #fbbf24); }
  }
  .support-desc { margin: 4px 0 0; font-size: $font-xs; color: var(--color-text-muted); }

  &--ext {
    padding-top: $spacing-sm;
    border-top: 1px solid var(--color-border-light, #f1f5f9);
  }
}

.leave-wrap {
  flex: 1; min-height: 180px; position: relative;
}
.leave-chart { width: 100%; height: 100%; }
.leave-legend {
  display: flex; flex-direction: column; gap: 4px;
  .legend-item {
    display: flex; align-items: center; gap: $spacing-sm;
    font-size: $font-xs; color: var(--color-text-secondary);
  }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
  .legend-name { flex: 1; }
  .legend-value { font-weight: 600; font-family: 'DIN Alternate', sans-serif; color: var(--color-text-primary); }
  .legend-empty { font-size: $font-xs; color: var(--color-text-muted); text-align: center; padding: $spacing-sm 0; }
}

.qc-summary { flex-shrink: 0; }
</style>
