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
      <StatCardRow :gap="12" :min-card-width="220" :max-card-width="420">
        <NewStatCard v-for="(c, i) in kpiCards" :key="i"
                     :theme="c.theme" :title="c.title" :value="c.value" :unit="c.unit"
                     :explain="c.explain" :trend="c.trend" :trend-type="c.trendType">
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

        <!-- 中列：各车间人力配置对比（大）+ 下方两小图 -->
        <div class="qc-col qc-col--mid">
          <ScreenCard title="各车间人力配置对比" class="qc-bar">
            <BaseChart :option="barOpt" class="qc-chart-full" />
          </ScreenCard>
          <div class="qc-mid-bottom">
            <ScreenCard title="人力分布结构" class="qc-pie">
              <BaseChart :option="pieOpt" class="qc-chart-full" />
            </ScreenCard>
            <ScreenCard title="当前vs预计缺口" class="qc-compare">
              <BaseChart :option="compareOpt" class="qc-chart-full" />
            </ScreenCard>
          </div>
        </div>

        <!-- 右列：支援人员来源 + 预离职人员分布 -->
        <div class="qc-col qc-col--right">
          <ScreenCard title="支援人员来源" class="qc-support">
            <div class="support-list">
              <div v-for="s in qc.supportSources" :key="s.name" class="support-item">
                <div class="support-item__top">
                  <span class="support-item__name">{{ s.name }}</span>
                  <span class="support-item__num">{{ s.count }}人</span>
                </div>
                <div class="support-bar">
                  <div class="support-bar__fill"
                       :style="{ width: (qc.maxSupport ? s.count / qc.maxSupport * 100 : 0) + '%' }"></div>
                </div>
                <p class="support-item__desc">{{ s.desc }}</p>
              </div>
              <div class="support-item support-item--ext" v-if="qc.externalWait > 0">
                <div class="support-item__top">
                  <span class="support-item__name">待外部支援</span>
                  <span class="support-item__num text-warning">{{ qc.externalWait }}人</span>
                </div>
                <p class="support-item__desc">A2车间缺口最大，优先补充</p>
              </div>
            </div>
          </ScreenCard>

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
        </div>
      </div>

      <!-- 页脚提示 -->
      <div class="qc-footer">
        制程质量部门 · 数据更新时间：{{ qc.updatedAt || '2026年11月21日' }}
      </div>
    </div>

    <!-- 查看明细弹窗（复用项目 Dialog 组件） -->
    <Dialog v-model="detailVisible" title="各车间人力明细" width="960px">
      <div class="qc-detail">
        <table class="qc-detail__table">
          <thead>
            <tr>
              <th>车间名称</th>
              <th>配置架构</th>
              <th>在职架构</th>
              <th>实际人力</th>
              <th>内部支援</th>
              <th>当前缺口</th>
              <th>预离职</th>
              <th>预计缺口</th>
              <th>状态</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in qc.shops" :key="s.name">
              <td class="qc-detail__name">{{ s.name }}车间</td>
              <td class="ar">{{ s.config }}</td>
              <td class="ar">{{ s.onjob }}</td>
              <td class="ar">{{ s.actual }}</td>
              <td class="ar text-success">{{ s.supportIn + s.otherSupport }}</td>
              <td class="ar" :class="s.gapNow < 0 ? 'text-danger' : 'text-success'">{{ formatGap(s.gapNow) }}</td>
              <td class="ar" :class="s.preLeave > 0 ? 'text-warning' : ''">{{ s.preLeave }}</td>
              <td class="ar" :class="s.gapExpect < 0 ? 'text-danger' : 'text-success'">{{ formatGap(s.gapExpect) }}</td>
              <td class="ac">
                <StatusTag :text="shopStatusTag(s).text" :type="shopStatusTag(s).type" effect="light" size="small" round />
              </td>
              <td class="qc-detail__remark">{{ s.remark || remarkByGap(s) }}</td>
            </tr>
            <tr class="qc-detail__total">
              <td>合计</td>
              <td class="ar">{{ qc.total?.config }}</td>
              <td class="ar">{{ qc.total?.onjob }}</td>
              <td class="ar">{{ qc.total?.actual }}</td>
              <td class="ar">{{ qc.kpi?.totalSupport }}</td>
              <td class="ar text-warning">{{ formatGap(qc.total?.gapNow) }}</td>
              <td class="ar text-danger">{{ qc.total?.preLeave }}</td>
              <td class="ar text-danger">{{ formatGap(qc.total?.gapExpect) }}</td>
              <td class="ac"><StatusTag text="总缺口" type="danger" effect="light" size="small" round /></td>
              <td>整体充足率{{ qc.kpi?.fillRate }}%</td>
            </tr>
          </tbody>
        </table>
        <p class="qc-detail__note">
          备注：当前缺口=实际人力−配置架构，负值表示缺人；预计缺口=当前缺口−预离职人数；内部支援来自 A1/A2 工厂跨车间支援；待外部支援 {{ qc.externalWait }} 人优先补充 A2 车间。
        </p>
      </div>
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
import { parseQcData } from '@/utils/parseQc'

// ============ 数据状态 ============
const qc = reactive({})
const detailVisible = ref(false)
const leaveColors = { A1: 'var(--color-primary)', A2: 'var(--color-danger)', A3: 'var(--color-success)', M5: 'var(--color-warning)', M6: 'var(--color-accent)' }

// ============ 辅助函数 ============
const formatGap = (v) => {
  if (v === null || v === undefined) return '-'
  return v >= 0 ? `+${v}` : `${v}`
}
const shopStatusTag = (s) => {
  if (s.gapExpect <= -20) return { type: 'danger', text: '严重缺口' }
  if (s.gapExpect < 0) return { type: 'danger', text: '缺口' }
  if (s.preLeave > 0) return { type: 'warning', text: '预警' }
  return { type: 'success', text: '充足' }
}
const remarkByGap = (s) => {
  if (s.gapExpect <= -20) return `严重缺口，需外部支援${s.outSupport}人`
  if (s.gapExpect < 0) return `充足率${Math.round((s.actual / s.config) * 100)}%，需补充`
  if (s.preLeave > 0) return `预离职${s.preLeave}人，需提前储备`
  return '人员充足'
}

// ============ 计算属性：KPI 卡片 ============
const kpiCards = computed(() => {
  const k = qc.kpi
  if (!k) return []
  return [
    {
      theme: 'kpi-side', title: '总配置人力', value: k.totalConfig, unit: '人',
      explain: `在职${k.onjob}人`,
      extra: `架构配置完成率 ${k.configRate.toFixed(1)}%`,
    },
    {
      theme: 'kpi-side', title: '当前实际人力', value: k.actual, unit: '人',
      explain: '含内部/其他工厂支援',
      extra: `实际配置率 ${k.onjobFillRate.toFixed(1)}%`,
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
      },
      data: [{ value: fill }],
    }],
  }
})

const barOpt = computed(() => {
  const shops = qc.shops || []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, right: 10, textStyle: { color: 'var(--text-sub)', fontSize: 11 },
              itemWidth: 12, itemHeight: 8 },
    grid: { left: 40, right: 20, top: 36, bottom: 24, containLabel: false },
    xAxis: {
      type: 'category', data: shops.map(s => s.name + '车间'),
      axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisTick: { show: false },
      axisLabel: { color: 'var(--text-sub)', fontSize: 11 },
    },
    yAxis: {
      type: 'value', axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } },
      axisLabel: { color: 'var(--text-sub)', fontSize: 11 },
    },
    series: [
      { name: '配置架构', type: 'bar', barWidth: 10,
        itemStyle: { color: 'var(--color-primary)', borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => s.config) },
      { name: '在职架构', type: 'bar', barWidth: 10,
        itemStyle: { color: 'var(--color-secondary)', borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => s.onjob) },
      { name: '实际人力', type: 'bar', barWidth: 10,
        itemStyle: { color: 'var(--color-success)', borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => s.actual) },
      { name: '预计缺口', type: 'bar', barWidth: 10,
        itemStyle: { color: 'var(--color-warning)', borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => Math.max(0, -s.gapExpect)) },
    ],
  }
})

const pieOpt = computed(() => {
  const shops = qc.shops || []
  const palette = ['var(--color-primary)', 'var(--color-danger)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-accent)']
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: 'var(--text-sub)', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['40%', '65%'], center: ['50%', '42%'],
      avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
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
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, right: 10, textStyle: { color: 'var(--text-sub)', fontSize: 11 },
              itemWidth: 12, itemHeight: 8 },
    grid: { left: 40, right: 20, top: 36, bottom: 24 },
    xAxis: {
      type: 'category', data: shops.map(s => s.name),
      axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisTick: { show: false },
      axisLabel: { color: 'var(--text-sub)', fontSize: 11 },
    },
    yAxis: {
      type: 'value', axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } },
      axisLabel: { color: 'var(--text-sub)', fontSize: 11, formatter: v => (v >= 0 ? v : -v) },
    },
    series: [
      { name: '当前缺口', type: 'bar', barWidth: 12,
        itemStyle: { color: 'var(--color-warning)', borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => Math.max(0, -s.gapNow)) },
      { name: '预计缺口', type: 'bar', barWidth: 12,
        itemStyle: { color: 'var(--color-danger)', borderRadius: [3, 3, 0, 0] },
        data: shops.map(s => Math.max(0, -s.gapExpect)) },
    ],
  }
})

const leaveOpt = computed(() => {
  const dist = qc.leaveDist || []
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    series: [{
      type: 'pie', radius: ['50%', '70%'], center: ['50%', '45%'],
      label: { show: false }, labelLine: { show: false },
      data: dist.map(d => ({
        name: d.name + '车间', value: d.value,
        itemStyle: { color: leaveColors[d.name] || 'var(--chart-text-muted)' },
      })),
    }],
  }
})

// ============ 生命周期 ============
onMounted(async () => {
  try {
    const data = await parseQcData()
    Object.assign(qc, data)
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
.qc-risk { flex-shrink: 0; }
.qc-gauge { flex: 1; display: flex; flex-direction: column; min-height: 0; }
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

/* 中列 */
.qc-bar { flex: 1.4; display: flex; flex-direction: column; min-height: 0; }
.qc-mid-bottom { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: $spacing-sm; min-height: 0; }
.qc-pie, .qc-compare { display: flex; flex-direction: column; min-height: 0; }

/* 右列 */
.qc-leave { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.qc-leave__chart { flex: 1; min-height: 140px; }

.support-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.support-item__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.support-item__name { font-size: $font-xs; font-weight: 500; color: var(--text-main); }
.support-item__num { font-size: $font-xs; font-weight: 700; color: var(--color-primary); font-variant-numeric: tabular-nums; }
.support-bar { height: 6px; background: var(--bg-soft); border-radius: 3px; overflow: hidden; }
.support-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 3px;
  transition: width 1s ease;
}
.support-item__desc { margin: 2px 0 0; font-size: $font-xs; color: var(--text-sub); }
.support-item--ext { padding-top: $spacing-xs; border-top: 1px solid var(--border-color); }

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

/* 明细弹窗 */
.qc-detail { font-size: $font-sm; color: var(--text-main); max-height: 60vh; overflow: auto; }
.qc-detail__table {
  width: 100%;
  border-collapse: collapse;
  :deep(th), :deep(td) {
    padding: 10px 8px;
    border-bottom: 1px solid var(--border-color);
    font-size: $font-xs;
    text-align: left;
  }
  :deep(th) { background: var(--bg-soft); color: var(--text-sub); font-weight: 600; }
  .ar { text-align: right !important; font-variant-numeric: tabular-nums; }
  .ac { text-align: center !important; }
}
.qc-detail__name { font-weight: 600; }
.qc-detail__remark { color: var(--text-sub); font-size: $font-xs; }
.qc-detail__total { background: var(--bg-soft); font-weight: 600; }
.qc-detail__note { margin: $spacing-sm 0 0; font-size: $font-xs; color: var(--text-sub); line-height: 1.6; }

/* 文字颜色工具类 */
.text-primary { color: var(--color-primary) !important; }
.text-success { color: var(--color-success) !important; }
.text-warning { color: var(--color-warning) !important; }
.text-danger { color: var(--color-danger) !important; }
</style>
