<template>
  <ScreenContainer v-if="loading" class="question-screen">
    <div class="loading">数据加载中...</div>
  </ScreenContainer>

  <ScreenContainer v-else-if="error" class="question-screen">
    <div class="error-tip">数据加载失败：{{ error }}</div>
  </ScreenContainer>

  <ScreenContainer v-else class="question-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader :title="'四、重大质量异常闭环率'" :sub-title="`统计周期 ${periodRange} · 更新 ${updateTime}`">
      <template #right>
        <button class="header-btn primary" @click="detailVisible = true">📋 查看异常明细</button>
        <button class="header-btn" @click="toggleFullscreen">⛶ 全屏</button>
      </template>
    </ScreenHeader>

    <!-- KPI 卡片 -->
    <div class="kpi-row">
      <StatCard
        theme="kpi-top"
        status="success"
        title="连续按期闭环率"
        :sub-title="`${closeData.kpi.periodRange} 连续${closeData.kpi.consecutiveWeeks}周`"
        :value="closeData.kpi.consecutiveRate"
        unit="%"
      />
      <StatCard
        theme="kpi-top"
        status="primary"
        title="累计闭环重大异常"
        sub-title="到期关闭=实际关闭"
        :value="closeData.kpi.cumulativeClosed"
        unit="件"
      />
      <StatCard
        theme="kpi-top"
        status="warning"
        title="本周新增大异常"
        :sub-title="`CW${closeData.currentCw} 新增`"
        :value="closeData.kpi.weekNew"
        unit="件"
      />
      <StatCard
        theme="kpi-top"
        status="cyan"
        title="超期未闭环"
        sub-title="全部按期关闭"
        :value="closeData.kpi.overdue"
        unit="件"
      />
      <StatCard
        theme="kpi-top"
        status="purple"
        title="涉及范围"
        :sub-title="`${closeData.scope.workshopCount}车间·${closeData.scope.lineCount}线体`"
        :value="closeData.scope.text"
      />
    </div>

    <!-- 摘要条 -->
    <SummaryBar :content="summaryText" :tags="summaryTags" />

    <!-- 主体 2x2 布局 -->
    <div class="main-grid">
      <!-- 左上：累计闭环趋势 -->
      <ScreenCard title="累计闭环趋势" class="grid-card trend-card">
        <template #extra>
          <span class="extra-badge">连续{{ closeData.kpi.consecutiveWeeks }}周100%</span>
        </template>
        <div class="chart-box">
          <BaseChart :option="trendChartOption" />
        </div>
      </ScreenCard>

      <!-- 右上：异常类型分布 -->
      <ScreenCard title="异常类型分布" class="grid-card type-card">
        <template #extra>
          <span class="extra-badge" v-if="issueData.mainType">
            {{ issueData.mainType.name }}为主
          </span>
        </template>
        <div class="chart-box">
          <BaseChart :option="typePieOption" />
        </div>
      </ScreenCard>

      <!-- 左下：车间闭环达成 -->
      <ScreenCard title="车间闭环达成" class="grid-card ws-card">
        <template #extra>
          <span class="extra-badge success">全车间达标</span>
        </template>
        <div class="chart-box">
          <BaseChart :option="workshopBarOption" />
        </div>
      </ScreenCard>

      <!-- 右下：本周异常闭环进度 -->
      <ScreenCard title="本周异常闭环进度" class="grid-card progress-card">
        <div class="progress-card-body">
          <WeekProgressList
            :items="issueData.currentWeekItems"
            :total="issueData.currentWeekItems.length"
            :done="issueData.weekDone"
            @select="openIssueDetail"
          />
        </div>
      </ScreenCard>
    </div>

    <!-- 关键事实 -->
    <div class="facts-row">
      <ScreenCard title="关键事实" class="facts-card">
        <ul class="facts-list">
          <li v-for="(f, i) in facts" :key="i">
            <span class="dot" :style="{ background: f.color }"></span>
            <span v-html="f.text"></span>
          </li>
        </ul>
      </ScreenCard>
    </div>

    <!-- 明细台账弹窗 -->
    <QualityIssueDetail
      v-model="detailVisible"
      :items="issueData.items"
      :cw-list="issueData.cwList"
    />
  </ScreenContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ScreenContainer from '@/components/layout/ScreenContainer.vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import StatCard from '@/components/common/NewStatCard.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'
import WeekProgressList from '@/components/common/WeekProgressList.vue'
import QualityIssueDetail from '@/components/common/QualityIssueDetail.vue'
import { parseQualityCloseRate } from '@/utils/parseQualityCloseRate.js'
import { parseQualityIssues } from '@/utils/parseQualityIssue.js'
import { getCssVar } from '@/utils/color.js'

const loading = ref(true)
const error = ref('')
const closeData = ref(null)
const issueData = ref(null)
const detailVisible = ref(false)

onMounted(async () => {
  try {
    const [close, issues] = await Promise.all([
      parseQualityCloseRate(),
      parseQualityIssues(),
    ])
    closeData.value = close
    issueData.value = issues
  } catch (e) {
    console.error(e)
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
})

const periodRange = computed(() => {
  if (!closeData.value) return ''
  const { kpi, currentCw } = closeData.value
  return `${kpi.periodRange.replace('—', ' - ')}`
})
const updateTime = computed(() => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const summaryText = computed(() => {
  if (!closeData.value || !issueData.value) return ''
  const c = closeData.value
  const i = issueData.value
  const m6 = c.workshops.find((w) => w.key === 'M6')
  const m6Ratio = c.kpi.cumulativeClosed ? Math.round((m6.actual / c.kpi.cumulativeClosed) * 100) : 0
  const typeStr = i.mainType ? `${i.mainType.name}${i.mainType.value}件` : ''
  return `<b>连续${c.kpi.consecutiveWeeks}周实现100%按期闭环，累计关闭${c.kpi.cumulativeClosed}件零超期</b>；本周新增${c.kpi.weekNew}件全部按期完成，${m6 ? `${m6.name.replace('集成车间','')}车间占${m6.actual}件（${m6Ratio}%），` : ''}异常类型集中在${typeStr}；所有异常均制定永久对策，无流出风险。`
})

const summaryTags = computed(() => {
  const tags = [{ text: '100%按期闭环', type: 'success' }]
  if (closeData.value?.kpi.overdue === 0) tags.push({ text: '零超期', type: 'primary' })
  if (issueData.value?.facts.permanentRate === 100) tags.push({ text: '永久对策全覆盖', type: 'warning' })
  if (issueData.value?.facts.leakOutCount === 0) tags.push({ text: '零流出', type: 'info' })
  return tags
})

const facts = computed(() => {
  if (!closeData.value || !issueData.value) return []
  const c = closeData.value
  const i = issueData.value
  const m6 = c.workshops.find((w) => w.key === 'M6')
  const m6Ratio = c.kpi.cumulativeClosed ? Math.round((m6.actual / c.kpi.cumulativeClosed) * 100) : 0
  return [
    { color: '#52c41a', text: `<b>连续${c.kpi.consecutiveWeeks}周100%闭环</b>：${c.kpi.periodRange}到期${c.kpi.weekDue}件，实际关闭${c.kpi.cumulativeClosed}件，零超期` },
    { color: '#fa8c16', text: `<b>${m6 ? m6.key : 'M6'}为重点车间</b>：累计${m6 ? m6.actual : 0}件占${m6Ratio}%，本周${i.currentWeekItems.filter(x=>x.workshop==='M6').length}件占新增${c.kpi.weekNew ? Math.round(i.currentWeekItems.filter(x=>x.workshop==='M6').length/c.kpi.weekNew*100) : 0}%` },
    { color: '#1890ff', text: `<b>异常类型集中</b>：${i.typeDistArr.map(t=>`${t.name}${t.value}件`).join('、')}，均为人员操作类问题` },
    { color: '#52c41a', text: `<b>永久对策全覆盖</b>：所有异常均制定防错措施，含SOP更新、程序优化、标识区分` },
    { color: '#8c8c8c', text: `<b>零流出</b>：所有异常均在厂内检出，未发生客户端流出事故` },
  ]
})

// ========== 图表配置 ==========
const trendChartOption = computed(() => {
  if (!closeData.value) return {}
  const weeks = closeData.value.trendWeeks
  const colors = {
    due: '#94a3b8',
    actual: getCssVar('--color-success', '#52c41a'),
    rate: '#f5222d',
  }
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        const [due, actual, rate] = params
        return `${due.axisValue}<br/>
          <span style="color:${due.color}">●</span> 到期关闭数量：<b>${due.value}</b><br/>
          <span style="color:${actual.color}">●</span> 实际关闭数量：<b>${actual.value}</b><br/>
          <span style="color:${rate.color}">●</span> 按期闭环率：<b>${rate.value}%</b>`
      },
    },
    legend: {
      data: ['到期关闭数量', '实际关闭数量', '按期闭环率'],
      textStyle: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11 },
      top: 4, right: 8,
    },
    grid: { left: '3%', right: '8%', bottom: '8%', top: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.map((w) => w.label),
      axisLine: { lineStyle: { color: getCssVar('--color-border', '#eee') } },
      axisLabel: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '件',
        min: 180, max: 260,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11 },
        splitLine: { lineStyle: { color: getCssVar('--color-border-light', '#f0f0f0'), type: 'dashed' } },
      },
      {
        type: 'value',
        name: '%',
        min: 0, max: 105,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '到期关闭数量', type: 'bar', barWidth: 14,
        itemStyle: { color: colors.due, borderRadius: [3, 3, 0, 0] },
        data: weeks.map((w) => w.due),
      },
      {
        name: '实际关闭数量', type: 'bar', barWidth: 14,
        itemStyle: { color: colors.actual, borderRadius: [3, 3, 0, 0] },
        data: weeks.map((w) => w.actual),
      },
      {
        name: '按期闭环率', type: 'line', yAxisIndex: 1,
        smooth: false, symbol: 'circle', symbolSize: 7,
        lineStyle: { color: colors.rate, width: 2 },
        itemStyle: { color: colors.rate },
        label: { show: true, position: 'top', color: colors.rate, fontSize: 10, formatter: '{c}%' },
        data: weeks.map((w) => Math.round(w.rate)),
      },
    ],
  }
})

const typePieOption = computed(() => {
  if (!issueData.value) return {}
  const data = issueData.value.typeDistArr
  const colors = data.map((d) => d.color)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}件 ({d}%)' },
    legend: {
      orient: 'vertical', right: '5%', top: 'center',
      textStyle: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 12 },
      itemWidth: 12, itemHeight: 12,
    },
    color: colors,
    series: [{
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['35%', '55%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: getCssVar('--color-bg-card', '#fff'), borderWidth: 3 },
      label: {
        show: true, position: 'outer', fontSize: 11, color: getCssVar('--color-text-secondary', '#666'),
        formatter: '{b}\n{c}件',
      },
      labelLine: { length: 8, length2: 8 },
      emphasis: {
        scale: true, scaleSize: 6,
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
      },
      data,
    }],
    graphic: [{
      type: 'text', left: '32%', top: '48%',
      style: { text: `${issueData.value.currentWeekItems.length}`, fontSize: 26, fontWeight: 700, fill: getCssVar('--color-text-primary', '#333'), textAlign: 'center' },
    }, {
      type: 'text', left: '30%', top: '58%',
      style: { text: '本周异常', fontSize: 11, fill: getCssVar('--color-text-muted', '#999'), textAlign: 'center' },
    }],
  }
})

const workshopBarOption = computed(() => {
  if (!closeData.value) return {}
  const ws = [...closeData.value.workshops].reverse() // M6..A1
  const names = ws.map((w) => `${w.key}集成`)
  const dueData = ws.map((w) => w.due)
  const actualData = ws.map((w) => w.actual)
  return {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const [due, act] = params
        const w = ws[due.dataIndex]
        return `${names[due.dataIndex]}<br/>
          到期：<b>${due.value}</b>件<br/>
          实际：<b>${act.value}</b>件<br/>
          闭环率：<b>${w.rateText}</b>`
      },
    },
    legend: {
      data: ['到期关闭数量', '实际关闭数量'],
      textStyle: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11 },
      top: 4, right: 40,
    },
    grid: { left: '3%', right: '12%', bottom: '3%', top: '20%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11 },
      splitLine: { lineStyle: { color: getCssVar('--color-border-light', '#f0f0f0'), type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: getCssVar('--color-border', '#eee') } },
      axisTick: { show: false },
      axisLabel: { color: getCssVar('--color-text-secondary', '#999'), fontSize: 11 },
    },
    series: [
      {
        name: '到期关闭数量', type: 'bar', barWidth: 10, barGap: '-100%',
        itemStyle: { color: '#cbd5e1', borderRadius: [0, 5, 5, 0] },
        data: dueData,
        label: { show: false },
      },
      {
        name: '实际关闭数量', type: 'bar', barWidth: 10,
        itemStyle: {
          color: (p) => ws[p.dataIndex].color,
          borderRadius: [0, 5, 5, 0],
        },
        data: actualData.map((v, i) => ({
          value: v,
          label: {
            show: true, position: 'right',
            color: ws[i].color, fontSize: 11, fontWeight: 600,
            formatter: `${v}件 ${ws[i].rateText}`,
          },
        })),
      },
    ],
  }
})

function toggleFullscreen() {
  const el = document.documentElement
  if (!document.fullscreenElement) el.requestFullscreen?.()
  else document.exitFullscreen?.()
}

function openIssueDetail(it) {
  detailVisible.value = true
  // 明细弹窗会展示所有数据，需要在打开时定位；此处简单打开即可
  // 若需按周筛选，后续可加 prop
}
</script>

<style scoped lang="scss">
.question-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: $spacing-md;
  box-sizing: border-box;
  overflow: hidden;
}

.loading, .error-tip {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary);
  font-size: $font-md;
}

.header-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: $font-sm;
  margin-left: $spacing-sm;
  transition: all .2s;
  &:hover { background: var(--color-primary); color: #fff; }
  &.primary { background: var(--color-primary); color: #fff; }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: $spacing-md;
  margin: $spacing-md 0;
  flex-shrink: 0;
}

.main-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: $spacing-md;
  margin-top: $spacing-md;
  overflow: hidden;
}

.grid-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  :deep(.screen-card__body) {
    flex: 1;
    min-height: 0;
    padding: $spacing-sm;
    display: flex;
    flex-direction: column;
  }
}

.chart-box {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.extra-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: $font-xs;
  background: #fff7e6;
  color: #fa8c16;
  font-weight: 600;
  &.success { background: var(--color-success-light, #f6ffed); color: var(--color-success); }
}

.progress-card-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.facts-row {
  flex-shrink: 0;
  margin-top: $spacing-md;
  height: 130px;
}
.facts-card {
  height: 100%;
  :deep(.screen-card__body) { padding: $spacing-sm $spacing-md; }
}
.facts-list {
  margin: 0; padding: 0; list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-sm $spacing-lg;
  li {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: $font-sm; color: var(--color-text-secondary); line-height: 1.6;
    .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }
    b { color: var(--color-text-primary); }
  }
}
</style>
