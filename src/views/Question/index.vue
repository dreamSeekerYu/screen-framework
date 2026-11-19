<template>
  <div v-if="loading" class="question-screen question-loading">数据加载中...</div>
  <div v-else-if="error" class="question-screen question-err">数据加载失败：{{ error }}</div>

  <div v-else class="question-screen">
    <!-- 顶部标题 -->
    <div class="q-header">
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
    </div>

    <!-- KPI 行 -->
    <div class="q-kpi-row">
      <div class="q-kpi q-kpi-1">
        <div class="q-kpi-shine"></div>
        <div class="q-kpi-content">
          <div class="q-kpi-info">
            <div class="q-kpi-label">连续按期闭环率</div>
            <div class="q-kpi-sub">{{ closeData.kpi.periodRange.replace('—', '—') }} 连续{{ closeData.kpi.consecutiveWeeks
              }}周</div>
          </div>
          <div class="q-kpi-value-wrap">
            <span class="q-kpi-value" ref="kpiVals" :data-target="closeData.kpi.consecutiveRate">0</span><span
              class="q-kpi-unit">%</span>
          </div>
        </div>
      </div>
      <div class="q-kpi q-kpi-2">
        <div class="q-kpi-shine"></div>
        <div class="q-kpi-content">
          <div class="q-kpi-info">
            <div class="q-kpi-label">累计闭环重大异常</div>
            <div class="q-kpi-sub">到期关闭=实际关闭</div>
          </div>
          <div class="q-kpi-value-wrap">
            <span class="q-kpi-value" :data-target="closeData.kpi.cumulativeClosed">0</span><span
              class="q-kpi-unit">件</span>
          </div>
        </div>
      </div>
      <div class="q-kpi q-kpi-3">
        <div class="q-kpi-shine"></div>
        <div class="q-kpi-content">
          <div class="q-kpi-info">
            <div class="q-kpi-label">本周新增大异常</div>
            <div class="q-kpi-sub">CW{{ closeData.currentCw }} 新增</div>
          </div>
          <div class="q-kpi-value-wrap">
            <span class="q-kpi-value" :data-target="closeData.kpi.weekNew">0</span><span class="q-kpi-unit">件</span>
          </div>
        </div>
      </div>
      <div class="q-kpi q-kpi-4">
        <div class="q-kpi-shine"></div>
        <div class="q-kpi-content">
          <div class="q-kpi-info">
            <div class="q-kpi-label">超期未闭环</div>
            <div class="q-kpi-sub">{{ closeData.kpi.overdue === 0 ? '全部按期关闭' : `${closeData.kpi.overdue}件超期` }}</div>
          </div>
          <div class="q-kpi-value-wrap">
            <span class="q-kpi-value" :data-target="closeData.kpi.overdue">0</span><span class="q-kpi-unit">件</span>
          </div>
        </div>
      </div>
      <div class="q-kpi q-kpi-5">
        <div class="q-kpi-shine"></div>
        <div class="q-kpi-content">
          <div class="q-kpi-info">
            <div class="q-kpi-label">涉及范围</div>
            <div class="q-kpi-sub">{{ closeData.scope.workshopCount }} 车间 · {{ closeData.scope.lineCount }} 线体</div>
          </div>
          <div class="q-kpi-value-wrap">
            <span class="q-kpi-value q-kpi-value-text" :title="closeData.scope.text">{{ closeData.scope.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 摘要条 -->
    <div class="q-banner">
      <div class="q-banner-scan"></div>
      <div class="q-banner-icon">✓</div>
      <div class="q-banner-text" v-html="summaryText"></div>
      <div class="q-banner-tags">
        <span v-for="t in summaryTags" :key="t.text" class="q-banner-tag">{{ t.text }}</span>
      </div>
    </div>

    <!-- 主体网格：左大跨两行 + 右上+右下 -->
    <div class="q-main-grid">
      <!-- 累计闭环趋势（跨两行） -->
      <div class="q-panel q-panel-trend">
        <div class="q-panel-shine"></div>
        <div class="q-panel-header">
          <div>
            <div class="q-panel-title">累计闭环趋势</div>
            <div class="q-trend-legend">
              <div class="q-legend-item"><span class="q-ldot q-ldot-gray"></span>到期关闭数量</div>
              <div class="q-legend-item"><span class="q-ldot q-ldot-green"></span>实际关闭数量</div>
              <div class="q-legend-item"><span class="q-lline q-lline-red"></span>按期闭环率</div>
            </div>
          </div>
          <span class="q-badge q-badge-green">连续{{ closeData.kpi.consecutiveWeeks }}周100%</span>
        </div>
        <div class="q-chart">
          <BaseChart :option="trendChartOption" />
        </div>
      </div>

      <!-- 异常类型分布 -->
      <div class="q-panel">
        <div class="q-panel-shine"></div>
        <div class="q-panel-header">
          <div>
            <div class="q-panel-title">异常类型分布</div>
            <div class="q-panel-sub">本周{{ issueData.currentWeekItems.length }}件异常分类</div>
          </div>
          <span v-if="issueData.mainType" class="q-badge q-badge-orange">{{ issueData.mainType.name }}/焊接为主</span>
        </div>
        <div class="q-chart">
          <BaseChart :option="typePieOption" />
        </div>
      </div>

      <!-- 车间闭环达成 -->
      <div class="q-panel">
        <div class="q-panel-shine"></div>
        <div class="q-panel-header">
          <div>
            <div class="q-panel-title">车间闭环达成</div>
            <div class="q-panel-sub">到期/实际关闭数量对比</div>
          </div>
          <span class="q-badge q-badge-blue">全车间达标</span>
        </div>
        <div class="q-chart">
          <BaseChart :option="workshopBarOption" />
        </div>
      </div>

      <!-- 本周异常闭环进度 -->
      <div class="q-panel q-panel-progress" :class="{ 'q-panel-progress--hl': detailVisible }">
        <div class="q-panel-shine"></div>
        <div class="q-panel-header">
          <div>
            <div class="q-panel-title">本周异常闭环进度</div>
            <div class="q-panel-sub">{{ issueData.currentWeekItems.length }}件异常节点跟踪</div>
          </div>
          <span class="q-badge q-badge-cyan">{{ issueData.weekDone }}/{{ issueData.currentWeekItems.length }}已完成</span>
        </div>
        <WeekProgressList :items="issueData.currentWeekItems" :total="issueData.currentWeekItems.length"
          :done="issueData.weekDone" @select="openIssueDetail" />
      </div>

      <!-- 关键事实 -->
      <div class="q-panel q-panel-highlight">
        <div class="q-panel-shine"></div>
        <div class="q-panel-header">
          <div>
            <div class="q-panel-title">关键事实</div>
            <div class="q-panel-sub">闭环管理核心结论</div>
          </div>
        </div>
        <ul class="q-facts">
          <li v-for="(f, i) in facts" :key="i">
            <span class="q-fdot" :style="{ background: f.color, color: f.color }"></span>
            <span v-html="f.text"></span>
          </li>
        </ul>
      </div>
    </div>

    <!-- 明细台账弹窗 -->
    <QualityIssueDetail v-model="detailVisible" :items="issueData.items" :cw-list="issueData.cwList" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import BaseChart from '@/components/chart/BaseChart.vue'
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
const kpiVals = ref([])

onMounted(async () => {
  try {
    const [close, issues] = await Promise.all([
      parseQualityCloseRate(),
      parseQualityIssues(),
    ])
    closeData.value = close
    issueData.value = issues
    // 先结束 loading，让 v-else 的页面主体挂载出来，否则下面取不到 KPI 元素、数字动画不会执行
    loading.value = false
    await nextTick()
    animateKpis()
  } catch (e) {
    console.error(e)
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
})

function animateKpis() {
  const els = document.querySelectorAll('.question-screen .q-kpi-value[data-target]')
  els.forEach((el, i) => {
    const target = parseInt(el.dataset.target, 10) || 0
    setTimeout(() => {
      el.classList.add('loaded')
      const start = performance.now()
      const dur = 1200
      function tick(now) {
        const p = Math.min((now - start) / dur, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = Math.floor(target * eased)
        if (p < 1) requestAnimationFrame(tick)
        else el.textContent = target
      }
      requestAnimationFrame(tick)
    }, 400 + i * 80)
  })
  document.querySelectorAll('.question-screen .q-kpi-value-text').forEach((el) => {
    setTimeout(() => {
      el.classList.add('loaded')
      // 内容过长时自动缩小字号，避免把卡片撑高
      const wrap = el.closest('.q-kpi-value-wrap')
      if (wrap) {
        let fs = 28
        el.style.fontSize = fs + 'px'
        while (fs > 14 && el.scrollWidth > wrap.clientWidth - 4) {
          fs -= 1
          el.style.fontSize = fs + 'px'
        }
      }
    }, 500)
  })
  document.querySelectorAll('.question-screen .q-kpi-unit').forEach((el, i) => {
    setTimeout(() => el.classList.add('loaded'), 500 + i * 80)
  })
}

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
  const m6NewVal = m6 ? (m6.actual - ((c.workshops.find(w => w.key === 'A1').actual) + 0)) : 0
  return `<strong>连续${c.kpi.consecutiveWeeks}周实现100%按期闭环</strong>，累计关闭${c.kpi.cumulativeClosed}件零超期；本周新增${c.kpi.weekNew}件全部按期完成，${m6 ? `${m6.key}车间${m6New}件（${m6NewRatio}%），` : ''}异常类型集中在${typeStr}；所有异常均制定永久对策，无流出风险。`
})

const summaryTags = computed(() => {
  const tags = [{ text: '100%按期闭环' }]
  if (closeData.value?.kpi.overdue === 0) tags.push({ text: '零超期' })
  if (issueData.value?.facts.permanentRate === 100) tags.push({ text: '永久对策全覆盖' })
  if (issueData.value?.facts.leakOutCount === 0) tags.push({ text: '零流出' })
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
    { color: '#10b981', text: `<b>连续${c.kpi.consecutiveWeeks}周100%闭环：</b>${c.kpi.periodRange}到期${c.kpi.weekDue}件，实际关闭${c.kpi.cumulativeClosed}件，零超期` },
    { color: '#f59e0b', text: `<b>${m6 ? m6.key : 'M6'}为重点车间：</b>累计${m6 ? m6.actual : 0}件占${m6Ratio}%，本周${m6New}件占新增${m6NewRatio}%` },
    { color: '#3b82f6', text: `<b>异常类型集中：</b>${i.typeDistArr.map(t => `${t.name}${t.value}件`).join('、')}，均为人员操作类问题` },
    { color: '#14b8a6', text: `<b>永久对策全覆盖：</b>所有异常均制定防错措施，含SOP更新、程序优化、标识区分` },
    { color: '#94a3b8', text: `<b>零流出：</b>所有异常均在厂内检出，未发生客户端流出事故` },
  ]
})

// ========== 图表配置（对齐原型） ==========
const trendChartOption = computed(() => {
  if (!closeData.value) return {}
  const weeks = closeData.value.trendWeeks
  const COLOR = {
    gray: '#cbd5e1', grayDark: '#94a3b8',
    green: '#10b981', greenDark: '#059669', greenLight: '#34d399',
    red: '#ef4444', text: '#334155', textLight: '#64748b', axis: '#cbd5e1', split: '#e2e8f0',
  }
  return {
    animation: true,
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(30,120,208,0.15)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: COLOR.text, fontSize: 12 },
      axisPointer: { type: 'cross', crossStyle: { color: '#3b82f6', opacity: 0.3, type: 'dashed' }, lineStyle: { color: '#3b82f6', opacity: 0.3, type: 'dashed' } },
      extraCssText: 'box-shadow:0 8px 24px rgba(30,64,175,0.12);border-radius:10px;backdrop-filter:blur(8px);',
      formatter: (params) => {
        let html = `<div style="font-weight:700;margin-bottom:6px;color:#0f2b5d;font-size:13px">${params[0].axisValue}</div>`
        params.forEach((p) => {
          const unit = p.seriesName === '按期闭环率' ? '%' : '件'
          html += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">
            <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block"></span>
            <span style="color:#64748b">${p.seriesName}</span>
            <span style="margin-left:auto;font-weight:600;color:#0f2b5d">${p.value}${unit}</span>
          </div>`
        })
        return html
      },
    },
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
        areaStyle: { color: 'rgba(16,185,129,0.04)' },
        z: 1, tooltip: { show: false }, silent: true,
      },
      // 到期柱
      {
        name: '到期关闭数量', type: 'bar', barWidth: 16, barGap: '10%',
        data: weeks.map(w => w.due), z: 2,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: linearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#cbd5e1' }, { offset: 0.5, color: '#cbd5e1' }, { offset: 1, color: '#94a3b8' }
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
            { offset: 0, color: '#34d399' }, { offset: 0.4, color: '#10b981' }, { offset: 1, color: '#059669' }
          ]),
          shadowColor: 'rgba(16,185,129,0.25)', shadowBlur: 8, shadowOffsetY: 2,
        },
        label: { show: true, position: 'top', color: COLOR.greenDark, fontSize: 10, fontWeight: 700, formatter: p => p.value },
      },
      // 闭环率红线
      {
        name: '按期闭环率', type: 'line', yAxisIndex: 1, smooth: true,
        symbol: 'circle', symbolSize: 7,
        data: weeks.map(w => Math.round(w.rate)),
        lineStyle: { color: COLOR.red, width: 2.5, type: 'dashed' },
        itemStyle: { color: COLOR.red, borderWidth: 2, borderColor: '#fff', shadowColor: 'rgba(239,68,68,0.4)', shadowBlur: 6 },
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
  const colorMap = { '装配类': ['#fbbf24', '#f59e0b'], '焊接类': ['#38bdf8', '#0ea5e9'], '测试类': ['#a78bfa', '#8b5cf6'], '外观类': ['#f472b6', '#ec4899'], '其他': ['#94a3b8', '#64748b'] }
  const pieData = data.map(d => {
    const [c1, c2] = colorMap[d.name] || ['#60a5fa', '#3b82f6']
    return {
      value: d.value, name: d.name,
      itemStyle: {
        color: linearGradient(0, 0, 1, 1, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]),
        borderRadius: 6, borderColor: '#fff', borderWidth: 3,
        shadowColor: c2.replace(')', ',0.3)').replace('rgb', 'rgba'), shadowBlur: 8,
      },
    }
  })
  const total = issueData.value.currentWeekItems.length
  return {
    animation: true, animationDuration: 1000, animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(30,120,208,0.15)',
      textStyle: { color: '#334155', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 24px rgba(30,64,175,0.12);border-radius:10px;',
      formatter: '{b}<br/>{c}件 ({d}%)',
    },
    series: [
      {
        type: 'pie', radius: ['50%', '72%'], center: ['42%', '55%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true, position: 'outside',
          formatter: p => [`{name|${p.name}}{val|${p.value}件}`, `{pct|${p.percent}%}`].join('\n'),
          rich: {
            name: { fontSize: 12, color: '#1e3a68', fontWeight: 600, lineHeight: 16 },
            val: { fontSize: 11, color: '#64748b', lineHeight: 15 },
            pct: { fontSize: 11, color: '#0f2b5d', fontWeight: 700 },
          },
        },
        labelLine: { length: 10, length2: 14, lineStyle: { width: 1 } },
        data: pieData,
      },
      // 装饰外圈
      {
        type: 'pie', radius: ['73%', '75%'], center: ['42%', '55%'],
        silent: true, label: { show: false }, labelLine: { show: false },
        data: [{ value: 1, itemStyle: { color: 'rgba(30,120,208,0.06)', borderWidth: 0 } }],
        z: 0,
      },
    ],
    graphic: [
      { type: 'text', left: '36%', top: '46%', style: { text: String(total), fontSize: 28, fontWeight: 800, fill: '#0f2b5d', textAlign: 'center' } },
      { type: 'text', left: '34%', top: '58%', style: { text: '本周异常', fontSize: 10, fill: '#94a3b8', textAlign: 'center' } },
      { type: 'circle', shape: { cx: 0, cy: 0, r: 42 }, left: 'center', top: 'center', style: { fill: 'none', stroke: 'rgba(30,120,208,0.06)', lineWidth: 1 }, position: ['42%', '55%'] },
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
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(30,120,208,0.04)' } },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(30,120,208,0.15)',
      textStyle: { color: '#334155', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 24px rgba(30,64,175,0.12);border-radius:10px;',
      formatter: (params) => {
        const d = params[0]
        const w = ws[d.dataIndex]
        return `<div style="font-weight:600;color:#0f2b5d;margin-bottom:4px">${names[d.dataIndex]}</div>
          <div>关闭 <strong style="color:#059669">${w.actual}件</strong>，达成率 <strong style="color:#059669">${w.rateText}</strong></div>`
      },
    },
    grid: { top: 8, right: 80, bottom: 5, left: 58 },
    xAxis: { type: 'value', show: false, max: maxVal },
    yAxis: {
      type: 'category', data: names,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#334155', fontSize: 11, fontWeight: 500 },
    },
    series: [
      // 灰色背景轨
      { type: 'bar', data: ws.map(() => maxVal - 5), barWidth: 14, itemStyle: { color: '#e2e8f0', borderRadius: 8 }, silent: true, z: 1, barGap: '-100%' },
      // 光晕层
      { type: 'bar', data: ws.map(w => w.actual), barWidth: 14, itemStyle: { color: 'rgba(16,185,129,0.15)', borderRadius: 8 }, silent: true, z: 2, barGap: '-100%' },
      // 主条
      {
        type: 'bar', data: ws.map(w => w.actual), barWidth: 10, z: 3,
        itemStyle: {
          borderRadius: 6,
          color: linearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#059669' }, { offset: 0.6, color: '#10b981' }, { offset: 1, color: '#34d399' }
          ]),
          shadowColor: 'rgba(16,185,129,0.2)', shadowBlur: 6, shadowOffsetX: 2,
        },
        label: {
          show: true, position: 'right',
          formatter: (p) => `${ws[p.dataIndex].actual}件  ${ws[p.dataIndex].rateText}`,
          color: '#059669', fontSize: 10.5, fontWeight: 700, fontFamily: 'SF Mono, Consolas, monospace',
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
    radial-gradient(ellipse 80% 50% at 20% 10%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 80%, rgba(14, 165, 233, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 100% 60% at 50% 100%, rgba(56, 189, 248, 0.05) 0%, transparent 70%),
    linear-gradient(180deg, #ffffff 0%, #f0f7ff 25%, #e6f0fb 50%, #dceaf8 75%, #d4e5f5 100%);
  color: #1e3a68;

  // 网格纹
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(30, 120, 208, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30, 120, 208, 0.03) 1px, transparent 1px);
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
      radial-gradient(circle 300px at 0% 0%, rgba(59, 130, 246, 0.06) 0%, transparent 70%),
      radial-gradient(circle 250px at 100% 0%, rgba(14, 165, 233, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  >* {
    position: relative;
    z-index: 1;
  }
}

.question-loading,
.question-err {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #64748b;
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
  background: linear-gradient(180deg, #1e78d0 0%, #0ea5e9 50%, #38bdf8 100%);
  border-radius: 3px;
  box-shadow: 0 0 12px rgba(30, 120, 208, 0.4);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: -3px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 20px;
    background: rgba(30, 120, 208, 0.3);
    border-radius: 1px;
  }
}

.q-title-group h1.q-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #0c2d6b 0%, #1e40af 35%, #1d4ed8 65%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.q-title-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  letter-spacing: 0.5px;
}

.q-title-divider {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(30, 120, 208, 0.2) 20%, rgba(14, 165, 233, 0.15) 80%, transparent 100%);
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
  color: #94a3b8;
}

.q-cycle-value {
  font-size: 13px;
  color: #1e3a8a;
  font-weight: 600;
  margin-top: 1px;
}

.q-cycle-update {
  font-size: 10px;
  color: #94a3b8;
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
  background: linear-gradient(135deg, #1e78d0 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(30, 120, 208, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &:hover {
    box-shadow: 0 6px 20px rgba(30, 120, 208, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }
}

.q-btn-secondary {
  background: #fff;
  color: #475569;
  border: 1px solid rgba(30, 120, 208, 0.2);
  box-shadow: 0 2px 8px rgba(30, 64, 175, 0.06);

  &:hover {
    border-color: rgba(30, 120, 208, 0.4);
    box-shadow: 0 4px 12px rgba(30, 64, 175, 0.1);
    color: #1e40af;
  }
}

// ============ KPI 行 ============
.q-kpi-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

.q-kpi {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-radius: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(30, 120, 208, 0.12);
  box-shadow: 0 4px 16px rgba(30, 64, 175, 0.06), 0 1px 3px rgba(30, 64, 175, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: all .3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 88px;
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 12px 12px 0 0;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    opacity: 0.4;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(30, 64, 175, 0.1), 0 2px 6px rgba(30, 64, 175, 0.06);
  }

  // 五色顶条 + 微光
  &.q-kpi-1 {
    background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #f0fdf4 100%);
    border-color: rgba(16, 185, 129, 0.2);

    &::before {
      background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);
    }

    &::after {
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
    }

    .q-kpi-value,
    .q-kpi-unit {
      color: #059669;
      text-shadow: 0 2px 12px rgba(5, 150, 105, 0.2);
    }

    .q-kpi-value {
      font-size: 40px;
    }
  }

  &.q-kpi-2 {
    &::before {
      background: linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
    }

    &::after {
      background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    }

    .q-kpi-value,
    .q-kpi-unit {
      color: #1e40af;
      text-shadow: 0 2px 12px rgba(30, 64, 175, 0.2);
    }
  }

  &.q-kpi-3 {
    &::before {
      background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%);
    }

    &::after {
      background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%);
    }

    .q-kpi-value,
    .q-kpi-unit {
      color: #d97706;
      text-shadow: 0 2px 12px rgba(217, 119, 6, 0.2);
    }
  }

  &.q-kpi-4 {
    &::before {
      background: linear-gradient(90deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%);
    }

    &::after {
      background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
    }

    .q-kpi-value,
    .q-kpi-unit {
      color: #0891b2;
      text-shadow: 0 2px 12px rgba(8, 145, 178, 0.2);
    }
  }

  &.q-kpi-5 {
    &::before {
      background: linear-gradient(90deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%);
    }

    &::after {
      background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
    }

    .q-kpi-value,
    .q-kpi-unit {
      color: #7c3aed;
      text-shadow: 0 2px 12px rgba(124, 58, 237, 0.2);
    }
  }
}

.q-kpi-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
  height: 100%;
  min-width: 0;
}

.q-kpi-info {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.q-kpi-label {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-kpi-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.q-kpi-value-wrap {
  text-align: right;
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
  max-width: 45%;
}

.q-kpi-value {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  opacity: 0;
  transform: translateY(8px);
  transition: all .6s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &.loaded {
    opacity: 1;
    transform: translateY(0);
  }
}

.q-kpi-value-text {
  font-size: 28px !important;
  letter-spacing: 0;
  font-weight: 700;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  line-height: 1.1;
  // 文本过长时自动缩小字号
  &.loaded {
    animation: kpiTextFit .05s forwards;
  }
}

@keyframes kpiTextFit {
  from { letter-spacing: 0; }
  to   { letter-spacing: 0; }
}

.q-kpi-unit {
  font-size: 16px;
  font-weight: 600;
  margin-left: 2px;
  opacity: 0;
  transition: opacity .4s ease .3s;

  &.loaded {
    opacity: 1;
  }
}

// 扫光
.q-kpi-shine,
.q-panel-shine,
.q-banner-scan {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  pointer-events: none;
  z-index: 2;
}

.q-kpi-shine {
  animation: panelShine 8s ease-in-out infinite;
  animation-delay: 1s;
  width: 40%;
}

// ============ 摘要横幅 ============
.q-banner {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1e40af 0%, #1e78d0 40%, #0284c7 100%);
  border-radius: 12px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 6px 20px rgba(30, 64, 175, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.03) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 75%);
    background-size: 20px 20px;
    pointer-events: none;
  }
}

.q-banner-scan {
  left: -60%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  animation: bannerScan 4s ease-in-out infinite;
  z-index: 1;
}

@keyframes bannerScan {
  0% {
    left: -60%
  }

  50%,
  100% {
    left: 120%
  }
}

.q-banner-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 2;
}

.q-banner-text {
  flex: 1;
  font-size: 12px;
  color: #fff;
  line-height: 1.6;
  position: relative;
  z-index: 2;

  strong {
    color: #fef08a;
    font-weight: 700;
  }
}

.q-banner-tags {
  display: flex;
  gap: 8px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.q-banner-tag {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
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

.q-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
  border-radius: 12px;
  padding: 12px 16px 10px;
  border: 1px solid rgba(30, 120, 208, 0.1);
  box-shadow: 0 4px 16px rgba(30, 64, 175, 0.05), 0 1px 3px rgba(30, 64, 175, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.95);
  transition: all .3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  min-height: 0;

  &::after {
    content: '';
    position: absolute;
    top: -30px;
    right: -30px;
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, rgba(30, 120, 208, 0.04) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  &:hover {
    box-shadow: 0 8px 24px rgba(30, 64, 175, 0.08), 0 2px 6px rgba(30, 64, 175, 0.04);
  }
}

.q-panel-trend {
  grid-row: span 2;
}

.q-panel-highlight {
  border-color: rgba(16, 185, 129, 0.25);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #10b981, transparent);
    opacity: 0.5;
  }
}

.q-panel-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  pointer-events: none;
  z-index: 2;
  animation: panelShine 8s ease-in-out infinite;
}

.q-panel:nth-of-type(1) .q-panel-shine {
  animation-delay: 2s;
}

.q-panel:nth-of-type(2) .q-panel-shine {
  animation-delay: 3s;
}

.q-panel:nth-of-type(3) .q-panel-shine {
  animation-delay: 4s;
}

.q-panel:nth-of-type(4) .q-panel-shine {
  animation-delay: 5s;
}

.q-panel:nth-of-type(5) .q-panel-shine {
  animation-delay: 6s;
}

@keyframes panelShine {
  0% {
    left: -40%
  }

  20%,
  100% {
    left: 140%
  }
}

.q-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
  position: relative;
  z-index: 1;
}

.q-panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f2b5d;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding-left: 12px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: linear-gradient(180deg, #1e78d0, #0ea5e9);
    box-shadow: 0 0 6px rgba(30, 120, 208, 0.3);
  }
}

.q-panel-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  font-weight: 400;
  padding-left: 12px;
}

.q-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;

  &.q-badge-green {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  &.q-badge-orange {
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid rgba(249, 115, 22, 0.2);
  }

  &.q-badge-blue {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  &.q-badge-cyan {
    background: #ecfeff;
    color: #0e7490;
    border: 1px solid rgba(6, 182, 212, 0.2);
  }
}

.q-chart {
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 1;
}

// 趋势图图例
.q-trend-legend {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  padding-left: 12px;
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
    background: #94a3b8;
  }

  &.q-ldot-green {
    background: linear-gradient(180deg, #34d399, #059669);
    box-shadow: 0 1px 3px rgba(5, 150, 105, 0.3);
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
    background: #ef4444;

    &::after {
      background: #ef4444;
      box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
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

  li {
    display: flex;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: #475569;
  }

  b {
    color: #0f2b5d;
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
.q-panel-progress--hl {
  border-color: rgba(30, 120, 208, 0.35);
  box-shadow: 0 0 0 2px rgba(30, 120, 208, 0.1), 0 8px 24px rgba(30, 64, 175, 0.12);
}

// 入场动画
.q-kpi,
.q-banner,
.q-panel {
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.q-kpi:nth-child(1) {
  animation-delay: 0.05s;
}

.q-kpi:nth-child(2) {
  animation-delay: 0.1s;
}

.q-kpi:nth-child(3) {
  animation-delay: 0.15s;
}

.q-kpi:nth-child(4) {
  animation-delay: 0.2s;
}

.q-kpi:nth-child(5) {
  animation-delay: 0.25s;
}

.q-banner {
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
