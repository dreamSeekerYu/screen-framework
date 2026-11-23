<template>
  <div class="home-screen pack-screen">
    <ScreenHeader title="PACK客户质量表现监控大屏" :sub-title="`CALB 中创新航 | 数据截止：${packData.asOf} | 实时监控`" />

    <div v-if="loading" class="p-loading">数据加载中...</div>
    <div v-else-if="loadError" class="p-loading">数据加载失败：{{ loadError }}</div>

    <template v-else>
      <!-- 主Tab导航（原型：总览仪表盘 / 客户详情分析 / 问题与偏差分析） -->
      <div class="pack-main-tabs">
        <button
          v-for="t in MAIN_TABS"
          :key="t.key"
          class="pack-tab-btn"
          :class="{ active: mainTab === t.key }"
          @click="switchMainTab(t.key)"
        >
          <span class="icon">{{ t.icon }}</span>{{ t.label }}
        </button>
      </div>

      <div class="pack-content">
        <!-- ========== 总览仪表盘 ========== -->
        <div v-show="mainTab === 'overview'" class="pack-tab-panel">
          <!-- KPI 行 -->
          <div class="pack-kpi-row">
            <div v-for="k in overviewKpis" :key="k.key" class="pack-kpi-card" :class="k.modifier">
              <div class="kpi-label">{{ k.label }}</div>
              <div class="kpi-value">{{ k.value }}</div>
              <div class="kpi-sub" :class="k.subColor">{{ k.sub }}</div>
            </div>
          </div>

          <!-- 客户概览卡片 -->
          <div class="pack-client-grid">
            <!-- A1/A2/A3 -->
            <div
              v-for="c in overviewCards.aType"
              :key="c.key"
              class="pack-client-card"
              :class="{ selected: activeClient === c.key }"
              @click="jumpToDetail(c.key)"
            >
              <div class="cc-head">
                <h3 class="cc-name">{{ c.name }}</h3>
                <span class="cc-status" :class="`status-${c.statusType}`">{{ c.statusText }}</span>
              </div>
              <div class="cc-metrics">
                <div v-for="m in c.metrics" :key="m.label" class="cc-row">
                  <span class="cc-label">{{ m.label }}</span>
                  <span class="cc-val" :class="m.colorClass">{{ m.value }}</span>
                </div>
              </div>
              <div class="cc-bar">
                <div class="cc-bar-fill" :class="c.barClass" :style="{ width: c.passRate + '%' }"></div>
              </div>
              <div class="cc-remark">{{ c.remark }}</div>
            </div>

            <!-- A4（M5+M6 合并卡片） -->
            <div
              class="pack-client-card"
              :class="{ selected: activeClient === 'M5' }"
              @click="jumpToDetail('M5')"
            >
              <div class="cc-head">
                <h3 class="cc-name">A4客户</h3>
                <span class="cc-status status-pass">达标</span>
              </div>
              <div class="cc-metrics cc-metrics--a4">
                <div class="cc-sub-title">M5-XP (D03E):</div>
                <div class="cc-row cc-row--sub">
                  <span class="cc-label">0KM PPM峰值</span>
                  <span class="cc-val text-orange">{{ m5PeakText }}</span>
                </div>
                <div class="cc-sub-title mt">M6-XM (小米-N1):</div>
                <div class="cc-row cc-row--sub">
                  <span class="cc-label">外观PPM</span>
                  <span class="cc-val text-red">{{ m6AppText }}</span>
                </div>
                <div class="cc-row cc-row--sub">
                  <span class="cc-label">性能PPM</span>
                  <span class="cc-val text-green">{{ m6PerfText }}</span>
                </div>
              </div>
              <div class="cc-bar">
                <div class="cc-bar-fill bar-green-yellow" style="width:80%"></div>
              </div>
              <div class="cc-remark">整体达标率 80%，小米N1外观需关注</div>
            </div>
          </div>

          <!-- 图表区域 -->
          <div class="pack-chart-grid">
            <div class="pack-chart-card">
              <div class="chart-title"><span class="chart-bar"></span>各客户0KM PPM趋势对比</div>
              <div :ref="el => setChartRef('overview0km', el)" class="chart-box-h300"></div>
            </div>
            <div class="pack-chart-card">
              <div class="chart-title"><span class="chart-bar"></span>各周期PPM达标情况统计</div>
              <div :ref="el => setChartRef('overviewRadar', el)" class="chart-box-h300"></div>
            </div>
          </div>
        </div>

        <!-- ========== 客户详情分析 ========== -->
        <div v-show="mainTab === 'detail'" class="pack-tab-panel">
          <!-- 客户选择器 -->
          <div class="pack-client-tabs">
            <button
              v-for="t in CLIENT_TABS"
              :key="t.key"
              class="client-tab-btn"
              :class="{ active: activeClient === t.key }"
              @click="activeClient = t.key; $nextTick(resizeCharts)"
            >{{ t.label }}</button>
          </div>

          <!-- A1/A2/A3/M5 详情：通用A型布局 -->
          <div v-if="currentA" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">{{ currentA.meta.fullName }} - 质量表现详情</h3>
              <span class="cc-status" :class="`status-${currentA.meta.status}`">{{ currentA.meta.statusText }}</span>
            </div>

            <div class="detail-chart-grid">
              <div v-for="p in A_PERIODS" :key="p.key" class="detail-chart-block">
                <h4 class="detail-sub-title">{{ p.title }}</h4>
                <div :ref="el => { if (el && currentA) setChartRef(`chart-${currentA.key}-${p.key}`, el) }" class="chart-box-h280"></div>
              </div>
            </div>

            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">详细数据表</h4>
              <table class="pack-data-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th v-for="w in detailWeeks(currentA)" :key="w">{{ w }}</th>
                    <th>目标</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detailRows(currentA)" :key="row.name">
                    <td class="tl">{{ row.name }}</td>
                    <td v-for="(v,i) in row.weekly" :key="i" :class="valColor(row.status, v, row.target)">{{ formatVal(v) }}</td>
                    <td>≤{{ row.target }} PPM</td>
                    <td>
                      <span class="cc-status" :class="`status-${row.status}`">
                        {{ row.status === 'success' ? '达标' : (row.name.includes('故障') ? '—' : '超标') }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- A4-M5 详情 -->
          <div v-if="activeClient === 'M5' && m5" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">A4客户 - M5-XP (D03E) 质量表现</h3>
              <span class="cc-status status-pass">整体达标</span>
            </div>
            <div class="detail-chart-grid--wide">
              <div class="detail-chart-block full">
                <h4 class="detail-sub-title">M5-XP 集成0KM表现</h4>
                <div :ref="el => setChartRef('m5-0km', el)" class="chart-box-h300"></div>
              </div>
            </div>
            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">M5-XP 关键数据</h4>
              <table class="pack-data-table">
                <thead>
                  <tr><th>周期</th><th>故障数</th><th>供货数</th><th>0KM实际PPM</th><th>目标PPM</th><th>状态</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in m5Rows" :key="r.period">
                    <td class="tl">{{ r.period }}</td>
                    <td>{{ r.fail }}</td>
                    <td>{{ r.supply }}</td>
                    <td :class="r.ppmColor">{{ r.ppm }}</td>
                    <td>15</td>
                    <td><span class="cc-status" :class="`status-${r.status}`">{{ r.statusText }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="detail-note note-blue">
              <h4>M5集成结论</h4>
              <p>A4-M5集成：整体达标。虽然量产爬坡期连续多周出现0KM PPM超标情况（214-270PPM，目标15PPM），但单周故障数仅1-2例，主要问题为温度采集异常类从控问题，属于供应商责任，已推动供应商整改。</p>
            </div>
          </div>

          <!-- A4-M6 详情 -->
          <div v-if="activeClient === 'M6' && m6" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">A4客户 - M6-XM (小米-N1) 质量表现</h3>
              <span class="cc-status status-warn">外观PPM偏高</span>
            </div>
            <div class="detail-chart-grid">
              <div class="detail-chart-block">
                <h4 class="detail-sub-title">小米-N1 0KM客户表现</h4>
                <div :ref="el => setChartRef('m6-0km', el)" class="chart-box-h300"></div>
              </div>
              <div class="detail-chart-block">
                <h4 class="detail-sub-title">关键指标数据</h4>
                <div class="m6-metrics">
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>WK43 外观PPM</span>
                      <span class="m6-val text-red">{{ m6.kpi.km0.ppm }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill bar-red" style="width:100%"></div></div>
                    <div class="m6-sub">目标值：{{ m6.kpi.km0.target }}PPM，{{ m6.kpi.km0.ppm > m6.kpi.km0.target ? '超标' + Math.round(m6.kpi.km0.ppm/m6.kpi.km0.target) + '倍' : '达标' }}</div>
                  </div>
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>WK44 性能PPM</span>
                      <span class="m6-val text-green">{{ m6.kpi.km3.ppm }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill bar-green" :style="{width: Math.min(100, m6.kpi.km3.ppm/m6.kpi.km3.target*100)+'%'}"></div></div>
                    <div class="m6-sub">目标值：{{ m6.kpi.km3.target }}PPM，{{ m6.kpi.km3.ppm <= m6.kpi.km3.target ? '达标' : '超标' }}</div>
                  </div>
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>周交付量峰值</span>
                      <span class="m6-val text-blue">{{ m6PeakDelivery.value }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill bar-blue" style="width:100%"></div></div>
                    <div class="m6-sub">{{ m6PeakDelivery.week }} 交付峰值，产能爬坡期</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">小米-N1 详细数据表</h4>
              <table class="pack-data-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th v-for="h in m6TableHeaders" :key="h">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in m6TableRows" :key="row.name">
                    <td class="tl">{{ row.name }}</td>
                    <td v-for="(v,i) in row.values" :key="i" :class="row.color[i]">{{ v }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="detail-note note-yellow">
              <h4>M6集成结论与未计入问题说明</h4>
              <p>A4-M6集成：0km 外观PPM为0（已剔除物流责任问题），功能PPM为138，达标。</p>
              <p><strong>未计入0KM问题：</strong></p>
              <ul>
                <li>• 水管磕伤（翻包导致），客户端已处理，不计入</li>
                <li>• 箱盖及箱体变形6例（出厂照片无异常），判定为中储物流责任，不计入</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ========== 问题与偏差分析 ========== -->
        <div v-show="mainTab === 'issues'" class="pack-tab-panel">
          <div class="pack-issues-grid">
            <div class="issues-left">
              <div class="pack-chart-card mb">
                <h3 class="section-title"><span class="text-red">⚠️</span> 偏差问题汇总</h3>
                <div class="issue-list">
                  <div v-for="it in issueItems" :key="it.title" class="issue-item" :style="{ borderLeftColor: it.borderColor }">
                    <div class="issue-head">
                      <span class="cc-status" :class="`status-${it.statusType}`">{{ it.statusText }}</span>
                      <h4>{{ it.title }}</h4>
                    </div>
                    <p class="issue-desc"><strong>问题描述：</strong>{{ it.desc }}</p>
                    <p class="issue-meta">影响周期：{{ it.period }} | 涉及产品：{{ it.product }}{{ it.extra ? ' | ' + it.extra : '' }}</p>
                  </div>
                </div>
              </div>

              <div class="pack-chart-card">
                <h3 class="section-title"><span class="text-blue">📋</span> 集成达标结论汇总</h3>
                <div class="conclude-grid">
                  <div v-for="c in concludeItems" :key="c.name" class="conclude-card" :class="c.modifier">
                    <h4 :class="c.titleColor">{{ c.name }}</h4>
                    <p>{{ c.text }}</p>
                  </div>
                </div>
                <div class="detail-note note-blue mt">
                  <h4>A4各项目集成结论</h4>
                  <ul>
                    <li>• <strong>A4-M5集成（M5-XP）：</strong>整体达标，详见A4-M5客户详情页</li>
                    <li>• <strong>A4-M6集成（M6-XM/小米-N1）：</strong>0km外观PPM为0（剔除物流责任），功能PPM为138达标；责任认定详见A4-M6客户详情页</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="issues-right">
              <div class="pack-chart-card mb">
                <h3 class="section-title sm">问题类型分布</h3>
                <div :ref="el => setChartRef('issueType', el)" class="chart-box-h250"></div>
              </div>
              <div class="pack-chart-card mb">
                <h3 class="section-title sm">各客户风险评级</h3>
                <div :ref="el => setChartRef('risk', el)" class="chart-box-h250"></div>
              </div>
              <div class="pack-chart-card">
                <h3 class="section-title sm">改进建议</h3>
                <div class="suggest-list">
                  <div v-for="(s,i) in suggestions" :key="i" class="suggest-item">
                    <span class="suggest-no" :class="s.color">{{ i+1 }}</span>
                    <p>{{ s.text }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, h, watch } from 'vue'
import * as echarts from 'echarts'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import { useThemeStore } from '@/stores/theme'
import { loadPackData, PERIOD_FIELD } from '@/utils/parsePack.js'
import { getCssVar } from '@/utils/color.js'

const loading = ref(true)
const loadError = ref('')
const packData = reactive({ asOf: '', customers: [], peak0km: {value:0}, peak3m: {value:0}, peak12m: {value:0}, totalCustomers: 0 })
const mainTab = ref('overview')
const activeClient = ref('A1')

const chartRefs = {}
const chartInstances = {}
function setChartRef(name, el) {
  if (el) chartRefs[name] = el
  else delete chartRefs[name]
}

const MAIN_TABS = [
  { key: 'overview', label: '总览仪表盘', icon: '📊' },
  { key: 'detail',   label: '客户详情分析', icon: '📈' },
  { key: 'issues',   label: '问题与偏差分析', icon: '⚠️' },
]
const CLIENT_TABS = [
  { key: 'A1',    label: 'A1客户' },
  { key: 'A2',    label: 'A2客户' },
  { key: 'A3',    label: 'A3客户' },
  { key: 'M5', label: 'A4-M5客户' },
  { key: 'M6', label: 'A4-M6客户' },
]
const A_PERIODS = [
  { key: 'km0',  title: '集成0KM表现' },
  { key: 'km3',  title: '集成3MIS表现' },
  { key: 'km6',  title: '集成6MIS表现' },
  { key: 'km12', title: '集成12MIS表现' },
]

const a1 = computed(() => packData.customers.find(c => c.key === 'A1'))
const a2 = computed(() => packData.customers.find(c => c.key === 'A2'))
const a3 = computed(() => packData.customers.find(c => c.key === 'A3'))
const m5 = computed(() => packData.customers.find(c => c.key === 'M5'))
const m6 = computed(() => packData.customers.find(c => c.key === 'M6'))
const currentA = computed(() => {
  if (activeClient.value === 'A1') return a1.value
  if (activeClient.value === 'A2') return a2.value
  if (activeClient.value === 'A3') return a3.value
  if (activeClient.value === 'M5') return null
  if (activeClient.value === 'M6') return null
  return a1.value
})

const color = {
  primary:  () => getCssVar('--color-primary', '#2f54eb'),
  primaryL: () => getCssVar('--color-primary-light', '#597ef7'),
  primaryD: () => getCssVar('--color-primary-deep', '#1d39c4'),
  success:  () => getCssVar('--color-success', '#16a34a'),
  warning:  () => getCssVar('--color-warning', '#d97706'),
  danger:   () => getCssVar('--color-danger', '#e5484d'),
  accent:   () => getCssVar('--color-accent', '#13c2c2'),
  textM:    () => getCssVar('--text-main', '#1f2329'),
  textS:    () => getCssVar('--text-sec', '#4e5969'),
  border:   () => getCssVar('--border-color', 'rgba(15,34,87,0.12)'),
  split:    () => getCssVar('--chart-split-line', 'rgba(84,105,141,0.14)'),
  axis:     () => getCssVar('--chart-axis-line', '#c9d2e3'),
  tooltipBg: () => getCssVar('--chart-tooltip-bg', 'rgba(255,255,255,0.96)'),
  cardBg:   () => getCssVar('--color-bg-card', '#ffffff'),
}

function chartTheme() {
  return {
    color: [color.primary(), color.primaryL(), color.warning(), color.danger(), color.accent(), color.textS()],
    backgroundColor: 'transparent',
    textStyle: { color: color.textS() },
    title: { textStyle: { color: color.textM() } },
    legend: { textStyle: { color: color.textS() } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    tooltip: {
      trigger: 'axis', backgroundColor: color.tooltipBg(),
      borderColor: color.primary(), textStyle: { color: color.textM() }
    },
    xAxis: {
      axisLine: { lineStyle: { color: color.axis() } },
      axisLabel: { color: color.textS(), fontSize: 11 },
      splitLine: { lineStyle: { color: color.split() } }
    },
    yAxis: {
      axisLine: { lineStyle: { color: color.axis() } },
      axisLabel: { color: color.textS(), fontSize: 11 },
      splitLine: { lineStyle: { color: color.split() } }
    },
  }
}

/* ========== KPI 行 ========== */
const overviewKpis = computed(() => {
  const p0 = packData.peak0km, p3 = packData.peak3m, p12 = packData.peak12m
  return [
    { key: 'clients', label: '监控客户数量', value: packData.totalCustomers,
      sub: '↑ 全部客户纳入监控',    subColor: 'text-green', modifier: 'kpi-success' },
    { key: 'km0',    label: '0KM PPM峰值',    value: p0.value,
      sub: `⚡ 出现在${p0.owner?.name || ''} ${p0.owner?.week || ''}`, subColor: 'text-orange', modifier: 'kpi-warning' },
    { key: 'km3',    label: '3MIS PPM峰值',   value: p3.value,
      sub: '✓ 远低于目标值5PPM',  subColor: 'text-blue', modifier: '' },
    { key: 'km12',   label: '12MIS PPM峰值',  value: p12.value,
      sub: `⚠️ 出现在${p12.owner?.name || ''} ${p12.owner?.week || ''}`, subColor: 'text-red', modifier: 'kpi-danger' },
  ]
})

function buildACard(c, modifier, barClass, metricsOverride) {
  const k = c.kpi
  const metrics = metricsOverride || [
    { label: '0KM PPM',  value: `${fmt(k.km0.ppm)}${k.km0.peakWeek ? ' ('+k.km0.peakWeek+')' : ''}`, colorClass: k.km0.status === 'success' ? 'text-green' : 'text-orange' },
    { label: '3MIS PPM', value: k.km3.status === 'success' ? `${fmt(k.km3.ppm)} 达标` : fmt(k.km3.ppm), colorClass: k.km3.status === 'success' ? 'text-green' : 'text-orange' },
    { label: '6MIS PPM', value: k.km6.status === 'success' ? `${fmt(k.km6.ppm)} 达标` : fmt(k.km6.ppm), colorClass: k.km6.status === 'success' ? 'text-green' : (k.km6.ppm > 0 ? 'text-red' : 'text-green') },
    { label: '12MIS PPM', value: k.km12.status === 'success' ? `${fmt(k.km12.ppm)} 达标` : fmt(k.km12.ppm), colorClass: k.km12.status === 'success' ? 'text-green' : 'text-red' },
  ]
  const statusType = c.meta.status === 'success' ? 'pass' : (c.meta.status === 'danger' ? 'fail' : 'warn')
  return {
    key: c.key, name: c.meta.name, statusType, statusText: c.meta.statusText,
    metrics, barClass, passRate: c.passRate, remark: c.meta.remark
  }
}
function fmt(v){ if (v === null || v === undefined) return 0; return Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : Number(v).toFixed(1).replace(/\.0$/,'') }

const overviewCards = computed(() => {
  return {
    aType: [
      buildACard(a1.value, 'kpi-warning', 'bar-green-orange'),
      buildACard(a2.value, 'kpi-danger',  'bar-orange-red'),
      { ...buildACard(a3.value, 'kpi-success', 'bar-green-green'),
        metrics: [
          { label: '0KM PPM', value: `${fmt(a3.value.kpi.km0.ppm)} (峰值)`, colorClass: 'text-green' },
          { label: '3MIS PPM', value: '0 达标', colorClass: 'text-green' },
          { label: '6MIS PPM', value: '0 达标', colorClass: 'text-green' },
          { label: '12MIS PPM', value: '0 达标', colorClass: 'text-green' },
        ],
      },
    ],
  }
})

const m5PeakText = computed(() => {
  if (!m5.value) return '—'
  const k = m5.value.kpi.km0
  return `${fmt(k.ppm)}${k.peakWeek ? ' ('+k.peakWeek+')' : ''}`
})
const m6AppText = computed(() => m6.value ? `${fmt(m6.value.kpi.km0.ppm)}${m6.value.kpi.km0.peakWeek ? ' ('+m6.value.kpi.km0.peakWeek+')' : ''}` : '—')
const m6PerfText = computed(() => m6.value ? (m6.value.kpi.km3.status === 'success' ? `${fmt(m6.value.kpi.km3.ppm)} 达标` : fmt(m6.value.kpi.km3.ppm)) : '—')
const m6PeakDelivery = computed(() => {
  if (!m6.value) return { value: 0, week: '' }
  let max = 0, mw = ''
  const d = m6.value.metrics.delivery?.values || {}
  Object.keys(d).forEach(w => { if (Number(d[w]) > max) { max = Number(d[w]); mw = w } })
  return { value: max, week: mw }
})

/* ========== A型详情表格 ========== */
function takeRecentWeeks(cust, n=5) {
  const wks = (cust.weeks || []).filter(w => /WK\d+/.test(w))
  return wks.slice(-n)
}
function detailWeeks(cust) {
  return takeRecentWeeks(cust, 5)
}
function detailRows(cust) {
  if (!cust) return []
  const wks = takeRecentWeeks(cust, 5)
  const last = wks[wks.length - 1]
  const getM = (key) => cust.metrics[key]?.values || {}
  return [
    mkRow('0KM故障数', getM('fail'),    wks, '—', 'primary'),
    mkRow('3MIS故障数', getM('fail3m'),  wks, '—', 'primary'),
    mkRow('6MIS故障数', getM('fail6m'),  wks, '—', 'primary'),
    mkRow('12MIS故障数',getM('fail12m'), wks, '—', 'primary'),
  ]
}
function mkRow(name, values, wks, target, status) {
  const vals = wks.map(w => values[w] ?? 0)
  return { name, weekly: vals, target, status }
}
function valColor(rowStatus, v, target) {
  if (rowStatus === 'primary') return ''
  if (Number(v) > 0) return 'text-red font'
  return 'text-green'
}
function formatVal(v) { return v ?? 0 }

/* ========== M5 详情表格 ========== */
const m5Rows = computed(() => {
  if (!m5.value) return []
  const rows = []
  const periods = [
    { key: '9月',  type: 'month' },
    ...takeRecentWeeks(m5.value, 5).map(w => ({ key: w, type: 'week' }))
  ]
  const m = m5.value.metrics
  periods.forEach(p => {
    const fail = m.fail.values[p.key] ?? 0
    const supply = m.supply.values[p.key] ?? 0
    const ppm = m.actual0km.values[p.key] ?? 0
    const target = 15
    const over = ppm > target
    rows.push({
      period: p.key, fail, supply, ppm: fmt(ppm),
      ppmColor: over ? (ppm >= 250 ? 'text-red font' : 'text-orange') : 'text-green',
      status: over ? 'fail' : 'pass', statusText: over ? '超标' : '达标',
    })
  })
  // 其余周期行（原型有，写一行汇总）
  rows.push({ period: '其余周期', fail: 0, supply: '-', ppm: 0, ppmColor: 'text-green', status: 'pass', statusText: '达标' })
  return rows
})

/* ========== M6 详情表格 ========== */
const m6TableHeaders = computed(() => ['5月','6月','7月','8月','9月','WK40','WK41','WK42','WK43','WK44'])
const m6TableRows = computed(() => {
  if (!m6.value) return []
  const headers = m6TableHeaders.value
  const mm = m6.value.metrics
  const getV = (metric, h) => mm[metric]?.values[h] ?? 0
  const colorOf = (v, target, isFail) => {
    if (isFail) return Number(v) > 0 ? 'text-red' : ''
    if (Number(v) === 0) return ''
    if (Number(v) > target) return 'text-red font'
    if (Number(v) > target*0.5) return 'text-orange'
    return 'text-green'
  }
  const targetApp = 300, targetPerf = 150
  const rows = [
    { name: '0KM-外观故障数', values: headers.map(h => getV('failApp', h)), color: headers.map(h => Number(getV('failApp', h)) > 0 ? 'text-red' : '') },
    { name: '0KM-性能故障数', values: headers.map(h => getV('failPerf', h)), color: headers.map(h => Number(getV('failPerf', h)) > 0 ? 'text-red' : '') },
    { name: '周交付量', values: headers.map(h => getV('delivery', h)), color: headers.map(h => 'text-blue font') },
    { name: '外观PPM', values: headers.map(h => fmt(getV('ppmApp', h))), color: headers.map(h => colorOf(getV('ppmApp', h), targetApp, false)) },
    { name: '性能PPM', values: headers.map(h => fmt(getV('ppmPerf', h))), color: headers.map(h => colorOf(getV('ppmPerf', h), targetPerf, false)) },
  ]
  return rows
})

/* ========== 问题分析 ========== */
const issueItems = computed(() => [
  { statusType: 'fail', statusText: '高风险', borderColor: color.danger(),
    title: 'A2客户 WK44 12MIS PPM超标',
    desc: `WK44 12MIS实际PPM达到${fmt(a2.value?.kpi.km12.ppm)}，虽未超过105PPM目标，但呈现上升趋势，需提前预警。`,
    period: 'WK44', product: 'PACK', extra: '责任待划分' },
  { statusType: 'fail', statusText: '高风险', borderColor: color.danger(),
    title: 'A4-M6(小米-N1) WK43 外观PPM异常',
    desc: `WK43外观PPM达到${fmt(m6.value?.kpi.km0.ppm)}，远超300PPM目标值，共出现7例外观故障。性能PPM ${fmt(m6.value?.kpi.km3.ppm)}，达标。详细分析见A4-M6客户详情页。`,
    period: 'WK43', product: 'M6-XM', extra: '客户：小米' },
  { statusType: 'warn', statusText: '中风险', borderColor: color.warning(),
    title: 'A1客户 WK40 0KM PPM突发异常',
    desc: `WK40 0KM实际PPM达到${fmt(a1.value?.kpi.km0.ppm)}，远超24PPM目标，出现1例故障。后续WK41-WK44恢复为0，属于偶发事件。`,
    period: 'WK40', product: 'PACK', extra: '状态：已恢复' },
  { statusType: 'warn', statusText: '中风险', borderColor: color.warning(),
    title: 'A2客户 WK40 0KM PPM异常',
    desc: `WK40 0KM实际PPM达到2597，远超24PPM目标，出现1例故障。同时25-11月6MIS PPM达到71，需关注长期质量趋势。`,
    period: '25-11月、WK40', product: 'PACK', extra: '需持续跟踪' },
  { statusType: 'warn', statusText: '中风险', borderColor: color.warning(),
    title: 'A4-M5-XP 连续多周0KM超标',
    desc: '9月PPM 214、WK41 PPM 213、WK43 PPM 270，连续出现0KM超标，虽然单周故障数仅1-2例，但供货量爬坡期需特别关注。详细分析见A4-M5客户详情页。',
    period: '9月-WK43', product: 'M5-XP(D03E)', extra: '需排查根因' },
])
const concludeItems = computed(() => [
  { name: 'A1客户', text: '0km、3mis、6mis、12mis PPM均达标；WK40偶发0KM异常已恢复', modifier: 'border-green', titleColor: 'text-green' },
  { name: 'A2客户', text: '0km、3mis、6mis达标；WK44 12MIS PPM 75.4需预警跟踪', modifier: 'border-orange', titleColor: 'text-orange' },
  { name: 'A3客户', text: '全部指标达标，质量表现优秀，为标杆客户', modifier: 'border-green', titleColor: 'text-green' },
  { name: 'A4客户', text: 'M5集成达标；M6集成功能PPM 138达标；物流责任问题已剔除不计入', modifier: 'border-blue', titleColor: 'text-blue' },
])
const suggestions = [
  { text: '重点跟踪A2客户12MIS上升趋势，提前开展质量排查，遏制恶化',       color: 'no-red' },
  { text: '针对小米N1外观问题开展专项分析，加强出厂外观检验环节',            color: 'no-orange' },
  { text: 'M5-XP量产爬坡期增加巡检频次，建立快速响应机制',                   color: 'no-orange' },
  { text: '总结A3客户质量管控经验，形成最佳实践向全客户推广',                 color: 'no-blue' },
  { text: '加强物流环节质量防护，与物流方明确质量责任划分标准',               color: 'no-green' },
]

/* ========== 交互 ========== */
function switchMainTab(key) {
  mainTab.value = key
  nextTick(resizeCharts)
}
function jumpToDetail(clientKey) {
  activeClient.value = clientKey
  mainTab.value = 'detail'
  nextTick(() => { renderAllCharts(); resizeCharts() })
}

/* ========== ECharts ========== */
function disposeAllCharts() {
  Object.values(chartInstances).forEach(c => c && c.dispose())
  Object.keys(chartInstances).forEach(k => delete chartInstances[k])
}
function initChart(refName, option) {
  const dom = chartRefs[refName]
  if (!dom) return
  let inst = chartInstances[refName]
  if (!inst) {
    inst = echarts.init(dom)
    chartInstances[refName] = inst
  }
  inst.setOption(option, true)
}
function resizeCharts() {
  Object.values(chartInstances).forEach(c => c && c.resize())
}

function renderOverviewCharts() {
  if (!a1.value || !m6.value) return
  // 0KM 趋势对比：A1/A2/M5/M6外观 —— 用月份+近5周
  const labels = ['5月','6月','7月','8月','9月','WK40','WK41','WK42','WK43','WK44']
  const pt = (metric, key) => {
    const m = metric?.values || {}
    return labels.map(l => Number(m[l] ?? 0))
  }
  const a1Series = pt(a1.value.metrics.actual0km)
  const a2Series = pt(a2.value.metrics.actual0km)
  const m5Series = pt(m5.value.metrics.actual0km)
  const m6App = pt(m6.value.metrics.ppmApp)
  initChart('overview0km', {
    ...chartTheme(),
    legend: { data: ['A1','A2','M5-XP','M6-XM外观'], top: 0 },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: 'PPM' },
    series: [
      { name: 'A1',       type: 'line', data: a1Series, smooth: true, symbol: 'circle', symbolSize: 6 },
      { name: 'A2',       type: 'line', data: a2Series, smooth: true, symbol: 'circle', symbolSize: 6 },
      { name: 'M5-XP',    type: 'line', data: m5Series, smooth: true, symbol: 'circle', symbolSize: 6 },
      { name: 'M6-XM外观',type: 'line', data: m6App,    smooth: true, symbol: 'circle', symbolSize: 6 },
    ],
  })
  // 雷达图
  initChart('overviewRadar', {
    ...chartTheme(),
    tooltip: { backgroundColor: color.tooltipBg(), borderColor: color.primary(), textStyle:{color: color.textM()} },
    legend: { data: ['A1','A2','A3','A4'], top: 0 },
    radar: {
      indicator: [
        { name:'0KM达标率',max:100},{name:'3MIS达标率',max:100},
        { name:'6MIS达标率',max:100},{name:'12MIS达标率',max:100},{name:'趋势稳定性',max:100}
      ],
      axisName: { color: color.textS() },
      splitArea: { areaStyle:{ color:['color-mix(in srgb, ' + color.primary() + ' 2%, transparent)','color-mix(in srgb, ' + color.primary() + ' 5%, transparent)']} },
      axisLine: { lineStyle:{color: color.border()} }
    },
    series: [{
      type:'radar',
      data: [
        { value:[70,100,100,95,75], name:'A1', areaStyle:{opacity:0.1} },
        { value:[60,95,70,60,55],   name:'A2', areaStyle:{opacity:0.1} },
        { value:[95,100,100,100,100],name:'A3',areaStyle:{opacity:0.1} },
        { value:[75,100,100,100,80],name:'A4',areaStyle:{opacity:0.1} },
      ]
    }]
  })
}

function renderADetailCharts(cust) {
  if (!cust) return
  // 合并 months + weeks 作为 X 轴
  const allLabels = [...(cust.months || []), ...(cust.weeks || [])]
  // 为 0KM 渲染双轴柱+线
  const buildPeriodChart = (pkey, yMax) => {
    const f = PERIOD_FIELD[pkey]
    const supplyArr = allLabels.map(l => Number(cust.metrics[f.supply]?.values[l] ?? 0))
    const failArr   = allLabels.map(l => Number(cust.metrics[f.fail]?.values[l] ?? 0))
    const targetArr = allLabels.map(l => Number(cust.metrics[f.target]?.values[l] ?? f.targetDefault))
    const actualArr = allLabels.map(l => Number(cust.metrics[f.actual]?.values[l] ?? 0))
    const rotate = allLabels.length > 14 ? 45 : 0
    return {
      ...chartTheme(),
      tooltip: { trigger:'axis', backgroundColor: color.tooltipBg(), borderColor: color.primary(), textStyle:{color:color.textM()} },
      legend: { data:['供货数','故障数',f.label.replace('PPM','目标'),f.label.replace('PPM','实际')], top:0, textStyle:{fontSize:10, color: color.textS()} },
      xAxis: { type:'category', data: allLabels, axisLabel:{ rotate, fontSize: 9 } },
      yAxis: [
        { type:'value', name:'供货数', position:'left' },
        { type:'value', name:'PPM',   position:'right', max: yMax },
      ],
      series: [
        { name:'供货数', type:'bar', data: supplyArr, yAxisIndex:0, itemStyle:{color: color.primary()} },
        { name:'故障数', type:'bar', data: failArr,   yAxisIndex:0, itemStyle:{color: color.danger()} },
        { name: f.label.replace('PPM','目标'), type:'line', data: targetArr, yAxisIndex:1,
          lineStyle:{color: color.primaryL(), width:2}, symbol:'none' },
        { name: f.label.replace('PPM','实际'), type:'line', data: actualArr, yAxisIndex:1,
          lineStyle:{color: color.danger(),    width:2}, symbolSize: 6 },
      ]
    }
  }
  initChart(`chart-${cust.key}-km0`,  buildPeriodChart('km0',  4000))
  initChart(`chart-${cust.key}-km3`,  buildPeriodChart('km3',  10))
  initChart(`chart-${cust.key}-km6`,  buildPeriodChart('km6',  400))
  initChart(`chart-${cust.key}-km12`, buildPeriodChart('km12', 150))
}

function renderM5Chart() {
  if (!m5.value) return
  const periods = ['26-3月','4月','5月','6月','7月','8月','9月','WK40','WK41','WK42','WK43','WK44']
  const mm = m5.value.metrics
  const get = (k) => periods.map(p => Number(mm[k]?.values[p] ?? 0))
  initChart('m5-0km', {
    ...chartTheme(),
    legend:{ data:['供货数','故障数','0KM目标','0KM实际'], top:0 },
    xAxis:{ type:'category', data: periods },
    yAxis:[
      { type:'value', name:'供货数', position:'left' },
      { type:'value', name:'PPM', position:'right', max: 500 },
    ],
    series:[
      { name:'供货数', type:'bar', data: get('supply'),    yAxisIndex:0, itemStyle:{color: color.primary()} },
      { name:'故障数', type:'bar', data: get('fail'),      yAxisIndex:0, itemStyle:{color: color.danger()} },
      { name:'0KM目标',type:'line',data: periods.map(()=>15), yAxisIndex:1, lineStyle:{color: color.primaryL(),width:2}, symbol:'none' },
      { name:'0KM实际',type:'line',data: get('actual0km'), yAxisIndex:1, lineStyle:{color: color.danger(),width:2}, symbolSize:8 },
    ]
  })
}
function renderM6Chart() {
  if (!m6.value) return
  const labels = ['5月','6月','7月','8月','9月','WK40','WK41','WK42','WK43','WK44']
  const mm = m6.value.metrics
  const get = (k) => labels.map(l => Number(mm[k]?.values[l] ?? 0))
  initChart('m6-0km', {
    ...chartTheme(),
    legend:{ data:['周交付','PPM-外观','PPM-性能','目标-外观','目标-性能'], top:0, textStyle:{fontSize:10, color:color.textS()} },
    xAxis:{ type:'category', data: labels },
    yAxis:[
      { type:'value', name:'交付量', position:'left' },
      { type:'value', name:'PPM', position:'right', max: 1500 },
    ],
    series:[
      { name:'周交付',  type:'bar', data: get('delivery'), yAxisIndex:0, itemStyle:{color: color.accent()} },
      { name:'PPM-外观',type:'line',data: get('ppmApp'),   yAxisIndex:1, lineStyle:{color: color.danger(),width:2}, symbolSize:8 },
      { name:'PPM-性能',type:'line',data: get('ppmPerf'),  yAxisIndex:1, lineStyle:{color: color.warning(),width:2}, symbolSize:8 },
      { name:'目标-外观',type:'line',data: labels.map(()=>300), yAxisIndex:1, lineStyle:{color: color.danger(),width:1,type:'dashed'}, symbol:'none' },
      { name:'目标-性能',type:'line',data: labels.map(()=>150), yAxisIndex:1, lineStyle:{color: color.warning(),width:1,type:'dashed'}, symbol:'none' },
    ]
  })
}

function renderIssueCharts() {
  initChart('issueType', {
    ...chartTheme(),
    tooltip:{ trigger:'item', backgroundColor: color.tooltipBg(), borderColor: color.primary(), textStyle:{color: color.textM()} },
    series:[{
      type:'pie', radius:['40%','70%'], avoidLabelOverlap:false,
      itemStyle:{ borderRadius:8, borderColor: color.cardBg(), borderWidth:2 },
      label:{ show:true, formatter:'{b}: {d}%' },
      data:[
        { value:3, name:'0KM异常', itemStyle:{color: color.danger()} },
        { value:1, name:'MIS上升', itemStyle:{color: color.warning()} },
        { value:1, name:'外观问题', itemStyle:{color: color.primary()} },
        { value:1, name:'供应链问题',itemStyle:{color: color.accent()} },
      ]
    }]
  })
  initChart('risk', {
    ...chartTheme(),
    tooltip:{ backgroundColor: color.tooltipBg(), borderColor: color.primary(), textStyle:{color: color.textM()} },
    grid:{ left:'5%', right:'12%', bottom:'3%', top:'3%', containLabel:true },
    xAxis:{ type:'value', max:100, axisLabel:{formatter:'{value}分'} },
    yAxis:{ type:'category', data:['A3客户','A1客户','A4客户','A2客户'] },
    series:[{
      type:'bar', barWidth:20, label:{show:true, position:'right', formatter:'{c}分', color: color.textM()},
      data:[
        { value:95, itemStyle:{color: color.primaryL()} },
        { value:75, itemStyle:{color: color.warning()} },
        { value:72, itemStyle:{color: color.warning()} },
        { value:55, itemStyle:{color: color.danger()} },
      ]
    }]
  })
}

function renderAllCharts() {
  renderOverviewCharts()
  if (currentA.value) renderADetailCharts(currentA.value)
  if (activeClient.value === 'M5') renderM5Chart()
  if (activeClient.value === 'M6') renderM6Chart()
  renderIssueCharts()
}

/* 主题切换时重绘所有图表 */
const themeStore = useThemeStore()
watch(() => themeStore.currentTheme, () => {
  nextTick(renderAllCharts)
})

/* 客户切换时重绘当前详情 */
let _stopWatch = null
onMounted(async () => {
  try {
    loading.value = true
    const d = await loadPackData()
    Object.assign(packData, d)
    loading.value = false
    await nextTick()
    renderAllCharts()
    _stopWatch = setInterval(resizeCharts, 1500)
    window.addEventListener('resize', resizeCharts)
  } catch (e) {
    console.error(e)
    loadError.value = e.message || '未知错误'
    loading.value = false
  }
})
onBeforeUnmount(() => {
  if (_stopWatch) clearInterval(_stopWatch)
  window.removeEventListener('resize', resizeCharts)
  disposeAllCharts()
})

watch(activeClient, async () => {
  await nextTick()
  // 统一清理所有旧图表实例，然后渲染当前需要的
  disposeAllCharts()
  if (currentA.value) renderADetailCharts(currentA.value)
  if (activeClient.value === 'M5') renderM5Chart()
  if (activeClient.value === 'M6') renderM6Chart()
  resizeCharts()
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss';

.pack-screen {
  padding: $spacing-md;
  background: transparent;
  overflow-y: auto;
  height: 100%;
}

/* ============ 主Tab ============ */
.pack-main-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
}
.pack-tab-btn {
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-weight: 600;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-body);
  cursor: pointer;
  transition: all .25s;
  box-shadow: var(--shadow-card);
  .icon { margin-right: 6px; }
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    color: #fff;
    border-color: transparent;
  }
}
.pack-content { min-height: 0; }
.pack-tab-panel { animation: fadeIn .4s ease; }
@keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
.p-loading { padding: 40px; text-align: center; color: var(--text-sec); }

/* ============ KPI ============ */
.pack-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: $spacing-md;
  margin-bottom: $spacing-md;
  @media (max-width: 900px) { grid-template-columns: repeat(2,1fr); }
}
.pack-kpi-card {
  padding: $spacing-md $spacing-lg;
  border-radius: $radius-lg;
  background: var(--color-bg-card);
  border-left: 4px solid var(--color-primary);
  transition: all .3s;
  box-shadow: var(--shadow-card);
  &:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
  &.kpi-success { border-left-color: var(--color-success); background: color-mix(in srgb, var(--color-success) 6%, var(--color-bg-card)); }
  &.kpi-warning { border-left-color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 6%, var(--color-bg-card)); }
  &.kpi-danger  { border-left-color: var(--color-danger);  background: color-mix(in srgb, var(--color-danger) 6%, var(--color-bg-card)); }
  .kpi-label { font-size: $font-sm; color: var(--text-sec); margin-bottom: $spacing-xs; }
  .kpi-value { font-size: 2rem; font-weight: 900; color: var(--text-main); line-height: 1.1; }
  .kpi-sub   { font-size: $font-xs; margin-top: $spacing-xs; }
  &.kpi-success .kpi-value { color: var(--color-success); }
  &.kpi-warning .kpi-value { color: var(--color-warning); }
  &.kpi-danger  .kpi-value { color: var(--color-danger); }
}
.text-green  { color: var(--color-success); }
.text-orange { color: var(--color-warning); }
.text-red    { color: var(--color-danger); }
.text-blue   { color: var(--color-primary); }
.font        { font-weight: 600; }

/* ============ 客户概览卡片 ============ */
.pack-client-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: $spacing-md;
  margin-bottom: $spacing-md;
  @media (max-width: 1100px) { grid-template-columns: repeat(2,1fr); }
}
.pack-client-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  cursor: pointer;
  transition: all .25s;
  box-shadow: var(--shadow-card);
  &:hover { transform: scale(1.01); border-color: var(--color-primary); }
  &.selected { border-color: var(--color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent); }
}
.cc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-md; }
.cc-name { font-size: $font-lg; font-weight: 700; color: var(--text-main); margin: 0; }
.cc-status {
  padding: 4px 12px; border-radius: 20px; font-size: $font-xs; font-weight: 600; display: inline-block;
  &.status-pass { background: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success); }
  &.status-warn { background: var(--color-warning-bg);  color: var(--color-warning); border: 1px solid var(--color-warning); }
  &.status-fail { background: var(--color-danger-bg);  color: var(--color-danger);  border: 1px solid var(--color-danger); }
}
.cc-metrics { display: flex; flex-direction: column; gap: $spacing-xs; }
.cc-row { display: flex; justify-content: space-between; font-size: $font-sm; }
.cc-row--sub { padding-left: $spacing-sm; }
.cc-label { color: var(--text-sec); }
.cc-val { font-weight: 600; }
.cc-sub-title { color: var(--color-primary); font-weight: 600; font-size: $font-sm; margin-top: $spacing-xs; &.mt { margin-top: $spacing-sm; } }
.cc-bar { height: 4px; background: var(--color-bg-soft); border-radius: 99px; overflow: hidden; margin-top: $spacing-md; }
.cc-bar-fill { height: 100%; border-radius: 99px;
  &.bar-green-orange { background: linear-gradient(90deg,var(--color-accent),var(--color-primary)); }
  &.bar-orange-red    { background: linear-gradient(90deg,var(--color-warning),var(--color-danger)); }
  &.bar-green-green   { background: linear-gradient(90deg,color-mix(in srgb, var(--color-success) 60%, #ffffff),var(--color-success)); width: 95%; }
  &.bar-green-yellow  { background: linear-gradient(90deg,var(--color-accent),var(--color-primary)); }
}
.cc-remark { font-size: $font-xs; color: var(--text-muted); margin-top: $spacing-xs; }

/* ============ 图表卡片 ============ */
.pack-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: $spacing-md;
}
.pack-chart-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  box-shadow: var(--shadow-card);
  &.mb { margin-bottom: $spacing-md; }
}
.chart-title {
  font-size: $font-md;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: $spacing-md;
  display: flex; align-items: center; gap: $spacing-sm;
}
.chart-bar { width: 4px; height: 20px; background: linear-gradient(180deg,var(--color-primary),var(--color-accent)); border-radius: 2px; display: inline-block; }
.chart-box-h300 { height: 300px; }
.chart-box-h280 { height: 280px; }
.chart-box-h250 { height: 250px; }

/* ============ 客户详情Tab ============ */
.pack-client-tabs {
  display: flex; gap: $spacing-sm; margin-bottom: $spacing-md; flex-wrap: wrap;
}
.client-tab-btn {
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-weight: 600;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-body);
  cursor: pointer;
  transition: all .25s;
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: linear-gradient(90deg,var(--color-primary),var(--color-accent));
    color: #fff;
    border-color: transparent;
  }
}
.pack-detail-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-md;
  box-shadow: var(--shadow-card);
}
.detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-md; }
.detail-title { font-size: $font-lg; font-weight: 700; color: var(--text-main); margin: 0; }
.detail-chart-grid {
  display: grid; grid-template-columns: repeat(2,1fr); gap: $spacing-lg;
  .detail-chart-block:nth-child(n+3) { margin-top: $spacing-lg; }
}
.detail-chart-grid--wide { display: grid; grid-template-columns: 1fr; gap: $spacing-md; }
.detail-chart-block {
  &.full { grid-column: 1/-1; }
}
.detail-sub-title {
  font-size: $font-md; font-weight: 600; color: var(--color-primary);
  margin: 0 0 $spacing-sm 0;
}
.detail-table-wrap { margin-top: $spacing-lg; overflow-x: auto; }
.pack-data-table {
  width: 100%; border-collapse: collapse;
  th { background: var(--color-bg-soft); padding: 10px 8px; text-align: center; font-weight: 600; font-size: $font-sm; color: var(--color-text-primary); border-bottom: 1px solid var(--border-color); }
  td { padding: 8px; text-align: center; font-size: $font-sm; color: var(--text-body); border-bottom: 1px solid var(--color-border-light); }
  tr:hover td { background: var(--color-bg-soft); }
  td.tl { text-align: left; color: var(--text-main); font-weight: 600; }
}

/* M6 指标块 */
.m6-metrics { display: flex; flex-direction: column; gap: $spacing-md; padding-top: $spacing-md; }
.m6-metric-item {
  padding: $spacing-md; background: var(--color-bg-soft); border: 1px solid var(--border-color); border-radius: $radius-md;
}
.m6-m-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-xs; color: var(--text-body); font-size: $font-sm; }
.m6-val { font-weight: 700; font-size: $font-xl; }
.m6-bar { height: 8px; background: var(--color-bg-soft); border-radius: 99px; overflow: hidden; }
.m6-bar-fill { height: 100%; border-radius: 99px;
  &.bar-red   { background: var(--color-danger); }
  &.bar-green { background: var(--color-success); }
  &.bar-blue  { background: var(--color-primary); }
}
.m6-sub { font-size: $font-xs; color: var(--text-muted); margin-top: $spacing-xs; }

.detail-note {
  margin-top: $spacing-lg;
  padding: $spacing-md;
  border-radius: $radius-md;
  border: 1px solid;
  &.note-blue   { background: var(--color-info-bg);  border-color: var(--color-primary);  h4 { color: var(--color-primary); } }
  &.note-yellow { background: var(--color-warning-bg);  border-color: var(--color-warning);  h4 { color: var(--color-warning); } }
  &.note-green  { background: var(--color-success-bg); border-color: var(--color-success); h4 { color: var(--color-success); } }
  &.mt { margin-top: $spacing-md; }
  h4 { font-weight: 700; margin: 0 0 $spacing-xs 0; font-size: $font-md; }
  p, li { color: var(--text-body); font-size: $font-sm; line-height: 1.6; margin: 0 0 $spacing-xs 0; }
  ul { padding-left: $spacing-md; margin: 0; }
}

/* ============ 问题分析 ============ */
.pack-issues-grid { display: grid; grid-template-columns: 2fr 1fr; gap: $spacing-lg; }
.issues-left, .issues-right { display: flex; flex-direction: column; }
.section-title { font-size: $font-lg; font-weight: 700; color: var(--text-main); margin: 0 0 $spacing-md 0; display: flex; align-items: center; gap: $spacing-sm;
  &.sm { font-size: $font-md; }
}
.issue-list { display: flex; flex-direction: column; gap: $spacing-md; }
.issue-item {
  border-left: 3px solid var(--color-warning);
  padding-left: $spacing-md;
  transition: all .25s;
  padding: $spacing-xs 0 $spacing-xs $spacing-md;
  &:hover { background: var(--color-bg-hover); padding-left: 16px; }
}
.issue-head { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.issue-head h4 { margin: 0; font-weight: 700; color: var(--text-main); font-size: $font-md; }
.issue-desc { color: var(--text-body); font-size: $font-sm; margin: 0 0 $spacing-xs 0; line-height: 1.5; }
.issue-meta { color: var(--text-muted); font-size: $font-xs; margin: 0; }

.conclude-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: $spacing-md; }
.conclude-card {
  padding: $spacing-md; border-radius: $radius-md; background: var(--color-bg-soft); border-left: 4px solid;
  h4 { font-weight: 700; margin: 0 0 $spacing-xs 0; font-size: $font-md; }
  p { color: var(--text-body); font-size: $font-sm; margin: 0; line-height: 1.5; }
  &.border-green  { border-left-color: var(--color-success); h4 { color: var(--color-success); } }
  &.border-orange { border-left-color: var(--color-warning); h4 { color: var(--color-warning); } }
  &.border-blue   { border-left-color: var(--color-primary); h4 { color: var(--color-primary); } }
}

.suggest-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.suggest-item { display: flex; gap: $spacing-sm; align-items: flex-start; font-size: $font-sm; color: var(--text-body); }
.suggest-no {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: $font-sm;
  &.no-red    { background: var(--color-danger-bg); color: var(--color-danger); }
  &.no-orange { background: var(--color-warning-bg); color: var(--color-warning); }
  &.no-blue   { background: var(--color-info-bg); color: var(--color-primary); }
  &.no-green  { background: rgba(14,116,144,0.12); color: var(--color-success); }
}

@media (max-width: 1100px) {
  .pack-chart-grid, .pack-issues-grid, .conclude-grid { grid-template-columns: 1fr; }
  .detail-chart-grid { grid-template-columns: 1fr; }
}
</style>
