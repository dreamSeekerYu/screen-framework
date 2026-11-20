<template>
  <div class="cpk-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader title="过程能力达标率" subtitle="过程能力指数（CPK）≥1.33 项目达标率统计" />

    <!-- KPI 卡片区：4 张等宽 -->
    <StatCardRow style="margin-bottom: 16px;" :gap="16" :min-card-width="200" :max-card-width="420">
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

    <!-- 结论条 -->
    <SummaryBar
      :type="summary.type"
      :icon="summary.icon"
      style="margin-bottom: 16px; flex-shrink: 0;"
    >
      {{ summary.text }}
      <template #tags>
        <StatusTag v-for="(tag, i) in summary.tags" :key="i" :text="tag.text" :type="tag.type" effect="dark" round />
      </template>
    </SummaryBar>

    <!-- 双图区域：5:5 对称 -->
    <div class="chart-row">
      <ScreenCard title="各车间CPK达标对比">
        <BaseChart :option="workshopCompareOption" class="cpk-chart" />
      </ScreenCard>
      <ScreenCard title="各车间·工序CPK项目达成">
        <BaseChart :option="processBarOption" class="cpk-chart" />
      </ScreenCard>
    </div>

    <!-- 工序统计 -->
    <div class="action-row">
      <span class="action-hint">共 {{ processList.length }} 条工序记录 · 达标 {{ passCount }} 条 · 未达标 {{ failCount }} 条 · 未开线 {{ noDataCount }} 条</span>
    </div>
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
import { loadSheet } from '@/utils/dataLoader.js'

// ============ 数据 ============
const processList = ref([]) // 原始工序列表

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

onMounted(async () => {
  try {
    const sheet = await loadSheet('cpk', 0)
    const rows = sheet.rows || []
    processList.value = normalizeRows(rows)
  } catch (e) {
    console.error('[Cpk] 加载过程能力达标率数据失败：', e)
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
      value: rateVal.toFixed(1),
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
  if (failList.length === 0) {
    return {
      type: 'success',
      icon: 'success',
      text: `本周过程能力达标率 <strong>${rate.toFixed(1)}%</strong>，所有已开线工序 CPK 均达标，整体质量稳定。`,
      tags: [{ text: '全部工序达标', type: 'success' }],
    }
  }
  const names = failList.map(f => `<strong>${f.workshop}车间-${f.process}工序</strong>`).join('、')
  const first = failList[0]
  return {
    type: 'warning',
    icon: 'warning',
    text: `本周过程能力达标率 <strong>${rate.toFixed(1)}%</strong>，整体质量基本稳定。未达标工序：${names}，需重点改善。${first.remark && first.remark !== '/' ? '其中 ' + first.workshop + '-' + first.process + ' 存在 CPK 偏低项目，已启动改善。' : ''}`,
    tags: failList.map(f => ({ text: `${f.workshop}-${f.process} ${f.rate.toFixed(0)}%`, type: 'danger' })),
  }
})

// ============ 左图：各车间 CPK 达标对比（堆叠柱+达标率折线） ============
const workshopCompareOption = computed(() => {
  const ws = workshopStats.value
  const names = ws.map(w => w.workshop + '车间')
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: 'var(--color-border,#e2e8f0)',
      textStyle: { color: '#334155' },
    },
    legend: {
      data: ['达标项目', '未达标项目', '达标率'],
      bottom: 0,
      textStyle: { color: 'var(--color-text-secondary,#64748b)', fontSize: 12 },
      itemWidth: 14, itemHeight: 8, itemGap: 18,
    },
    grid: { left: 50, right: 55, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category', data: names,
      axisLine: { lineStyle: { color: 'var(--color-border,#e2e8f0)' } },
      axisLabel: { color: 'var(--color-text-secondary,#64748b)', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value', name: '项目数',
        axisLabel: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'var(--color-border-light,#f1f5f9)', type: 'dashed' } },
        nameTextStyle: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11 },
      },
      {
        type: 'value', name: '达标率(%)', min: 0, max: 100,
        axisLabel: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11, formatter: '{value}%' },
        splitLine: { show: false },
        nameTextStyle: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11, padding: [0, -20, 0, 0] },
      },
    ],
    series: [
      {
        name: '达标项目', type: 'bar', stack: 'total',
        data: ws.map(w => w.pass),
        barWidth: 36,
        itemStyle: {
          color: { type:'linear', x:0,y:0,x2:0,y2:1, colorStops:[
            { offset:0, color:'#34d399' }, { offset:1, color:'#10b981' }
          ]},
          borderRadius: [0,0,0,0],
        },
        label: { show:true, position:'inside', color:'#fff', fontSize:11, fontWeight:'bold', formatter: p => p.value > 0 ? p.value : '' },
      },
      {
        name: '未达标项目', type: 'bar', stack: 'total',
        data: ws.map(w => w.fail),
        barWidth: 36,
        itemStyle: {
          color: { type:'linear', x:0,y:0,x2:0,y2:1, colorStops:[
            { offset:0, color:'#fb923c' }, { offset:1, color:'#f97316' }
          ]},
          borderRadius: [4,4,0,0],
        },
        label: { show:true, position:'inside', color:'#fff', fontSize:11, fontWeight:'bold', formatter: p => p.value > 0 ? p.value : '' },
      },
      {
        name: '达标率', type: 'line', yAxisIndex: 1,
        data: ws.map(w => +w.rate.toFixed(1)),
        smooth: true, symbol: 'circle', symbolSize: 8,
        lineStyle: { width: 2.5, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor:'#fff' },
        label: { show:true, position:'top', color:'#2563eb', fontSize:11, fontWeight:'bold', formatter: '{c}%' },
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
  const rateArr = list.map(r => r.rate)
  const isNoData = list.map(r => r.status === '无数据')
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: 'var(--color-border,#e2e8f0)',
      textStyle: { color: '#334155', fontSize: 12 },
      formatter: (params) => {
        const idx = params[0].dataIndex
        const d = list[idx]
        let html = `<div style="font-weight:600;font-size:13px;margin-bottom:6px;">${d.workshop}车间 / ${d.process}工序</div>`
        if (d.status === '无数据') {
          html += `<div style="color:#64748b;font-size:12px;">${d.remark}</div>`
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
          html += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:12px;color:#475569;line-height:1.5;">
            <span style="color:#64748b;">备注：</span><br>${d.remark.replace(/\n/g,'<br>')}
          </div>`
        }
        return html
      },
    },
    legend: {
      data: ['达标项目','未达标项目','达成率'],
      bottom: 0,
      textStyle: { color: 'var(--color-text-secondary,#64748b)', fontSize: 12 },
      itemWidth: 14, itemHeight: 8, itemGap: 18,
    },
    grid: { left: 45, right: 55, top: 20, bottom: 50, containLabel: true },
    xAxis: {
      type: 'category', data: categories,
      axisLine: { lineStyle: { color: 'var(--color-border,#e2e8f0)' } },
      axisLabel: {
        color: 'var(--color-text-secondary,#64748b)', fontSize: 11, interval: 0,
        formatter: v => v.replace('/', '\n'),
      },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value', name: '项目数',
        axisLabel: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'var(--color-border-light,#f1f5f9)', type: 'dashed' } },
        nameTextStyle: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11 },
      },
      {
        type: 'value', name: '达成率(%)', min: 0, max: 100,
        axisLabel: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11, formatter: '{value}%' },
        splitLine: { show: false },
        nameTextStyle: { color: 'var(--color-text-secondary,#64748b)', fontSize: 11, padding: [0,-20,0,0] },
      },
    ],
    series: [
      {
        name: '达标项目', type: 'bar', stack: 'total',
        data: passArr.map((v, i) => ({
          value: v,
          itemStyle: { color: isNoData[i] ? '#e2e8f0' : { type:'linear', x:0,y:0,x2:0,y2:1, colorStops:[
            { offset:0, color:'#34d399' },{ offset:1, color:'#10b981' }
          ]}},
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
          itemStyle: { color: isNoData[i] ? '#e2e8f0' : { type:'linear', x:0,y:0,x2:0,y2:1, colorStops:[
            { offset:0, color:'#fb923c' },{ offset:1, color:'#f97316' }
          ]}},
        })),
        barWidth: 26,
        itemStyle: { borderRadius: [4,4,0,0] },
        label: {
          show:true, position:'inside', color:'#fff', fontSize:10, fontWeight:'bold',
          formatter: p => p.value > 0 ? p.value : '',
        },
      },
      {
        name: '达成率', type: 'line', yAxisIndex: 1,
        data: rateArr,
        smooth: true, symbol: 'circle', symbolSize: 7,
        lineStyle: { width: 2.5, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor:'#fff' },
        connectNulls: false,
        label: {
          show:true, position:'top', color:'#2563eb', fontSize:10, fontWeight:'bold',
          formatter: p => p.value !== null && p.value !== undefined ? p.value + '%' : '',
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
