<template>
  <div class="pack-detail">
    <!-- ===== M6：外观 / 性能 两维视图 ===== -->
    <div v-if="customer.isM6" class="pd-body">
      <div class="pd-kpi pd-kpi--m6">
        <div v-for="k in m6KPI" :key="k.label" class="pd-kpi__item">
          <div class="pd-kpi__label">{{ k.label }}</div>
          <div class="pd-kpi__value" :class="`is-${k.status}`">
            <NumberCounter :value="k.value" :decimals="k.decimals" />
            <span class="pd-kpi__unit">{{ k.unit }}</span>
          </div>
          <StatusTag v-if="k.badge" :type="k.status" effect="light" size="small" :text="k.badge" />
        </div>
      </div>

      <ScreenCard title="外观 / 性能 PPM 走势" class="pd-chart-card">
        <BaseChart :option="m6ChartOption" />
      </ScreenCard>

      <ScreenCard title="小米-N1 详细数据表" class="pd-table-card">
        <div class="pd-table-wrap">
          <table class="pd-table">
            <thead>
              <tr>
                <th>项目</th>
                <th v-for="w in m6Labels" :key="w">{{ w }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in m6TableRows" :key="row.name">
                <td class="pd-table__name">{{ row.name }}</td>
                <td v-for="(v,i) in row.vals" :key="i">{{ formatVal(v) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ScreenCard>

      <ScreenCard title="M6集成结论与未计入问题说明" class="pd-conclusion">
        <div class="pd-conclusion__text">{{ customer.note || '暂无偏差分析' }}</div>
      </ScreenCard>
    </div>

    <!-- ===== A 型：0KM / 3MIS / 6MIS / 12MIS ===== -->
    <template v-else>
    <!-- 周期切换 Tabs -->
    <Tabs v-model="activeTab" type="card" stretch>
      <TabPane label="集成0KM表现" name="km0" />
      <TabPane label="集成3MIS表现" name="km3" />
      <TabPane label="集成6MIS表现" name="km6" />
      <TabPane label="集成12MIS表现" name="km12" />
    </Tabs>

    <div class="pd-body">
      <!-- 关键数据 -->
      <div class="pd-kpi">
        <div v-for="k in currentKPI" :key="k.label" class="pd-kpi__item">
          <div class="pd-kpi__label">{{ k.label }}</div>
          <div class="pd-kpi__value" :class="`is-${k.status}`">
            <NumberCounter :value="k.value" :decimals="k.decimals" />
            <span class="pd-kpi__unit">{{ k.unit }}</span>
          </div>
          <StatusTag v-if="k.badge" :type="k.status" effect="light" size="small" :text="k.badge" />
        </div>
      </div>

      <!-- 图表 -->
      <ScreenCard title="PPM 趋势" class="pd-chart-card">
        <BaseChart :option="chartOption"  />
      </ScreenCard>

      <!-- 详细数据表 -->
      <ScreenCard title="详细数据表" class="pd-table-card">
        <div class="pd-table-wrap">
          <table class="pd-table">
            <thead>
              <tr>
                <th>项目</th>
                <th v-for="w in table.recentWeeks" :key="w">{{ w }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row,i) in table.rows" :key="i">
                <td class="pd-table__name">{{ row.name }}</td>
                <td v-for="(v,j) in row.weekly" :key="j"
                    :class="{
                      'is-target': row.name.includes('目标'),
                      'is-danger': isDanger(row.name, v, i),
                      'is-zero': v === 0 || v === null || v === undefined
                    }">
                  {{ formatVal(v) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ScreenCard>

      <!-- 偏差分析 / 集成结论 -->
      <ScreenCard :title="conclusionTitle" class="pd-conclusion">
        <div class="pd-conclusion__text">{{ customer.note || '暂无偏差分析' }}</div>
        <div v-if="models.length" class="pd-models">
          <div class="pd-models__title">涉及车型：</div>
          <div class="pd-models__list">
            <span v-for="(m,i) in models" :key="i" class="pd-model-tag">{{ m.name }} <small>{{ m.code }}</small></span>
          </div>
        </div>
      </ScreenCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import Tabs from '@/components/common/Tabs.vue'
import TabPane from '@/components/common/TabPane.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import NumberCounter from '@/components/data/NumberCounter.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import { buildDetailTable, judgeStatus, PERIOD_FIELD } from '@/utils/parsePack.js'
import { getCssVar } from '@/utils/color.js'
import { chartC, axisStyle, valueAxisStyle, tooltipStyle, legendStyle, gridStyle, areaGradient, lineStyle } from '@/utils/chartTheme.js'

const props = defineProps({ customer: { type: Object, required: true } })
const activeTab = ref('km0')

const tabPeriodMap = { km0: 'km0', km3: 'km3', km6: 'km6', km12: 'km12' }
const tabLabelMap = { km0: '0KM', km3: '3MIS', km6: '6MIS', km12: '12MIS' }

const current = computed(() => props.customer.kpi[tabPeriodMap[activeTab.value]])
const models = computed(() => props.customer.models || [])
const table = computed(() => {
  // 重写：返回所有指标行（统一用 PERIOD_FIELD 映射）
  const m = props.customer.metrics
  const weeks = props.customer.weeks
  // 取最近 8 个有供货的周
  const recent = []
  for (let i = weeks.length - 1; i >= 0 && recent.length < 8; i--) {
    const w = weeks[i]
    const sv = m.supply && m.supply.values[w]
    if (sv !== null && sv !== undefined && Number(sv) > 0) recent.unshift(w)
  }
  const p = tabPeriodMap[activeTab.value]
  const f = PERIOD_FIELD[p] || PERIOD_FIELD.km0
  const rows = [
    { name: m[f.target].label, key: 'target', vals: recent.map(w => m[f.target].values[w]) },
    { name: m[f.actual].label, key: 'actual', vals: recent.map(w => m[f.actual].values[w]) },
    { name: m[f.fail].label,   key: 'fail',   vals: recent.map(w => m[f.fail].values[w]) },
    { name: m[f.supply].label, key: 'supply', vals: recent.map(w => m[f.supply].values[w]) },
  ]
  return { recentWeeks: recent, rows: rows.map(r => ({ name: r.name, weekly: r.vals })) }
})

const conclusionTitle = computed(() => {
  if (props.customer.key === 'M6') return 'M6集成结论与未计入问题说明'
  if (current.value.status === 'success') return '质量表现总结：整体达标'
  return '偏差分析与改进项'
})

const currentKPI = computed(() => {
  const c = current.value
  const failCount = c.fail
  return [
    { label: `${c.label} 实际`, value: c.ppm, decimals: 0, unit: 'PPM', status: c.status,
      badge: c.status === 'success' ? '达标' : (c.status === 'warning' ? '接近' : '超标') },
    { label: '目标值', value: c.target, decimals: 0, unit: 'PPM', status: 'primary', badge: '' },
    { label: '故障数', value: failCount, decimals: 0, unit: '件', status: failCount > 0 ? 'warning' : 'success',
      badge: failCount > 0 ? '需关注' : '无故障' },
    { label: '供货数', value: c.supply, decimals: 0, unit: '件', status: 'primary', badge: `近${c.weeks}周` },
  ]
})

function isDanger(name, v, i) {
  if (name.includes('目标')) return false
  if (v === null || v === undefined) return false
  // 目标 PPM
  const target = { km0: 24, km3: 5, km6: 300, km12: 105 }[activeTab.value]
  if (name.includes('PPM') && Number(v) > target) return true
  return false
}
function formatVal(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v
    return v.toFixed(1)
  }
  return v
}

const chartOption = computed(() => {
  const p = tabPeriodMap[activeTab.value]
  const f = PERIOD_FIELD[p] || PERIOD_FIELD.km0
  const labels = props.customer.months
  const actual = labels.map(m => {
    const v = props.customer.metrics[f.actual].values[m]
    return (v === null || v === undefined || isNaN(Number(v))) ? 0 : Number(v)
  })
  const target = labels.map(m => {
    const v = props.customer.metrics[f.target].values[m]
    return (v === null || v === undefined) ? f.targetDefault : Number(v)
  })
  const cColor = getCssVar('--color-primary', '#2F7CFF')
  return {
    grid: gridStyle(),
    tooltip: tooltipStyle({ trigger: 'axis' }),
    legend: legendStyle({ top: 0, right: 10 }),
    xAxis: { type: 'category', data: labels, ...axisStyle() },
    yAxis: { type: 'value', ...valueAxisStyle() },
    series: [
      { name: '实际PPM', type: 'line', smooth: true, data: actual, itemStyle: { color: chartC.primary }, lineStyle: lineStyle(chartC.primary),
        areaStyle: { color: areaGradient(chartC.primary, 32, 0) } },
      { name: '目标PPM', type: 'line', data: target, itemStyle: { color: chartC.danger }, lineStyle: lineStyle(chartC.danger, { width: 1.5, type: 'dashed' }), symbol: 'none' },
    ]
  }
})

/* ---------------- M6：外观 / 性能 专用计算 ---------------- */
const m6Labels = computed(() => [...(props.customer.months || []), ...(props.customer.weeks || [])])

const m6KPI = computed(() => {
  const k = props.customer.kpi || {}
  const app = k.km0 || {}
  const perf = k.km3 || {}
  const deliv = (props.customer.metrics && props.customer.metrics.delivery) || { values: {} }
  const peakDeliv = m6Labels.value.reduce((mx, l) => Math.max(mx, Number(deliv.values[l] || 0)), 0)
  const badge = (st) => st === 'success' ? '达标' : (st === 'warning' ? '接近' : '超标')
  return [
    { label: '外观 PPM（峰值）', value: app.ppm || 0, decimals: 0, unit: 'PPM', status: app.status || 'primary', badge: badge(app.status) },
    { label: '性能 PPM（峰值）', value: perf.ppm || 0, decimals: 0, unit: 'PPM', status: perf.status || 'primary', badge: badge(perf.status) },
    { label: '周交付量峰值', value: peakDeliv, decimals: 0, unit: '件', status: 'primary', badge: '' },
  ]
})

const m6TableRows = computed(() => {
  const m = props.customer.metrics || {}
  const labels = m6Labels.value
  const pick = (key) => labels.map(l => (m[key] ? m[key].values[l] : null))
  return [
    { name: '0KM-外观故障数', vals: pick('failApp') },
    { name: '0KM-性能故障数', vals: pick('failPerf') },
    { name: '周交付量', vals: pick('delivery') },
    { name: '外观PPM', vals: pick('ppmApp') },
    { name: '性能PPM', vals: pick('ppmPerf') },
  ]
})

const m6ChartOption = computed(() => {
  const m = props.customer.metrics || {}
  const labels = m6Labels.value
  const app = labels.map(l => Number((m.ppmApp && m.ppmApp.values[l]) || 0))
  const perf = labels.map(l => Number((m.ppmPerf && m.ppmPerf.values[l]) || 0))
  const tApp = labels.map(l => Number((m.targetApp && m.targetApp.values[l]) || 300))
  const tPerf = labels.map(l => Number((m.targetPerf && m.targetPerf.values[l]) || 150))
  const cColor = getCssVar('--color-primary', '#2F7CFF')
  return {
    grid: gridStyle(),
    tooltip: tooltipStyle({ trigger: 'axis' }),
    legend: legendStyle({ top: 0, right: 10 }),
    xAxis: { type: 'category', data: labels, ...axisStyle() },
    yAxis: { type: 'value', ...valueAxisStyle() },
    series: [
      { name: '外观PPM', type: 'line', smooth: true, data: app, itemStyle: { color: chartC.primary }, lineStyle: lineStyle(chartC.primary) },
      { name: '性能PPM', type: 'line', smooth: true, data: perf, itemStyle: { color: chartC.success }, lineStyle: lineStyle(chartC.success) },
      { name: '外观目标', type: 'line', data: tApp, itemStyle: { color: chartC.danger }, lineStyle: lineStyle(chartC.danger, { width: 1.5, type: 'dashed' }), symbol: 'none' },
      { name: '性能目标', type: 'line', data: tPerf, itemStyle: { color: chartC.warning }, lineStyle: lineStyle(chartC.warning, { width: 1.5, type: 'dashed' }), symbol: 'none' },
    ]
  }
})
</script>

<style scoped>
.pack-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-main, #fff);
}
.pd-body {
  flex:1;
  overflow: auto;
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pd-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.pd-kpi--m6 { grid-template-columns: repeat(3, 1fr); }
.pd-kpi__item {
  background: var(--color-bg-soft);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pd-kpi__label { font-size: 12px; color: var(--text-sub); }
.pd-kpi__value {
  font-size: 24px; font-weight: 700;
  display: flex; align-items: baseline; gap: 4px;
}
.pd-kpi__value.is-danger { color: var(--color-danger); }
.pd-kpi__value.is-warning { color: var(--color-warning); }
.pd-kpi__value.is-success { color: var(--color-success); }
.pd-kpi__unit { font-size: 12px; color: var(--text-sub); font-weight: 400; }

.pd-chart-card :deep(.screen-card__body),
.pd-table-card :deep(.screen-card__body),
.pd-conclusion :deep(.screen-card__body) { padding: 10px 12px; }

.pd-table-wrap { overflow-x: auto; }
.pd-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.pd-table th, .pd-table td {
  padding: 7px 10px;
  text-align: center;
  border-bottom: 1px solid var(--color-border-light);
}
.pd-table th {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--text-main, #fff);
  font-weight: 500;
  font-size: 11px;
}
.pd-table__name { text-align: left; color: var(--text-sub); font-weight: 500; }
.pd-table td.is-target { color: var(--color-warning); }
.pd-table td.is-danger { color: var(--color-danger); font-weight: 600; }
.pd-table td.is-zero { color: var(--text-sub); }

.pd-conclusion__text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main, #fff);
  white-space: pre-wrap;
  padding: 4px 0 8px;
}
.pd-models { margin-top: 8px; }
.pd-models__title { font-size: 12px; color: var(--text-sub); margin-bottom: 6px; }
.pd-models__list { display: flex; flex-wrap: wrap; gap: 6px; }
.pd-model-tag {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  color: var(--color-primary, #2F7CFF);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.pd-model-tag small { color: var(--text-sub); font-size: 10px; }
</style>
