<template>
  <div class="cpk-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader title="过程能力达标率" subtitle="过程能力指数（CPK）≥1.33 项目达标率统计" />

    <!-- KPI 卡片区：4 张等宽 -->
    <StatCardRow style="margin-bottom: 16px;" :gap="16" :min-card-width="200" :max-card-width="520">
      <NewStatCard
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

    <!-- 结论条 -->
    <SummaryBar
      :type="summary.type"
      :icon="summary.icon"
      :content="summary.text"
      style="margin-bottom: 16px; flex-shrink: 0;"
    >
      <template #tags>
        <StatusTag v-for="(tag, i) in summary.tags" :key="i" :text="tag.text" :type="tag.type" effect="plain" round />
      </template>
    </SummaryBar>

    <!-- 双图区域：5:5 对称 -->
    <div class="chart-row">
      <ScreenCard title="集成CPK达标趋势">
        <BaseChart :option="trendOption" class="cpk-chart" />
      </ScreenCard>
      <ScreenCard title="各车间·工序CPK项目达成">
        <BaseChart :option="processBarOption" class="cpk-chart" />
      </ScreenCard>
    </div>

    <!-- 工序统计 -->
    <!-- <div class="action-row">
      <span class="action-hint">共 {{ processList.length }} 条工序记录 · 达标 {{ passCount }} 条 · 未达标 {{ failCount }} 条 · 未开线 {{ noDataCount }} 条</span>
    </div> -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { loadSheet, loadData } from '@/utils/dataLoader.js'
import { chartC, axisStyle, valueAxisStyle, tooltipStyle, legendStyle, gridStyle, barGradient, areaGradient } from '@/utils/chartTheme.js'

// ============ 数据 ============
const processList = ref([]) // 工序列表（来自 过程能力达标率.json）
const trend = ref({ weeks: [], rates: [], total: [], pass: [] }) // 周度达标趋势（来自 data.json 合计行）

// 解析 process 行
function normalizeRows(rows) {
  // 补全合并单元格：车间列向下填充
  let lastWorkshop = ''
  return rows
    .filter(r => r['车间'] || r['工序']) // 去除空行
    .map(r => {
      const ws = r['车间'] || lastWorkshop
      if (r['车间']) lastWorkshop = r['车间']
      const totalRaw = r['CPK项目总数']
      const passRaw = r['合格数']
      const rateRaw = r['达成率']
      const remark = (r['备注'] && r['备注'] !== '/') ? String(r['备注']).trim() : '/'
      const hasData = typeof totalRaw === 'number' && typeof passRaw === 'number'
      const total = hasData ? totalRaw : '-'
      const pass = hasData ? passRaw : '-'
      const rate = hasData ? Number(rateRaw) * 100 : null
      let status = '无数据'
      if (hasData) {
        status = (rate >= 100) ? '达标' : '未达标'
      } else if (remark && remark.includes('未开线')) {
        status = '无数据'
      }
      return {
        workshop: ws,
        process: r['工序'],
        total, pass, rate,
        status,
        remark,
      }
    })
}

// 解析「一、过程能力趋势」合计行，按周维度取数
function parseTrend(sheet) {
  const cells = sheet.cells || {}
  const cnum = L => { let n = 0; for (const ch of L) n = n * 26 + (ch.charCodeAt(0) - 64); return n }
  const caddr = (col, row) => {
    let s = ''
    while (col > 0) { const m = (col - 1) % 26; s = String.fromCharCode(65 + m) + s; col = Math.floor((col - 1) / 26) }
    return s + row
  }
  const val = (addr) => {
    const c = cells[addr]
    if (!c) return null
    return c.value == null ? null : c.value
  }
  // 定位块头：找到「一、过程能力趋势」和「二、防错管理」
  let blockStart = 0, blockEnd = 0
  for (const addr in cells) {
    const m = /^([A-Z]+)(\d+)$/.exec(addr)
    if (!m) continue
    const r = +m[2], col = cnum(m[1])
    if (col !== 1) continue
    const v = cells[addr] && cells[addr].value
    if (v === '一、过程能力趋势（每月统计一次)' || v === '一、过程能力趋势（每月统计一次）') blockStart = r
    if (v === '二、防错管理') blockEnd = r
  }
  if (!blockStart) return { weeks: [], rates: [], total: [], pass: [] }
  // header 在标题下一行；合计区位于「合计」所在行，共4行：总数/合格数/合格率/目标值（B 列为 '/'，A 列为「合计」）
  const headerRow = blockStart + 1
  let totalRow = 0, passRow = 0, rateRow = 0
  for (let r = blockStart + 2; r < (blockEnd || 999); r++) {
    const name = val(`C${r}`)
    const aCol = val(`A${r}`)
    if (aCol === '合计' && name === '总数' && !totalRow) totalRow = r
    if (aCol === '合计' && name === '合格数' && !passRow) passRow = r
    if (aCol === '合计' && name === '合格率' && !rateRow) rateRow = r
  }
  // 从 D 列起扫描 CW 周列，收集"有数据"的周（总数/合格数/合格率三个都有数且不是 #DIV/0! 或 0 空值）
  const weeks = []
  for (let c = 4; c <= 60; c++) {
    const wk = val(caddr(c, headerRow))
    if (!wk || typeof wk !== 'string' || !/^CW\d+$/.test(wk.trim())) continue
    const t = val(caddr(c, totalRow))
    const p = val(caddr(c, passRow))
    const rt = val(caddr(c, rateRow))
    // 没有实际数据：总数=0 或 合格率为 #DIV/0! / null / 字符串异常
    const hasData = typeof t === 'number' && t > 0 && typeof p === 'number' && typeof rt === 'number'
    weeks.push({ week: wk.trim(), total: hasData ? t : null, pass: hasData ? p : null, rate: hasData ? Number(rt) * 100 : null })
  }
  // 裁剪：去除开头无数据段（项目尚未启动），并去除末尾全空的未来周
  let firstIdx = weeks.findIndex(w => w.total !== null)
  let lastIdx = weeks.length - 1
  while (lastIdx >= 0 && weeks[lastIdx].total === null) lastIdx--
  if (firstIdx < 0) firstIdx = 0
  if (lastIdx < firstIdx) lastIdx = weeks.length - 1
  const valid = weeks.slice(firstIdx, lastIdx + 1)
  // 只取最近 12 周（周度粒度更合理）
  const recent = valid.slice(-12)
  return {
    weeks: recent.map(w => w.week.replace(/^CW/, 'WK')),
    total: recent.map(w => w.total),
    pass: recent.map(w => w.pass),
    rates: recent.map(w => w.rate == null ? null : +w.rate.toFixed(2)),
  }
}

onMounted(async () => {
  try {
    const sheet = await loadSheet('cpk', 0)
    const rows = sheet.rows || []
    processList.value = normalizeRows(rows)
  } catch (e) {
    console.error('[Cpk] 加载过程能力达标率数据失败：', e)
  }
  try {
    const main = await loadData('main')
    const trendSheet = main.sheets && main.sheets[0]
    if (trendSheet) trend.value = parseTrend(trendSheet)
  } catch (e) {
    console.error('[Cpk] 加载过程能力趋势数据失败：', e)
  }
})

// ============ 汇总统计 ============
const validList = computed(() => processList.value.filter(r => r.status !== '无数据'))
const totalProjects = computed(() => validList.value.reduce((s, r) => s + r.total, 0))
const passProjects = computed(() => validList.value.reduce((s, r) => s + r.pass, 0))
const failProjects = computed(() => totalProjects.value - passProjects.value)
const overallRate = computed(() => totalProjects.value ? (passProjects.value / totalProjects.value * 100) : 0)
const passCount = computed(() => processList.value.filter(r => r.status === '达标').length)
const failCount = computed(() => processList.value.filter(r => r.status === '未达标').length)
const noDataCount = computed(() => processList.value.filter(r => r.status === '无数据').length)

// 未达标工序
const failProcesses = computed(() => processList.value.filter(r => r.status === '未达标'))

// 车间维度汇总（给左图用）
const workshopStats = computed(() => {
  const map = {}
  for (const r of validList.value) {
    if (!map[r.workshop]) map[r.workshop] = { workshop: r.workshop, total: 0, pass: 0 }
    map[r.workshop].total += r.total
    map[r.workshop].pass += r.pass
  }
  return Object.values(map).map(w => ({
    ...w,
    fail: w.total - w.pass,
    rate: w.total ? (w.pass / w.total * 100) : 0,
  }))
})

// ============ KPI 卡片 ============
const kpiCards = computed(() => {
  const failList = failProcesses.value
  const failHint = failList.length
    ? failList.map(f => `${f.workshop}-${f.process}`).join('、')
    : '全部达标'
  const rateVal = overallRate.value
  const rateStatus = rateVal >= 99 ? 'success' : (rateVal >= 95 ? 'warning' : 'danger')
  return [
    {
      theme: 'kpi-side',
      status: rateStatus,
      title: '本周CPK达标率',
      subTitle: 'CPK≥1.33',
      value: rateVal.toFixed(2),
      unit: '%',
      trend: rateVal >= 100 ? '全部达标' : `${failProjects.value}项未达标`,
      trendType: rateVal >= 100 ? 'up' : 'down',
      trendLabel: '本周',
      badge: rateVal >= 100 ? '达标' : '待改善',
    },
    {
      theme: 'kpi-side',
      status: 'primary',
      title: '项目总数',
      subTitle: '覆盖已开线工序',
      value: totalProjects.value,
      unit: '项',
      trend: `${validList.value.length} 个工序`,
      trendType: 'up',
      trendLabel: '覆盖',
    },
    {
      theme: 'kpi-side',
      status: 'success',
      title: '达标项目',
      subTitle: 'CPK≥1.33',
      value: passProjects.value,
      unit: '项',
      trend: `${passCount.value} 个工序达标`,
      trendType: 'up',
      trendLabel: '合格',
      badge: '合格',
    },
    {
      theme: 'kpi-side',
      status: 'warning',
      title: '未达标项目',
      subTitle: failHint,
      value: failProjects.value,
      unit: '项',
      trend: `${failCount.value} 个工序`,
      trendType: failProjects.value ? 'down' : 'up',
      trendLabel: '需改善',
      badge: failProjects.value ? '关注' : '无',
    },
  ]
})

// ============ 结论条 ============
const summary = computed(() => {
  const rate = overallRate.value
  const failList = failProcesses.value
  // console.log('failList....',failList)
  if (failList.length === 0) {
    return {
      type: 'success',
      icon: 'success',
      text: `本周过程能力达标率 <strong>${rate.toFixed(2)}%</strong>，所有已开线工序 CPK 均达标，整体质量稳定。`,
      tags: [{ text: '全部工序达标', type: 'success' }],
    }
  }
  const names = failList.map(f => `<strong>${f.workshop}车间-${f.process}工序</strong>`).join('、')
  const first = failList[0]
  return {
    type: 'warning',
    icon: 'warning',
    text: `本周过程能力达标率 <strong>${rate.toFixed(2)}%</strong>，整体质量基本稳定。未达标工序：${names}，需重点改善。${first.remark && first.remark !== '/' ? '其中 ' + first.workshop + '-' + first.process + ' 存在 CPK 偏低项目，已启动改善。' : ''}`,
    tags: failList.map(f => ({ text: `${f.workshop}-${f.process} ${f.rate.toFixed(2)}%`, type: 'danger' })),
  }
})

// ============ 左图：集成CPK达标趋势（真实周度数据：达标率折线 + 达标项目柱） ============
const trendOption = computed(() => {
  // console.log('trend....',trend)
  const t = trend.value
  const weeks = t.weeks || []
  const rates = t.rates || []
  const pass = t.pass || []
  // 计算达标率 Y 轴 min/max，自适应
  const validRates = rates.filter(v => v != null)
  const rMin = validRates.length ? Math.max(90, Math.floor(Math.min(...validRates) - 1)) : 93
  const rMax = 100
  return {
    // title:{
    //   text:'集成CPK达标趋势',
    //   textStyle:{
    //     color:''
    //   }
    // },
    tooltip: tooltipStyle({
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: chartC.textMuted } },
      formatter: (params) => {
        const idx = params[0].dataIndex
        const wk = weeks[idx]
        const p = pass[idx] ?? 0
        const tot = (t.total && t.total[idx]) ?? 0
        const rate = rates[idx]
        let html = `<div style="font-weight:600;font-size:13px;margin-bottom:6px;">${wk}</div>`
        for (const it of params) {
          if (it.seriesName === '达标率' && rate != null) {
            html += `<div style="margin:3px 0;">● ${it.seriesName}：<b>${rate.toFixed(2)}%</b></div>`
          } else if (it.seriesName === '达标项目数') {
            html += `<div style="margin:3px 0;">● ${it.seriesName}：<b>${p}</b> 项 / 共 ${tot} 项</div>`
          }
        }
        return html
      },
    }),
    legend: legendStyle({ data: ['达标率', '达标项目数'], bottom: 0 }),
    grid: gridStyle({ left: 45, right: 55, bottom: 40 }),
    xAxis: {
      type: 'category', data: weeks, boundaryGap: true,
      ...axisStyle(),
    },
    yAxis: [
      {
        type: 'value', name: '达标率(%)', min: rMin, max: rMax,
        ...valueAxisStyle({ axisLabel: { color: chartC.textMuted, fontSize: 11, formatter: '{value}%' } }),
        nameTextStyle: { color: chartC.textMuted, fontSize: 11, padding: [0,0,0,-20] },
      },
      {
        type: 'value', name: '项目数',
        ...valueAxisStyle({ splitLine: { show: false } }),
        nameTextStyle: { color: chartC.textMuted, fontSize: 11, padding: [0,-20,0,0] },
      },
    ],
    series: [
      {
        name: '达标率', type: 'line', yAxisIndex: 0, data: rates,
        smooth: true, connectNulls: true,
        symbol: 'circle', symbolSize: 7,
        lineStyle: { width: 2.5, color: chartC.success },
        itemStyle: { color: chartC.success, borderWidth: 2, borderColor: chartC.cardBg },
        areaStyle: { color: areaGradient(chartC.success, 25, 2) },
        label: {
          show: true, position: 'top', color: chartC.success, fontSize: 10, fontWeight: 'bold',
          // 100% 满值标签隐藏，避免与目标线/相邻标签重叠拥挤
          formatter: p => (p.value != null && p.value < 100) ? p.value.toFixed(2) + '%' : '',
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: chartC.danger, type: 'dashed', width: 1 },
          data: [{ yAxis: 100, label: { formatter: '目标100%', color: chartC.danger, fontSize: 10, position: 'end' } }],
        },
      },
      {
        name: '达标项目数', type: 'bar', yAxisIndex: 1, data: pass, barWidth: 18,
        itemStyle: { color: barGradient(chartC.primary), borderRadius: [3,3,0,0] },
      },
    ],
  }
})

// ============ 右图：各车间·工序 CPK 项目达成（按原型） ============
const processBarOption = computed(() => {
  const list = processList.value
  const categories = list.map(r => `${r.workshop}/${r.process}`)
  const passArr = list.map(r => r.pass === '-' ? 0 : r.pass)
  const failArr = list.map(r => (r.total !== '-' ? (r.total - r.pass) : 0))
  // console.log('categories....',categories,'passArr.....',passArr,'failArr....',failArr)
  const rateArr = list.map(r => r.rate)
  const isNoData = list.map(r => r.status === '无数据')
  return {
    tooltip: tooltipStyle({
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const idx = params[0].dataIndex
        const d = list[idx]
        let html = `<div style="font-weight:600;font-size:13px;margin-bottom:6px;">${d.workshop}车间 / ${d.process}工序</div>`
        if (d.status === '无数据') {
          html += `<div style="color:var(--chart-text-muted);font-size:12px;">${d.remark}</div>`
          return html
        }
        for (const p of params) {
          if (p.seriesName === '达标项目')
            html += `<div style="margin:3px 0;">● ${p.seriesName}：<b>${d.pass}</b> 项</div>`
          else if (p.seriesName === '未达标项目')
            html += `<div style="margin:3px 0;">● ${p.seriesName}：<b>${d.total - d.pass}</b> 项</div>`
          else if (p.seriesName === '达成率')
            html += `<div style="margin:3px 0;">● ${p.seriesName}：<b>${d.rate.toFixed(1)}%</b></div>`
        }
        if (d.remark && d.remark !== '/') {
          html += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--color-border-light);font-size:12px;color:var(--color-text-secondary);line-height:1.5;">
            <span style="color:var(--chart-text-muted);">备注：</span><br>${d.remark.replace(/\n/g,'<br>')}
          </div>`
        }
        return html
      },
    }),
    legend: legendStyle({ data: ['达标项目','未达标项目','达成率'], bottom: 0 }),
    grid: gridStyle({ left: 45, right: 55, bottom: 50 }),
    xAxis: {
      type: 'category', data: categories,
      ...axisStyle(),
      axisLabel: {
        ...axisStyle().axisLabel, interval: 0,
        formatter: v => v.replace('/', '\n'),
      },
    },
    yAxis: [
      {
        type: 'value', name: '项目数',
        ...valueAxisStyle(),
        nameTextStyle: { color: chartC.textMuted, fontSize: 11 },
      },
      {
        type: 'value', name: '达成率(%)', min: 0, max: 100,
        ...valueAxisStyle({ splitLine: { show: false }, axisLabel: { color: chartC.textMuted, fontSize: 11, formatter: '{value}%' } }),
        nameTextStyle: { color: chartC.textMuted, fontSize: 11, padding: [0,-20,0,0] },
      },
    ],
    series: [
      {
        name: '达标项目', type: 'bar', stack: 'total',
        data: passArr.map((v, i) => ({
          value: v,
          itemStyle: { color: isNoData[i] ? chartC.empty : barGradient(chartC.success) },
        })),
        barWidth: 26,
        label: {
          show:true, position:'inside', color:'#fff', fontSize:10, fontWeight:'bold',
          formatter: p => isNoData[p.dataIndex] ? '-' : (p.value > 0 ? p.value : ''),
        },
      },
      {
        name: '未达标项目', type: 'bar', stack: 'total',
        data: failArr.map((v, i) => ({
          value: v,
          itemStyle: { color: isNoData[i] ? chartC.empty : barGradient(chartC.warning), borderRadius: [3,3,0,0] },
        })),
        barWidth: 26,
        label: {
          show:true, position:'inside', color:'#fff', fontSize:10, fontWeight:'bold',
          formatter: p => p.value > 0 ? p.value : '',
        },
      },
      {
        name: '达成率', type: 'line', yAxisIndex: 1,
        data: rateArr,
        smooth: true, symbol: 'circle', symbolSize: 7,
        lineStyle: { width: 2.5, color: chartC.primary },
        itemStyle: { color: chartC.primary, borderWidth: 2, borderColor: chartC.cardBg },
        connectNulls: false,
        label: {
          show:true, position:'top', color: chartC.primary, fontSize:10, fontWeight:'bold',
          // 100% 满值标签隐藏，避免顶部拥挤重叠
          formatter: p => (p.value !== null && p.value !== undefined && p.value < 100) ? p.value?.toFixed(2) + '%' : '',
        },
      },
    ],
  }
})
</script>

<style scoped lang="scss">
.cpk-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: $spacing-md;
  overflow: hidden;
  box-sizing: border-box;
}

.chart-row {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
  margin-bottom: 12px;

  .cpk-chart {
    width: 100%;
    height: 100%;
    min-height: 320px;
  }
}

.action-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.action-hint {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

</style>
