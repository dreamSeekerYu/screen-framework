<template>
  <div class="qc-page">
    <!-- 顶部标题栏：右侧放入「查看明细」按钮 -->
    <ScreenHeader title="集成工厂QC人力规划" subtitle="制程质量部门 · 车间人力配置与缺口监控">
      <template #right>
        <button class="qc-detail-btn" @click="detailVisible = true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          查看明细
        </button>
      </template>
    </ScreenHeader>

    <div class="qc-body">
      <!-- KPI 四卡 -->
      <StatCardRow :gap="12" :min-card-width="220" :max-card-width="520">
        <NewStatCard v-for="(c, i) in kpiCards" :key="i"
                     :theme="c.theme" :title="c.title" :value="c.value" :unit="c.unit"
                     :subTitle="(c.explain?c.explain:'') + (c.subTitle?c.subTitle:'')" :trend="c.trend" :trend-type="c.trendType">
          <template v-if="c.extra" #left-extra>
            <div class="kpi-extra">{{ c.extra }}</div>
          </template>
          <template v-if="c.progress !== undefined" #right-extra>
            <div class="kpi-progress">
              <div class="kpi-progress__fill" :style="{ width: Math.min(c.progress, 100) + '%' }"></div>
            </div>
          </template>
        </NewStatCard>
      </StatCardRow>

      <!-- 结论条 -->
      <SummaryBar :type="summary.type" :icon="summary.icon" class="qc-summary">
        {{ summary.text }}
        <template #tags>
          <StatusTag v-for="(t, i) in summary.tags" :key="i" :text="t.text" :type="t.type" effect="light" round />
        </template>
      </SummaryBar>

      <!-- 主体三列 3:6:3 -->
      <div class="qc-main">
        <!-- 左列：风险预警 + 人员充足率 -->
        <div class="qc-col qc-col--left">
          <ScreenCard title="人力分布结构" class="qc-pie">
              <BaseChart :option="pieOpt" class="qc-chart-full" />
          </ScreenCard>

          <ScreenCard title="人员充足率" class="qc-gauge">
            <BaseChart :option="gaugeOpt" class="qc-gauge__chart" />
            <div class="gauge-bottom">
              <div class="gauge-cell">
                <p class="gauge-cell__label">支援占比</p>
                <p class="gauge-cell__num">{{ qc.kpi?.supportRate ?? 0 }}%</p>
              </div>
              <div class="gauge-cell">
                <p class="gauge-cell__label">预离职占比</p>
                <p class="gauge-cell__num text-danger">{{ qc.kpi?.preLeaveRate ?? 0 }}%</p>
              </div>
            </div>
          </ScreenCard>
        </div>

        <!-- 中列：周度离职率推移 + 各车间人力配置对比 -->
        <div class="qc-col qc-col--mid">
          <ScreenCard title="周度离职率" class="qc-trend">
            <template #header-extra>
              <StatusTag :text="`目标 ≤ ${leaveTrend.target}%`" type="success" effect="light" round />
            </template>
            <BaseChart :option="leaveRateOpt" class="qc-chart-full" />
          </ScreenCard>
          <ScreenCard title="各车间人力配置对比" class="qc-bar">
            <BaseChart :option="barOpt" class="qc-chart-full" />
          </ScreenCard>
        </div>

        <!-- 右列：支援人员来源 + 预离职人员分布 -->
        <div class="qc-col qc-col--right">
           <ScreenCard title="预离职人员分布" class="qc-leave">
            <BaseChart :option="leaveOpt" class="qc-leave__chart" />
            <div class="leave-legend">
              <div v-for="l in qc.leaveDist" :key="l.name" class="leave-legend__row">
                <span class="leave-legend__name">
                  <i class="leave-dot" :style="{ background: leaveColors[l.name] }"></i>{{ l.name }}车间
                </span>
                <span class="leave-legend__num">{{ l.value }}人 ({{ l.percent }}%)</span>
              </div>
            </div>
          </ScreenCard>
           <ScreenCard title="当前vs预计缺口" class="qc-compare">
              <BaseChart :option="compareOpt" class="qc-chart-full" />
            </ScreenCard>
          <ScreenCard title="风险预警" class="qc-risk">
            <template #header-extra>
              <StatusTag v-if="qc.highRiskCount" :text="qc.highRiskCount + '个高风险'" type="danger" effect="light" round />
              <StatusTag v-else text="无高风险" type="success" effect="light" round />
            </template>
            <div class="risk-list">
              <div v-for="r in topRisks" :key="r.name" class="risk-item" :class="'risk-item--' + r.level">
                <div class="risk-item__top">
                  <span class="risk-item__name">{{ r.name }}车间</span>
                  <StatusTag :text="'缺口' + r.gapText" :type="r.level === 'danger' ? 'danger' : 'warning'"
                            effect="light" size="small" round />
                </div>
                <p class="risk-item__msg">{{ r.msg }}</p>
              </div>
              <div v-if="topRisks.length === 0" class="risk-empty">各车间人力充足，无明显风险</div>
            </div>
          </ScreenCard>
        </div>
      </div>

      <!-- 页脚提示 -->
      <!-- <div class="qc-footer">
        制程质量部门 · 数据更新时间：{{ qc.updatedAt || '2026年11月21日' }}
      </div> -->
    </div>

    <!-- 查看明细弹窗：直接从 qc人力.json 还原 Excel 原始表格（含最左合并标题列，行列动态适配） -->
    <Dialog v-model="detailVisible" :title="excelTable.title || '各车间人力明细'"
            :width="'min(94vw, 1760px)'" top="3vh">
      <div class="qc-detail" v-if="excelTable.rows.length">
        <table class="qc-detail__table qc-detail__table--excel">
          <colgroup>
            <col v-for="(p, i) in excelTable.colPercents" :key="i" :style="p ? { width: p + '%' } : {}" />
          </colgroup>
          <thead>
            <tr>
              <template v-for="(col, i) in excelTable.cols" :key="col.col">
                <th v-if="!col.head.skip"
                    :rowspan="col.head.rowSpan" :colspan="col.head.colSpan"
                    :style="col.head.css">
                  <template v-if="col.head.runs">
                    <span v-for="(r, ri) in col.head.runs" :key="ri" :style="r.css">{{ r.text }}</span>
                  </template>
                  <template v-else>{{ col.head.text }}</template>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in excelTable.rows" :key="row.key" :class="{ 'is-total': row.isTotal }">
              <template v-for="(c, ci) in row.cells" :key="ci">
                <td v-if="!c.skip"
                    :rowspan="c.rowSpan" :colspan="c.colSpan"
                    :style="c.css" :class="{ 'qc-detail__title-cell': c.rowSpan > 1 }">
                  <template v-if="c.runs">
                    <span v-for="(r, ri) in c.runs" :key="ri" :style="r.css">{{ r.text }}</span>
                  </template>
                  <template v-else>{{ c.empty ? '\u00A0' : c.text }}</template>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
        <p class="qc-detail__note">
          注：本表由 Excel 原始数据（qc人力.json）动态还原，行列与源表保持一致，源表增减行列后自动适配。
        </p>
      </div>
      <div v-else class="qc-detail qc-detail--loading">明细数据加载中...</div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import Dialog from '@/components/common/Dialog.vue'
import { parseQcData, parseLeaveRateTrend } from '@/utils/parseQc'
import { parseQcTable } from '@/utils/parseQcTable'
import { chartC, axisStyle, valueAxisStyle, tooltipStyle, legendStyle, gridStyle, pieItemStyle, areaGradient, lineStyle } from '@/utils/chartTheme.js'

// ============ 数据状态 ============
const qc = reactive({})
// 周度离职率推移（来自 周报源数据.json「九、离职率分析」区块，最近十周）
const leaveTrend = reactive({ weeks: [], total: [], leave: [], rate: [], target: 5 })
const detailVisible = ref(false)
// 从 qc人力.json 还原的 Excel 原始表格（行列动态适配）
const excelTable = reactive({ title: '', cols: [], colPercents: [], rows: [] })
const leaveColors = { A1: 'var(--color-primary)', A2: 'var(--color-danger)', A3: 'var(--color-success)', M5: 'var(--color-warning)', M6: 'var(--color-accent)' }

// ============ 辅助函数 ============
// （明细弹窗已改为 Excel 原表动态还原，旧的 formatGap / shopStatusTag / remarkByGap 移除）

// ============ 计算属性：KPI 卡片 ============
const kpiCards = computed(() => {
  const k = qc.kpi
  console.log('kpiCards.....',k)
  if (!k) return []
  return [
    {
      theme: 'kpi-side', title: '总配置人力', value: k.totalConfig, unit: '人',
      explain: `在职${k.onjob}人，`,
      subTitle: `架构配置完成率 ${k.configRate.toFixed(1)}%`,
    },
    {
      theme: 'kpi-side', title: '当前实际人力', value: k.actual, unit: '人',
      explain: '含内部/其他工厂支援，',
      subTitle: `实际配置率 ${k.onjobFillRate.toFixed(1)}%`,
    },
    {
      theme: 'kpi-side', title: '当前缺口', value: k.gapNow, unit: '人',
      explain: `缺口比例 ${k.gapRate.toFixed(1)}%`,
      progress: Math.max(k.gapRate, 0),
    },
    {
      theme: 'kpi-side', title: '预计总缺口', value: k.gapExpect, unit: '人',
      explain: `预离职${k.preLeave}人 · 其他工厂支援${k.totalSupport}人`,
    },
  ]
})

// ============ 计算属性：结论条 ============
const summary = computed(() => {
  const k = qc.kpi
  if (!k) return { type: 'info', icon: 'info', text: '数据加载中...', tags: [] }
  if (k.gapNow < 0) {
    return {
      type: 'warning', icon: 'warning',
      text: `当前整体配置率 ${k.fillRate}%，存在 ${-k.gapNow} 人的人力缺口；预计扣除预离职${k.preLeave}人后缺口扩大至 ${-k.gapExpect} 人。`,
      tags: [
        { text: `充足率${k.fillRate}%`, type: 'warning' },
        { text: `待外部支援${qc.externalWait}人`, type: 'danger' },
      ],
    }
  }
  return {
    type: 'success', icon: 'success',
    text: `当前整体人员配置充足，配置完成率 ${k.fillRate}%，无明显人力缺口。`,
    tags: [{ text: `配置完成率${k.fillRate}%`, type: 'success' }],
  }
})

const topRisks = computed(() => {
  if (!qc.riskList) return []
  return qc.riskList.filter(r => r.level !== 'ok').slice(0, 3)
})

// ============ 图表 option（全部使用 CSS 变量，BaseChart 会自动 resolve） ============
const gaugeOpt = computed(() => {
  const fill = qc.kpi?.fillRate ?? 0
  return {
    series: [{
      type: 'gauge', radius: '85%', startAngle: 220, endAngle: -40,
      min: 0, max: 100,
      progress: {
        show: true, width: 14, roundCap: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'var(--color-primary)' },
            { offset: 1, color: 'var(--color-success)' },
          ]),
        },
      },
      axisLine: { lineStyle: { width: 14, color: [[1, 'color-mix(in srgb, var(--color-text-muted) 20%, transparent)']] } },
      pointer: { length: '60%', width: 5, itemStyle: { color: 'var(--color-primary)' } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      anchor: { show: false }, title: { show: false },
      detail: {
        valueAnimation: true, offsetCenter: [0, '5%'],
        formatter: v => v.toFixed(1) + '%',
        color: 'var(--text-main)', fontSize: 24, fontWeight: 'bold',
        offsetCenter:[0,'35%'],
      },
      data: [{ value: fill }],
    }],
  }
})

const barOpt = computed(() => {
  const shops = qc.shops || []
  return {
    tooltip: tooltipStyle({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    legend: legendStyle({ top: 0, right: 10 }),
    grid: gridStyle(),
    xAxis: { type: 'category', data: shops.map(s => s.name + '车间'), ...axisStyle() },
    yAxis: { type: 'value', ...valueAxisStyle() },
    series: [
      { name: '配置架构', type: 'bar', barWidth: 10,
        itemStyle: { color: chartC.primary, borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => s.config) },
      { name: '在职架构', type: 'bar', barWidth: 10,
        itemStyle: { color: chartC.primaryL, borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => s.onjob) },
      { name: '实际人力', type: 'bar', barWidth: 10,
        itemStyle: { color: chartC.success, borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => s.actual) },
      { name: '预计缺口', type: 'bar', barWidth: 10,
        itemStyle: { color: chartC.warning, borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => Math.max(0, -s.gapExpect)) },
    ],
  }
})

const pieOpt = computed(() => {
  const shops = qc.shops || []
  const palette = [chartC.primary, chartC.danger, chartC.success, chartC.warning, chartC.accent]
  return {
    tooltip: tooltipStyle({ trigger: 'item', formatter: '{b}: {c}人 ({d}%)' }),
    legend: legendStyle({ bottom: 0 }),
    series: [{
      type: 'pie', radius: ['50%', '72%'], center: ['50%', '42%'],
      avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
      itemStyle: pieItemStyle(),
      data: shops.map((s, i) => ({
        name: s.name + '车间', value: s.actual,
        itemStyle: { color: palette[i % palette.length] },
      })),
    }],
  }
})

const compareOpt = computed(() => {
  const shops = qc.shops || []
  return {
    tooltip: tooltipStyle({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    legend: legendStyle({ top: 0, right: 10 }),
    grid: gridStyle(),
    xAxis: { type: 'category', data: shops.map(s => s.name), ...axisStyle() },
    yAxis: { type: 'value', ...valueAxisStyle({ axisLabel: { color: chartC.textMuted, fontSize: 11, formatter: v => (v >= 0 ? v : -v) } }) },
    series: [
      { name: '当前缺口', type: 'bar', barWidth: 12,
        itemStyle: { color: chartC.warning, borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => Math.max(0, -s.gapNow)) },
      { name: '预计缺口', type: 'bar', barWidth: 12,
        itemStyle: { color: chartC.danger, borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => Math.max(0, -s.gapExpect)) },
    ],
  }
})

const leaveOpt = computed(() => {
  const dist = qc.leaveDist || []
  return {
    tooltip: tooltipStyle({ trigger: 'item', formatter: '{b}: {c}人 ({d}%)' }),
    series: [{
      type: 'pie', radius: ['50%', '72%'], center: ['50%', '45%'],
      label: { show: false }, labelLine: { show: false },
      itemStyle: pieItemStyle(),
      data: dist.map(d => ({
        name: d.name + '车间', value: d.value,
        itemStyle: { color: leaveColors[d.name] || chartC.textMuted },
      })),
    }],
  }
})

/** 周度离职率推移折线（含 5% 目标参考线），全部走主题变量 */
const leaveRateOpt = computed(() => {
  if (!leaveTrend.weeks.length) return {}
  const peak = Math.max(leaveTrend.target, ...leaveTrend.rate, 1)
  const yMax = Math.ceil(peak * 1.25 * 2) / 2 // 留出标签空间，0.5 步进取整
  return {
    tooltip: tooltipStyle({
      trigger: 'axis',
      formatter: (ps) => {
        const i = ps[0].dataIndex
        return `<b>${leaveTrend.weeks[i]}</b><br/>` +
          ps.map(p => `${p.marker}${p.seriesName}：<b>${p.value}%</b>`).join('<br/>') +
          `<br/>总人数：${leaveTrend.total[i]} 人　离职：${leaveTrend.leave[i]} 人`
      },
    }),
    legend: legendStyle({ top: 0, right: 8, data: ['离职率', '目标'] }),
    grid: gridStyle({ top: 34 }),
    xAxis: { type: 'category', data: leaveTrend.weeks, boundaryGap: false, ...axisStyle() },
    yAxis: {
      type: 'value', min: 0, max: yMax,
      ...valueAxisStyle({ axisLabel: { color: chartC.textMuted, fontSize: 11, formatter: '{value}%' } }),
    },
    series: [
      {
        name: '离职率', type: 'line', smooth: true,
        symbol: 'circle', symbolSize: 7,
        data: leaveTrend.rate,
        lineStyle: lineStyle('var(--color-primary)'),
        itemStyle: { color: 'var(--color-primary)', borderWidth: 2, borderColor: chartC.cardBg },
        areaStyle: { color: areaGradient('var(--color-primary)', 14, 2) },
        label: {
          show: true, position: 'top', fontSize: 10, fontWeight: 700,
          color: chartC.text, formatter: p => p.value + '%',
        },
        z: 3,
      },
      {
        name: '目标', type: 'line', silent: true,
        data: leaveTrend.weeks.map(() => leaveTrend.target),
        symbol: 'none', smooth: false, step: 'end',
        lineStyle: { color: chartC.danger, width: 1.5, type: 'dashed' },
        itemStyle: { color: chartC.danger },
        z: 1,
      },
    ],
  }
})

// ============ 生命周期 ============
onMounted(async () => {
  try {
    const data = await parseQcData()
    Object.assign(qc, data)
    // 周度离职率推移（周报源数据.json「九、离职率分析」），加载失败不阻塞页面
    parseLeaveRateTrend(10)
      .then(t => t && Object.assign(leaveTrend, t))
      .catch(e => console.warn('离职率趋势加载失败:', e))
    console.log('QC 数据加载成功:', data)
    // 同时还原 Excel 原始表格（详情弹窗用）
    const table = await parseQcTable()
    Object.assign(excelTable, table)
    // 等布局稳定后触发一次 resize，确保 flex/grid 高度变化后图表尺寸正确
    await nextTick()
    window.dispatchEvent(new Event('resize'))
  } catch (e) {
    console.error('QC 数据加载失败:', e)
  }
})
</script>

<style lang="scss" scoped>
.qc-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.qc-body {
  /* 页面在 ScreenHeader（80px）之下，扣除头部高度避免整体溢出裁切 */
  height: calc(100% - $header-height);
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  box-sizing: border-box;
}

/* 右上角「查看明细」按钮 */
.qc-detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  margin-right: 12px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #fff;
  border: none;
  border-radius: $radius-md;
  font-size: $font-sm;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 25%, transparent);
  transition: all .2s;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent); }
}

.qc-summary { flex-shrink: 0; }

/* KPI 卡片额外内容 */
.kpi-extra {
  margin-top: 6px;
  font-size: $font-xs;
  color: var(--text-sub);
}
.kpi-progress {
  margin-top: 8px;
  height: 4px;
  width: 100%;
  background: color-mix(in srgb, var(--color-text-muted) 20%, transparent);
  border-radius: 2px;
  overflow: hidden;
}
.kpi-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 55%, #ffffff));
  border-radius: 2px;
  transition: width 1s ease;
}

/* 主体三列 3:6:3 */
.qc-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 3fr 6fr 3fr;
  grid-template-rows: minmax(0, 1fr);
  gap: $spacing-sm;
}
.qc-col { display: flex; flex-direction: column; gap: $spacing-sm; min-height: 0; }
/* 列内卡片高度交由 flex 分配，避免 height:100% 叠加导致溢出裁切 */
.qc-col > .screen-card { height: auto; min-height: 0; }
.qc-chart-full { flex: 1; min-height: 120px; width: 100%; }

/* 左列 */
.qc-pie { flex: 0.85; display: flex; flex-direction: column; min-height: 150px; }
.qc-risk { flex-shrink: 0; }
.qc-gauge { flex: 1.3; display: flex; flex-direction: column; min-height: 0; }
.qc-gauge__chart { flex: 1; min-height: 160px; }
.gauge-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: $spacing-xs; margin-top: $spacing-xs; }
.gauge-cell {
  text-align: center; padding: 6px;
  background: var(--bg-soft); border-radius: $radius-sm;
}
.gauge-cell__label { margin: 0; font-size: $font-xs; color: var(--text-sub); }
.gauge-cell__num { margin: 2px 0 0; font-size: $font-md; font-weight: 700; font-variant-numeric: tabular-nums; }

.risk-list { display: flex; flex-direction: column; gap: 6px; }
.risk-item {
  padding: 8px 10px;
  border-radius: $radius-sm;
  border-left: 3px solid;
  &--danger { background: var(--color-danger-bg); border-color: var(--color-danger); }
  &--warning { background: var(--color-warning-bg); border-color: var(--color-warning); }
}
.risk-item__top { display: flex; align-items: center; justify-content: space-between; }
.risk-item__name { font-size: $font-sm; font-weight: 600; color: var(--text-main); }
.risk-item__msg { margin: 4px 0 0; font-size: $font-xs; color: var(--text-sub); line-height: 1.5; }
.risk-empty { padding: 16px; text-align: center; color: var(--text-sub); font-size: $font-sm; }

/* 中列：周度离职率（折线）+ 各车间人力配置对比 */
.qc-trend { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.qc-bar { flex: 1.3; display: flex; flex-direction: column; min-height: 0; }
.qc-compare { display: flex; flex-direction: column; min-height: 0; }

/* 右列：预离职人员分布 + 当前vs预计缺口 + 风险预警 */
.qc-leave { flex: 1.1; display: flex; flex-direction: column; min-height: 0; }
.qc-leave__chart { flex: 1; min-height: 140px; }
.qc-col--right .qc-compare { flex: 1; }

.leave-legend { display: flex; flex-direction: column; gap: 4px; margin-top: $spacing-xs; }
.leave-legend__row { display: flex; align-items: center; justify-content: space-between; font-size: $font-xs; }
.leave-legend__name { display: inline-flex; align-items: center; gap: 6px; color: var(--text-sub); }
.leave-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.leave-legend__num { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--text-main); }

/* 页脚 */
.qc-footer {
  text-align: center;
  font-size: $font-xs;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* 明细弹窗：尽量大化展示原始表格内容，滚动交给 Dialog body 处理 */
.qc-detail { font-size: $font-sm; color: var(--text-main); }
.qc-detail--loading { padding: 48px 0; text-align: center; color: var(--text-sub); font-size: $font-sm; }

/* Excel 原表还原表格：主体只还原「文本 + 字体颜色」，表头/合计/边框使用主题样式，
   保证四套主题下均有良好表现 */
.qc-detail__table--excel {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  :deep(th), :deep(td) {
    padding: 8px 8px;
    border: 1px solid var(--border-color);
    line-height: 1.4;
    vertical-align: middle;
    word-break: break-word;
    /* Excel 换行符 / 表头两行文案正常折行展示 */
    white-space: pre-line;
  }
  /* 表头：主题化（不使用 Excel 蓝底白字） */
  :deep(th) {
    background: var(--bg-soft);
    color: var(--text-sub);
    font-weight: 600;
    font-size: $font-xs;
  }
  /* 单元格默认正文色（Excel 还原的字体颜色以行内样式覆盖） */
  :deep(td) { color: var(--text-main); }
  /* 合计行：主题化强调 */
  :deep(tr.is-total td) {
    background: var(--bg-soft);
    color: var(--text-main);
    font-weight: 600;
  }
}
.qc-detail__note { margin: $spacing-sm 0 0; font-size: $font-xs; color: var(--text-sub); line-height: 1.6; }

/* 文字颜色工具类 */
.text-primary { color: var(--color-primary) !important; }
.text-success { color: var(--color-success) !important; }
.text-warning { color: var(--color-warning) !important; }
.text-danger { color: var(--color-danger) !important; }
</style>
