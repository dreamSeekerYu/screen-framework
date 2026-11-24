<template>
  <div v-if="loading" class="question-screen question-loading">数据加载中...</div>
  <div v-else-if="error" class="question-screen question-err">数据加载失败：{{ error }}</div>

  <div v-else class="question-screen">
    <!-- 顶部标题 -->
    <!-- <div class="q-header">
      <div class="q-header-left">
        <div class="q-title-deco"></div>
        <div class="q-title-group">
          <h1 class="q-title">四、重大质量异常闭环率</h1>
          <div class="q-title-sub">大屏汇报改版 · 16:9 投屏 · 成果导向 · 闭环跟踪 · 根因管控</div>
        </div>
      </div>
      <div class="q-header-right">
        <div class="q-stat-cycle">
          <div class="q-cycle-label">统计周期</div>
          <div class="q-cycle-value">{{ periodRange }}</div>
          <div class="q-cycle-update">口径：重大质量异常台账 · 更新 {{ updateTime }}</div>
        </div>
        <div class="q-header-btns">
          <button class="q-btn q-btn-primary" @click="detailVisible = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12h6M9 16h6M9 8h6" />
            </svg>
            查看异常明细
          </button>
          <button class="q-btn q-btn-secondary" @click="toggleFullscreen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
            全屏
          </button>
        </div>
      </div>
      <div class="q-title-divider"></div>
    </div> -->
    <ScreenHeader title="重大质量异常闭环率">
      <template #right>
        <button class="detail-btn" @click="detailVisible = true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          查看异常明细
        </button>
      </template>
    </ScreenHeader>
    <!-- KPI 行：由 StatCardRow 统一做"内容自然宽度 + min/max 约束 + 剩余空间均分"的自适应布局 -->
    <StatCardRow class="q-kpi-row" :gap="16" :min-card-width="200" :max-card-width="460">
      <NewStatCard v-for="(k, i) in kpiCards" :key="k.title" class="q-kpi" theme="kpi-top" :status="k.status"
        :title="k.title" :sub-title="k.sub" :value="k.value" :unit="k.unit" :count-up="k.countUp" :fit-value="false"
        animated :animation-delay="i * 80" />
    </StatCardRow>

    <!-- 摘要横幅：复用 SummaryBar（图标 + 富文本 + StatusTag 标签组） -->
    <SummaryBar class="q-banner" type="primary" icon="check" :content="summaryText" :tags="summaryTags" />

    <!-- 主体网格：复用 ScreenCard -->
    <div class="q-main-grid">
      <!-- 累计闭环趋势（跨两行） -->
      <ScreenCard class="q-panel q-panel-trend" :show-corners="false">
        <template #title>
          <div class="q-panel-title">累计闭环趋势</div>
        </template>
        <template #subTitle>
          <div class="q-trend-legend">
            <div class="q-legend-item"><span class="q-ldot q-ldot-gray"></span>到期关闭数量</div>
            <div class="q-legend-item"><span class="q-ldot q-ldot-green"></span>实际关闭数量</div>
            <div class="q-legend-item"><span class="q-lline q-lline-red"></span>按期闭环率</div>
          </div>
        </template>
        <template #extra>
          <StatusTag type="success" effect="light" size="small" :text="`连续${closeData.kpi.consecutiveWeeks}周100%`" />
        </template>
        <div class="q-chart">
          <BaseChart :option="trendChartOption" />
        </div>
      </ScreenCard>

      <!-- 异常类型分布 -->
      <ScreenCard class="q-panel" :show-corners="false">
        <template #title>
          <div class="q-panel-title">异常类型分布</div>
        </template>
        <template #subTitle>
          <div class="q-panel-sub">本周{{ issueData.currentWeekItems.length }}件异常分类</div>
        </template>
        <template #extra>
          <StatusTag v-if="issueData.mainType" type="warning" effect="light" size="small"
            :text="`${issueData.mainType.name}/焊接为主`" />
        </template>
        <div class="q-chart">
          <BaseChart :option="typePieOption" />
        </div>
      </ScreenCard>

      <!-- 车间闭环达成 -->
      <ScreenCard class="q-panel" :show-corners="false">
        <template #title>
          <div class="q-panel-title">车间闭环达成</div>
        </template>
        <template #subTitle>
          <div class="q-panel-sub">到期/实际关闭数量对比</div>
        </template>
        <template #extra>
          <StatusTag type="info" effect="light" size="small" text="全车间达标" />
        </template>
        <div class="q-chart">
          <BaseChart :option="workshopBarOption" />
        </div>
      </ScreenCard>

      <!-- 本周异常闭环进度 -->
      <ScreenCard class="q-panel q-panel-progress" :class="{ 'q-panel-progress--hl': detailVisible }"
        :show-corners="false">
        <template #title>
          <div class="q-panel-title">本周异常闭环进度</div>
        </template>
        <template #subTitle>
          <div class="q-panel-sub">{{ issueData.currentWeekItems.length }}件异常节点跟踪</div>
        </template>
        <template #extra>
          <StatusTag type="info" effect="light" size="small"
            :text="`${issueData.weekDone}/${issueData.currentWeekItems.length}已完成`" />
        </template>
        <WeekProgressList :items="issueData.currentWeekItems" :total="issueData.currentWeekItems.length"
          :done="issueData.weekDone" @select="openIssueDetail" />
      </ScreenCard>

      <!-- 关键事实 -->
      <ScreenCard class="q-panel q-panel-highlight" :show-corners="false">
        <template #title>
          <div class="q-panel-title">关键事实</div>
        </template>
        <template #subTitle>
          <div class="q-panel-sub">闭环管理核心结论</div>
        </template>
        <ul class="q-facts">
          <li v-for="(f, i) in facts" :key="i">
            <span class="q-fdot" :style="{ background: f.color, color: f.color }"></span>
            <span v-html="f.text"></span>
          </li>
        </ul>
      </ScreenCard>
    </div>

    <!-- 明细台账弹窗 -->
    <QualityIssueDetail v-model="detailVisible" :items="issueData.items" :cw-list="issueData.cwList" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import WeekProgressList from '@/components/common/WeekProgressList.vue'
import QualityIssueDetail from '@/components/common/QualityIssueDetail.vue'
import { parseQualityCloseRate } from '@/utils/parseQualityCloseRate.js'
import { parseQualityIssues } from '@/utils/parseQualityIssue.js'
import { getCssVar } from '@/utils/color.js'
import { chartC, tooltipStyle } from '@/utils/chartTheme.js'

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

// KPI 卡片配置（复用 NewStatCard kpi-top 主题）
const kpiCards = computed(() => {
  if (!closeData.value) return []
  const c = closeData.value
  const k = c.kpi
  return [
    {
      status: 'success', title: '连续按期闭环率',
      sub: `${k.periodRange} 连续${k.consecutiveWeeks}周`,
      value: k.consecutiveRate, unit: '%', countUp: true,
    },
    {
      status: 'primary', title: '累计闭环重大异常',
      sub: '到期关闭=实际关闭',
      value: k.cumulativeClosed, unit: '件', countUp: true,
    },
    {
      status: 'warning', title: '本周新增大异常',
      sub: `CW${c.currentCw} 新增`,
      value: k.weekNew, unit: '件', countUp: true,
    },
    {
      status: 'cyan', title: '超期未闭环',
      sub: k.overdue === 0 ? '全部按期关闭' : `${k.overdue}件超期`,
      value: k.overdue, unit: '件', countUp: true,
    },
    {
      status: 'purple', title: '涉及范围',
      sub: `${c.scope.workshopCount} 车间 · ${c.scope.lineCount} 线体`,
      value: c.scope.text, countUp: false,
    },
  ]
})

const periodRange = computed(() => {
  if (!closeData.value) return ''
  return closeData.value.kpi.periodRange.replace('—', ' — ')
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
  const m6Ratio = c.kpi.cumulativeClosed && m6 ? Math.round((m6.actual / c.kpi.cumulativeClosed) * 100) : 0
  const m6New = i.currentWeekItems.filter(x => x.workshop === 'M6').length
  const m6NewRatio = c.kpi.weekNew ? Math.round(m6New / c.kpi.weekNew * 100) : 0
  const typeStr = i.mainType ? `${i.mainType.name}${i.mainType.value}件` : ''
  return `<strong>连续${c.kpi.consecutiveWeeks}周实现100%按期闭环</strong>，累计关闭${c.kpi.cumulativeClosed}件零超期；本周新增${c.kpi.weekNew}件全部按期完成，${m6 ? `${m6.key}车间${m6New}件（${m6NewRatio}%），` : ''}异常类型集中在${typeStr}；所有异常均制定永久对策，无流出风险。`
})

// 摘要标签（交给 SummaryBar 内的 StatusTag 渲染）
const summaryTags = computed(() => {
  const base = { type: 'info', effect: 'plain', size: 'small' }
  const tags = [{ ...base, text: '100%按期闭环' }]
  if (closeData.value?.kpi.overdue === 0) tags.push({ ...base, text: '零超期' })
  if (issueData.value?.facts.permanentRate === 100) tags.push({ ...base, text: '永久对策全覆盖' })
  if (issueData.value?.facts.leakOutCount === 0) tags.push({ ...base, text: '零流出' })
  return tags
})

const facts = computed(() => {
  if (!closeData.value || !issueData.value) return []
  const c = closeData.value
  const i = issueData.value
  const m6 = c.workshops.find((w) => w.key === 'M6')
  const m6Ratio = c.kpi.cumulativeClosed && m6 ? Math.round((m6.actual / c.kpi.cumulativeClosed) * 100) : 0
  const m6New = i.currentWeekItems.filter(x => x.workshop === 'M6').length
  const m6NewRatio = c.kpi.weekNew ? Math.round(m6New / c.kpi.weekNew * 100) : 0
  return [
    { color: 'var(--color-success)', text: `<b>连续${c.kpi.consecutiveWeeks}周100%闭环：</b>${c.kpi.periodRange}到期${c.kpi.weekDue}件，实际关闭${c.kpi.cumulativeClosed}件，零超期` },
    { color: 'var(--color-warning)', text: `<b>${m6 ? m6.key : 'M6'}为重点车间：</b>累计${m6 ? m6.actual : 0}件占${m6Ratio}%，本周${m6New}件占新增${m6NewRatio}%` },
    { color: 'var(--color-primary)', text: `<b>异常类型集中：</b>${i.typeDistArr.map(t => `${t.name}${t.value}件`).join('、')}，均为人员操作类问题` },
    { color: 'var(--color-accent)', text: `<b>永久对策全覆盖：</b>所有异常均制定防错措施，含SOP更新、程序优化、标识区分` },
    { color: 'var(--chart-text-muted)', text: `<b>零流出：</b>所有异常均在厂内检出，未发生客户端流出事故` },
  ]
})

// ========== 图表配置（对齐原型） ==========
const trendChartOption = computed(() => {
  if (!closeData.value) return {}
  const weeks = closeData.value.trendWeeks
  const COLOR = {
    gray: chartC.axisLine, grayDark: chartC.textMuted,
    green: chartC.success, greenDark: chartC.success, greenLight: 'color-mix(in srgb, var(--color-success) 55%, #ffffff)',
    red: chartC.danger, text: chartC.text, textLight: 'var(--color-text-secondary)', axis: chartC.axisLine, split: chartC.splitLine,
  }
  return {
    animation: true,
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    tooltip: tooltipStyle({
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: chartC.primary, opacity: 0.3, type: 'dashed' }, lineStyle: { color: chartC.primary, opacity: 0.3, type: 'dashed' } },
      formatter: (params) => {
        let html = `<div style="font-weight:700;margin-bottom:6px;color:var(--color-text-primary);font-size:13px">${params[0].axisValue}</div>`
        params.forEach((p) => {
          const unit = p.seriesName === '按期闭环率' ? '%' : '件'
          html += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">
            <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
            <span style="color:var(--color-text-secondary)">${p.seriesName}</span>
            <span style="margin-left:auto;font-weight:600;color:var(--color-text-primary)">${p.value}${unit}</span>
          </div>`
        })
        return html
      },
    }),
    grid: { top: 30, right: 55, bottom: 28, left: 45, containLabel: false },
    xAxis: {
      type: 'category', data: weeks.map(w => w.label),
      axisLine: { lineStyle: { color: COLOR.grayDark, width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: COLOR.textLight, fontSize: 11, fontWeight: 500 },
    },
    yAxis: [
      {
        type: 'value', name: '件', nameTextStyle: { color: COLOR.grayDark, fontSize: 10, padding: [0, 0, 0, -30] },
        min: 180, max: 260, interval: 20,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: COLOR.grayDark, fontSize: 10 },
        splitLine: { lineStyle: { color: COLOR.split, type: 'dashed', opacity: 0.6 } },
        splitArea: { show: false },
      },
      {
        type: 'value', name: '%', nameTextStyle: { color: COLOR.grayDark, fontSize: 10, padding: [0, -30, 0, 0] },
        min: 0, max: 105, interval: 25,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: COLOR.grayDark, fontSize: 10, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      // 100%淡色底
      {
        type: 'line', data: Array(weeks.length).fill(100), yAxisIndex: 1,
        lineStyle: { opacity: 0 }, symbol: 'none',
        areaStyle: { color: 'color-mix(in srgb, var(--color-success) 5%, transparent)' },
        z: 1, tooltip: { show: false }, silent: true,
      },
      // 到期柱
      {
        name: '到期关闭数量', type: 'bar', barWidth: 16, barGap: '10%',
        data: weeks.map(w => w.due), z: 2,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: linearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'var(--chart-axis-line)' }, { offset: 0.5, color: 'var(--chart-axis-line)' }, { offset: 1, color: 'var(--chart-text-muted)' }
          ]),
        },
      },
      // 实际柱
      {
        name: '实际关闭数量', type: 'bar', barWidth: 16,
        data: weeks.map(w => w.actual), z: 3,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: linearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'color-mix(in srgb, var(--color-success) 55%, #ffffff)' }, { offset: 0.4, color: 'var(--color-success)' }, { offset: 1, color: 'var(--color-success)' }
          ]),
          shadowColor: 'color-mix(in srgb, var(--color-success) 25%, transparent)', shadowBlur: 8, shadowOffsetY: 2,
        },
        label: { show: true, position: 'top', color: COLOR.greenDark, fontSize: 10, fontWeight: 700, formatter: p => p.value },
      },
      // 闭环率红线
      {
        name: '按期闭环率', type: 'line', yAxisIndex: 1, smooth: true,
        symbol: 'circle', symbolSize: 7,
        data: weeks.map(w => Math.round(w.rate)),
        lineStyle: { color: COLOR.red, width: 2.5, type: 'dashed' },
        itemStyle: { color: COLOR.red, borderWidth: 2, borderColor: 'var(--color-bg-card)', shadowColor: 'color-mix(in srgb, var(--color-danger) 40%, transparent)', shadowBlur: 6 },
        label: { show: true, position: 'top', color: COLOR.red, fontSize: 10, fontWeight: 700, formatter: '{c}%', offsetY: -4 },
        z: 5,
      },
    ],
  }
})

const typePieOption = computed(() => {
  if (!issueData.value) return {}
  const data = issueData.value.typeDistArr
  // 按类型固定颜色
  // 按类型固定颜色（全部语义变量，随主题联动；color-mix 由 resolveCssVars 统一求值）
  const colorMap = { '装配类': ['color-mix(in srgb, var(--color-warning) 45%, #ffffff)', 'var(--color-warning)'], '焊接类': ['color-mix(in srgb, var(--color-primary) 45%, #ffffff)', 'var(--color-primary)'], '测试类': ['color-mix(in srgb, var(--color-accent) 45%, #ffffff)', 'var(--color-accent)'], '外观类': ['color-mix(in srgb, var(--color-primary-light) 45%, #ffffff)', 'var(--color-primary-light)'], '其他': ['var(--chart-text-muted)', 'var(--color-text-secondary)'] }
  const pieData = data.map(d => {
    const [c1, c2] = colorMap[d.name] || ['var(--color-primary-light)', 'var(--color-primary)']
    return {
      value: d.value, name: d.name,
      itemStyle: {
        color: linearGradient(0, 0, 1, 1, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]),
        borderRadius: 6, borderColor: 'var(--color-bg-card)', borderWidth: 3,
        shadowColor: c2, shadowBlur: 8,
      },
    }
  })
  const total = issueData.value.currentWeekItems.length
  return {
    animation: true, animationDuration: 1000, animationEasing: 'cubicOut',
    tooltip: tooltipStyle({ trigger: 'item', formatter: '{b}<br/>{c}件 ({d}%)' }),
    series: [
      {
        type: 'pie', radius: ['50%', '72%'], center: ['42%', '55%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: 'var(--color-bg-card)', borderWidth: 3 },
        label: {
          show: true, position: 'outside',
          formatter: p => [`{name|${p.name}}{val|${p.value}件}`, `{pct|${p.percent}%}`].join('\n'),
          rich: {
            name: { fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 600, lineHeight: 16 },
            val: { fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 15 },
            pct: { fontSize: 11, color: 'var(--color-text-primary)', fontWeight: 700 },
          },
        },
        labelLine: { length: 10, length2: 14, lineStyle: { width: 1 } },
        data: pieData,
      },
      // 装饰外圈
      {
        type: 'pie', radius: ['73%', '75%'], center: ['42%', '55%'],
        silent: true, label: { show: false }, labelLine: { show: false },
        data: [{ value: 1, itemStyle: { color: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', borderWidth: 0 } }],
        z: 0,
      },
    ],
    graphic: [
      { type: 'text', left: '36%', top: '46%', style: { text: String(total), fontSize: 28, fontWeight: 800, fill: 'var(--color-text-primary)', textAlign: 'center' } },
      { type: 'text', left: '34%', top: '58%', style: { text: '本周异常', fontSize: 10, fill: 'var(--chart-text-muted)', textAlign: 'center' } },
      { type: 'circle', shape: { cx: 0, cy: 0, r: 42 }, left: 'center', top: 'center', style: { fill: 'none', stroke: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', lineWidth: 1 }, position: ['42%', '55%'] },
    ],
  }
})

const workshopBarOption = computed(() => {
  if (!closeData.value) return {}
  const ws = [...closeData.value.workshops].reverse() // M6..A1
  const names = ws.map(w => `${w.key}集成`)
  const maxVal = Math.max(...ws.map(w => w.due)) + 20
  return {
    animation: true, animationDuration: 1000, animationDelay: idx => idx * 80,
    tooltip: tooltipStyle({
      trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'color-mix(in srgb, var(--color-primary) 4%, transparent)' } },
      formatter: (params) => {
        const d = params[0]
        const w = ws[d.dataIndex]
        return `<div style="font-weight:600;color:var(--color-text-primary);margin-bottom:4px">${names[d.dataIndex]}</div>
          <div>关闭 <strong style="color:var(--color-success)">${w.actual}件</strong>，达成率 <strong style="color:var(--color-success)">${w.rateText}</strong></div>`
      },
    }),
    grid: { top: 8, right: 80, bottom: 5, left: 58 },
    xAxis: { type: 'value', show: false, max: maxVal },
    yAxis: {
      type: 'category', data: names,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: 'var(--chart-text)', fontSize: 11, fontWeight: 500 },
    },
    series: [
      // 灰色背景轨
      { type: 'bar', data: ws.map(() => maxVal - 5), barWidth: 14, itemStyle: { color: 'var(--chart-empty)', borderRadius: 8 }, silent: true, z: 1, barGap: '-100%' },
      // 光晕层
      { type: 'bar', data: ws.map(w => w.actual), barWidth: 14, itemStyle: { color: 'color-mix(in srgb, var(--color-success) 15%, transparent)', borderRadius: 8 }, silent: true, z: 2, barGap: '-100%' },
      // 主条
      {
        type: 'bar', data: ws.map(w => w.actual), barWidth: 10, z: 3,
        itemStyle: {
          borderRadius: 6,
          color: linearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'var(--color-success)' }, { offset: 0.6, color: 'var(--color-success)' }, { offset: 1, color: 'color-mix(in srgb, var(--color-success) 55%, #ffffff)' }
          ]),
          shadowColor: 'color-mix(in srgb, var(--color-success) 20%, transparent)', shadowBlur: 6, shadowOffsetX: 2,
        },
        label: {
          show: true, position: 'right',
          formatter: (p) => `${ws[p.dataIndex].actual}件  ${ws[p.dataIndex].rateText}`,
          color: 'var(--color-success)', fontSize: 10.5, fontWeight: 700, fontFamily: 'SF Mono, Consolas, monospace',
        },
      },
    ],
  }
})

// 通用线性渐变构造（避免依赖全局 echarts）
function linearGradient(x0, y0, x2, y2, stops) {
  // ECharts 支持 type/global/colorStops 对象形式
  return { type: 'linear', x: x0, y: y0, x2: x2, y2: y2, colorStops: stops, global: false }
}

function toggleFullscreen() {
  const el = document.documentElement
  if (!document.fullscreenElement) el.requestFullscreen?.()
  else document.exitFullscreen?.()
}

function openIssueDetail(it) {
  detailVisible.value = true
}
</script>

<style scoped lang="scss">
.question-screen {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 14px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  // 原型淡蓝多层渐变背景
  background:
    radial-gradient(ellipse 80% 50% at 20% 10%, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 80%, color-mix(in srgb, var(--color-accent) 6%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse 100% 60% at 50% 100%, color-mix(in srgb, var(--color-primary-light) 5%, transparent) 0%, transparent 70%),
    var(--bg-page-gradient);
  color: var(--color-text-primary);

  // 网格纹
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(color-mix(in srgb, var(--color-primary) 3%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 3%, transparent) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  // 角落光晕
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle 300px at 0% 0%, color-mix(in srgb, var(--color-primary) 6%, transparent) 0%, transparent 70%),
      radial-gradient(circle 250px at 100% 0%, color-mix(in srgb, var(--color-accent) 5%, transparent) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  >* {
    position: relative;
    z-index: 1;
  }
}
.detail-btn {
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

.question-loading,
.question-err {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

// ============ 顶部标题 ============
.q-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 8px;
  flex-shrink: 0;
}

.q-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.q-title-deco {
  width: 5px;
  height: 38px;
  background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-primary-light) 100%);
  border-radius: 3px;
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 40%, transparent);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: -3px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 20px;
    background: color-mix(in srgb, var(--color-primary) 30%, transparent);
    border-radius: 1px;
  }
}

.q-title-group h1.q-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-dark) 35%, var(--color-primary) 65%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.q-title-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
  letter-spacing: 0.5px;
}

.q-title-divider {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--color-primary) 20%, transparent) 20%, color-mix(in srgb, var(--color-accent) 15%, transparent) 80%, transparent 100%);
}

.q-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.q-stat-cycle {
  text-align: right;
}

.q-cycle-label {
  font-size: 11px;
  color: var(--chart-text-muted);
}

.q-cycle-value {
  font-size: 13px;
  color: var(--color-primary-dark);
  font-weight: 600;
  margin-top: 1px;
}

.q-cycle-update {
  font-size: 10px;
  color: var(--chart-text-muted);
  margin-top: 1px;
}

.q-header-btns {
  display: flex;
  gap: 8px;
}

.q-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all .25s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  position: relative;
  overflow: hidden;
  font-family: inherit;
}

.q-btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary) 100%);
  color: #fff;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--color-primary) 25%, transparent), inset 0 1px 0 color-mix(in srgb, #ffffff 20%, transparent);

  &:hover {
    box-shadow: 0 6px 20px color-mix(in srgb, var(--color-primary) 35%, transparent), inset 0 1px 0 color-mix(in srgb, #ffffff 25%, transparent);
    transform: translateY(-1px);
  }
}

.q-btn-secondary {
  background: #fff;
  color: var(--color-text-secondary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 6%, transparent);

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 10%, transparent);
    color: var(--color-primary-dark);
  }
}

// ============ KPI 行：布局（宽度自适应 / 均分 / 约束）由 StatCardRow 统一承担 ============
.q-kpi-row {
  flex-shrink: 0;
  height: 88px;
  margin-bottom: 4px;
}

.q-kpi-row .q-kpi {
  height: 100%;
  background: var(--color-bg-card);
  border-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-radius: 12px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--color-primary) 10%, transparent), 0 2px 6px color-mix(in srgb, var(--color-primary) 6%, transparent);
  }
}

// ============ 摘要横幅（复用 SummaryBar，仅压缩内边距与字号） ============
.question-screen>.q-banner {
  padding: 10px 20px;
  border-radius: 12px;

  :deep(.summary-bar__content) {
    font-size: 12px;
    line-height: 1.6;
  }

  :deep(.summary-bar__icon) {
    width: 26px;
    height: 26px;
    font-size: 14px;
  }
}

// ============ 主体网格 ============
.q-main-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.55fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
}

// 面板容器视觉沿用页面淡蓝风格，结构由 ScreenCard 提供
.q-main-grid .q-panel {
  padding: 12px 16px 10px;
  background: var(--color-bg-card);
  border-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 12px;
  box-shadow: var(--shadow-card);

  &:hover {
    box-shadow: var(--shadow-hover);
  }

  :deep(.screen-card__header) {
    margin-bottom: 6px;
  }
}

.q-panel-trend {
  grid-row: span 2;
}

.q-main-grid .q-panel-highlight {
  border-color: color-mix(in srgb, var(--color-success) 25%, transparent);
}

.q-panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.q-panel-sub {
  font-size: 11px;
  color: var(--chart-text-muted);
  font-weight: 400;
}

.q-chart {
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 1;
}

// 趋势图图例（放在卡片副标题位置）
.q-trend-legend {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.q-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.q-ldot {
  width: 12px;
  height: 8px;
  border-radius: 2px;

  &.q-ldot-gray {
    background: var(--chart-text-muted);
  }

  &.q-ldot-green {
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-success) 55%, #ffffff), var(--color-success));
    box-shadow: 0 1px 3px color-mix(in srgb, var(--color-success) 30%, transparent);
  }
}

.q-lline {
  width: 16px;
  height: 2px;
  border-radius: 1px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    right: -3px;
    top: -2px;
  }

  &.q-lline-red {
    background: var(--color-danger);

    &::after {
      background: var(--color-danger);
      box-shadow: 0 0 6px color-mix(in srgb, var(--color-danger) 50%, transparent);
    }
  }
}

// 关键事实列表
.q-facts {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
  overflow: hidden;

  li {
    display: flex;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }

  b {
    color: var(--color-text-primary);
    font-weight: 600;
  }
}

.q-fdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid currentColor;
    opacity: 0.3;
  }
}

// 进度面板高亮（点击查看明细时）
.q-main-grid .q-panel-progress--hl {
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 10%, transparent), 0 8px 24px color-mix(in srgb, var(--color-primary) 12%, transparent);
}

// 入场动画（作用于组件外层容器）
.q-kpi-row .q-kpi,
.question-screen>.q-banner,
.q-main-grid .q-panel {
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.q-kpi-row .q-kpi:nth-child(1) {
  animation-delay: 0.05s;
}

.q-kpi-row .q-kpi:nth-child(2) {
  animation-delay: 0.1s;
}

.q-kpi-row .q-kpi:nth-child(3) {
  animation-delay: 0.15s;
}

.q-kpi-row .q-kpi:nth-child(4) {
  animation-delay: 0.2s;
}

.q-kpi-row .q-kpi:nth-child(5) {
  animation-delay: 0.25s;
}

.question-screen>.q-banner {
  animation-delay: 0.3s;
}

.q-main-grid .q-panel:nth-child(1) {
  animation-delay: 0.35s;
}

.q-main-grid .q-panel:nth-child(2) {
  animation-delay: 0.4s;
}

.q-main-grid .q-panel:nth-child(3) {
  animation-delay: 0.45s;
}

.q-main-grid .q-panel:nth-child(4) {
  animation-delay: 0.5s;
}

.q-main-grid .q-panel:nth-child(5) {
  animation-delay: 0.55s;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
