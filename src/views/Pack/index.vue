<template>
  <div class="home-screen pack-screen">
    <ScreenHeader title="PACK客户质量表现" :sub-title="`CALB 中创新航 | 数据截止：${packData.asOf} | 实时监控`" />

    <!-- 加载态 -->
    <div v-if="loading" class="p-loading">数据加载中...</div>
    <div v-else-if="loadError" class="p-loading">数据加载失败：{{ loadError }}</div>

    <template v-else-if="packData.customers.length">
      <!-- 顶部 KPI 行：用 StatCardRow + NewStatCard -->
      <StatCardRow class="pack-kpi-row" :gap="14" :min-card-width="180" :max-card-width="340">
        <NewStatCard
          v-for="k in kpiCards"
          :key="k.key"
          :title="k.title"
          :value="k.value"
          :unit="k.unit"
          :sub-title="k.subTitle"
          :status="k.status"
          :theme="'kpi-side'"
          :icon-type="k.icon"
          size="small"
        />
      </StatCardRow>

      <!-- 客户切换 Tabs（原型：A1/A2/A3/A4 横向切换，这里按实际数据 A1/A2/A3/M5/M6） -->
      <div class="pack-client-tabs">
        <div
          v-for="c in packData.customers"
          :key="c.key"
          class="client-tab"
          :class="{
            active: activeClient === c.key,
            [`status-${c.meta.status}`]: true
          }"
          @click="activeClient = c.key"
        >
          <span class="client-name">{{ c.meta.name }}</span>
          <StatusTag
            :type="statusTypeMap[c.meta.status]"
            effect="plain"
            size="small"
            :text="c.meta.statusText"
          />
        </div>
      </div>

      <!-- 选中客户的主展示区：左-客户质量卡 + 关键指标；右-趋势图/详细数据 -->
      <div class="pack-main">
        <!-- 左列：客户质量卡 + 关键指标 -->
        <div class="pack-main__left">
          <!-- 客户质量卡（复用 CustomerQualityCard） -->
          <CustomerQualityCard
            :title="current.meta.fullName"
            :status="cardStatusMap[current.meta.status]"
            :status-text="current.meta.statusText"
            :metrics="clientCardMetrics"
            :progress="current.passRate"
            :remark="current.meta.remark"
            :sections="cardSections"
            layout="standard"
            theme="dark"
          />

          <!-- 风险/关键异常 -->
          <ScreenCard title="关键异常数据" class="pack-risk-card">
            <div class="risk-list">
              <div v-for="(r,i) in riskItems" :key="i" class="risk-item">
                <StatusTag :type="r.type" effect="solid" size="small" :text="r.level" />
                <div class="risk-body">
                  <div class="risk-title">{{ r.title }}</div>
                  <div class="risk-meta">影响周期：{{ r.period }} | {{ r.desc }}</div>
                </div>
              </div>
              <div v-if="!riskItems.length" class="risk-empty">✓ 暂无关键异常，整体达标</div>
            </div>
          </ScreenCard>
        </div>

        <!-- 右列：四个周期 Tabs + 趋势图 + 详细数据入口 -->
        <div class="pack-main__right">
          <ScreenCard :title="`${current?.meta?.name} - 质量表现详情`" class="pack-trend-card">
            <Tabs v-model="activePeriod" type="segment" stretch>
              <TabPane v-for="p in periods" :key="p.key" :label="p.label" :name="p.key">
                <div class="trend-chart-wrap">
                  <BaseChart :option="trendOption(p.key)"  />
                </div>
              </TabPane>
            </Tabs>

            <!-- 关键数据 -->
            <div class="trend-kpi">
              <div v-for="item in periodKPI" :key="item.label" class="trend-kpi__item">
                <div class="trend-kpi__label">{{ item.label }}</div>
                <div class="trend-kpi__value" :class="`is-${item.status}`">
                  <NumberCounter :value="item.value" :decimals="item.decimals" />
                  <span class="trend-kpi__unit">{{ item.unit }}</span>
                </div>
                <div class="trend-kpi__sub">{{ item.sub }}</div>
              </div>
            </div>
          </ScreenCard>

          <!-- 下方：周交付量柱状图 + 查看详情按钮 -->
          <div class="pack-bottom">
            <ScreenCard title="周交付量趋势" class="pack-supply-card">
              <BaseChart :option="supplyOption"  />
            </ScreenCard>
            <div class="pack-detail-btn-wrap">
              <button class="pack-detail-btn" @click="showDetail = true">
                <span class="pack-detail-btn__icon">📊</span>
                <span>查看详细数据表</span>
              </button>
              <div class="pack-summary">{{ current.meta.risk }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 详情弹层 -->
    <Dialog
      v-model="showDetail"
      :title="`${current?.meta?.name} - 质量表现详情`"
      width="88%"
      :close-on-click-modal="true"
    >
      <PackDetail :customer="current" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import Tabs from '@/components/common/Tabs.vue'
import TabPane from '@/components/common/TabPane.vue'
import Dialog from '@/components/common/Dialog.vue'
import CustomerQualityCard from '@/components/common/CustomerQualityCard.vue'
import NumberCounter from '@/components/data/NumberCounter.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import PackDetail from './PackDetail.vue'
import { loadPackData, buildDetailTable, judgeStatus } from '@/utils/parsePack.js'
import { getCssVar } from '@/utils/color.js'

const loading = ref(true)
const loadError = ref('')
const packData = ref({ customers: [], asOf: '', totalCustomers: 0, passCustomers: 0, warningCustomers: 0, dangerCustomers: 0, peak0km: null, peak3m: null, peak12m: null })
const activeClient = ref('A1')
const activePeriod = ref('km0')
const showDetail = ref(false)

// 周期 Tabs：M6 为「外观 / 性能」两维，A 型为 0KM/3MIS/6MIS/12MIS 四期
const periods = computed(() => (current.value && current.value.isM6)
  ? [
      { key: 'km0', label: '外观PPM推移' },
      { key: 'km3', label: '性能PPM推移' },
    ]
  : [
      { key: 'km0', label: '0KM客诉统计推移图' },
      { key: 'km3', label: '3MIS客诉统计推移图' },
      { key: 'km6', label: '6MIS客诉统计推移图' },
      { key: 'km12', label: '12MIS客诉统计推移图' },
    ])

// status 映射（CustomerQualityCard 支持 attention/warning/success/custom）
const cardStatusMap = {
  success: 'success', attention: 'attention', warning: 'warning', danger: 'warning', primary: 'attention'
}
const statusTypeMap = {
  success: 'success', attention: 'warning', warning: 'warning', danger: 'danger', primary: 'info'
}

// 顶部 KPI（贴合原型：监控客户数 + 0KM/3MIS/12MIS PPM 峰值）
const peakSub = (key) => {
  const p = packData.value[key]
  if (!p || !p.owner) return '暂无数据'
  return `出现在 ${p.owner.name} ${p.owner.week || ''}`
}
const kpiCards = computed(() => [
  { key: 'cnt', title: '监控客户数量', value: packData.value.totalCustomers, unit: '个',
    subTitle: '全部客户纳入监控', status: 'primary', icon: 'customer' },
  { key: 'p0', title: '0KM PPM 峰值', value: packData.value.peak0km?.value || 0, unit: 'PPM',
    subTitle: peakSub('peak0km'), status: 'danger', icon: 'alert' },
  { key: 'p3', title: '3MIS PPM 峰值', value: packData.value.peak3m?.value || 0, unit: 'PPM',
    subTitle: peakSub('peak3m'), status: 'warning', icon: 'warn' },
  { key: 'p12', title: '12MIS PPM 峰值', value: packData.value.peak12m?.value || 0, unit: 'PPM',
    subTitle: peakSub('peak12m'), status: 'success', icon: 'check' },
])

const current = computed(() => packData.value.customers.find(c => c.key === activeClient.value) || packData.value.customers[0])

// 客户卡 metrics（主指标 0KM/3MIS/6MIS/12MIS PPM）
const clientCardMetrics = computed(() => {
  const k = current.value.kpi
  return [
    { label: '0KM PPM', value: `${Math.round(k.km0.ppm)}`, unit: 'PPM', highlight: k.km0.status !== 'success',
      subLabel: `目标 ${k.km0.target}` },
    { label: '3MIS PPM', value: `${Math.round(k.km3.ppm)}`, unit: 'PPM', highlight: k.km3.status !== 'success',
      subLabel: `目标 ${k.km3.target}` },
  ]
})
const cardSections = computed(() => {
  const k = current.value.kpi
  return [
    {
      title: '中长期MIS表现',
      items: [
        { label: '6MIS PPM', value: `${Math.round(k.km6.ppm)}`, unit: 'PPM', highlight: k.km6.status !== 'success' },
        { label: '12MIS PPM', value: `${Math.round(k.km12.ppm)}`, unit: 'PPM', highlight: k.km12.status !== 'success' },
      ]
    },
    {
      title: '近12周累计',
      items: [
        { label: '0KM故障', value: `${k.km0.fail}`, unit: '件', highlight: k.km0.fail > 0 },
        { label: '12MIS故障', value: `${k.km12.fail}`, unit: '件', highlight: k.km12.fail > 0 },
      ]
    }
  ]
})

// 风险项（根据 status 生成，或从 note 提取）
const riskItems = computed(() => {
  const c = current.value
  const items = []
  if (c.meta.status === 'danger') {
    items.push({ level: '高风险', type: 'danger', title: c.meta.remark, period: 'WK44', desc: '目标值超标，需重点改善' })
  } else if (c.meta.status === 'warning') {
    items.push({ level: '中风险', type: 'warning', title: '12MIS 接近目标线', period: 'WK43-WK44', desc: c.meta.remark })
  } else if (c.meta.status === 'attention') {
    const pk = c.kpi.km0
    items.push({ level: '关注', type: 'warning',
      title: `0KM PPM 峰值 ${Math.round(pk.ppm)}（${pk.peakWeek || '—'}）`,
      period: pk.peakWeek || '—', desc: c.meta.remark })
  }
  if (c.note) {
    items.push({ level: '偏差', type: 'info', title: c.note.slice(0, 40), period: '—', desc: c.note.length > 40 ? '...' : '供应商责任，未计入' })
  }
  return items
})

// 当前周期的 KPI（右列）
const periodKPI = computed(() => {
  const k = current.value.kpi[activePeriod.value]
  return [
    { label: `${k.label} - 实际`, value: k.ppm, decimals: 0, unit: 'PPM', status: k.status, sub: `目标 ${k.target} PPM` },
    { label: '周期内故障数', value: k.fail, decimals: 0, unit: '件', status: k.fail > 0 ? 'warning' : 'success', sub: `近${k.weeks}周累计` },
    { label: '周期内供货数', value: k.supply, decimals: 0, unit: '件', status: 'primary', sub: '同口径窗口' },
    { label: '整体达标率', value: current.value.passRate, decimals: 0, unit: '%', status: current.value.passRate >= 85 ? 'success' : 'warning', sub: '4个周期综合' },
  ]
})

// 趋势图
function trendOption(period) {
  const pkey = period // km0/km3/km6/km12
  const actualKey = `actual${pkey === 'km0' ? '0km' : pkey.charAt(0).toUpperCase() + pkey.slice(1)}`
  const targetKey = `target${pkey === 'km0' ? '0km' : pkey.charAt(0).toUpperCase() + pkey.slice(1)}`
  const labels = current.value.trend.labels
  const actual = current.value.trend.series[actualKey] || []
  const target = current.value.trend.series[targetKey] || []
  const cColor = getCssVar('--color-primary', '#2F7CFF')
  const cDanger = getCssVar('--color-danger', '#FF4D4F')
  const cText = getCssVar('--text-main', '#fff')
  const cGrid = 'rgba(255,255,255,0.08)'
  return {
    grid: { top: 20, left: 50, right: 20, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: cText, fontSize: 11 }, top: 0, right: 10 },
    xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: cGrid } }, axisLabel: { color: cText, fontSize: 10 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: cGrid } }, axisLabel: { color: cText, fontSize: 10 } },
    series: [
      { name: '实际PPM', type: 'line', smooth: true, data: actual,
        itemStyle: { color: cColor }, lineStyle: { width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: cColor + '66' }, { offset: 1, color: cColor + '00' }] } } },
      { name: '目标PPM', type: 'line', data: target,
        itemStyle: { color: cDanger }, lineStyle: { width: 1.5, type: 'dashed' } },
    ]
  }
}

// 周交付柱状图（M6 用「周交付」指标，A 型用「供货数」）
const supplyOption = computed(() => {
  const isM6 = current.value.isM6
  const weeks = current.value.weeks.slice(-12)
  const metric = isM6 ? current.value.metrics.delivery : current.value.metrics.supply
  const supply = weeks.map(w => Number((metric && metric.values[w]) || 0))
  const cColor = getCssVar('--color-success', '#00C292')
  const cText = getCssVar('--text-main', '#fff')
  const cGrid = 'rgba(255,255,255,0.08)'
  return {
    grid: { top: 20, left: 50, right: 10, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: weeks, axisLine: { lineStyle: { color: cGrid } }, axisLabel: { color: cText, fontSize: 10 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: cGrid } }, axisLabel: { color: cText, fontSize: 10 } },
    series: [{ name: '周交付量', type: 'bar', data: supply, barWidth: '50%',
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: cColor }, { offset: 1, color: cColor + '55' }] }, borderRadius: [3,3,0,0] } }]
  }
})

// 切换客户时回到第一个周期，避免停留在 M6 不存在的周期
watch(activeClient, () => { activePeriod.value = 'km0' })

onMounted(async () => {
  try {
    packData.value = await loadPackData()
  } catch (e) {
    console.error('[Pack] 数据加载失败', e)
    loadError.value = (e && e.message) ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pack-screen {
  padding: 0 15px 15px;
  height: calc(100% - 44px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.p-loading {
  flex:1; display:flex; align-items:center; justify-content:center;
  color: var(--text-sub, rgba(255,255,255,0.6));
  font-size: 14px;
}
.pack-kpi-row {
  margin-bottom: 12px;
  flex-shrink:0;
}

/* 客户 Tabs */
.pack-client-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink:0;
}
.client-tab {
  padding: 10px 18px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all .25s;
  min-width: 120px;
}
.client-tab:hover { background: rgba(255,255,255,0.09); }
.client-tab.active {
  background: linear-gradient(135deg, rgba(47,124,255,0.25), rgba(47,124,255,0.05));
  border-color: var(--color-primary, #2F7CFF);
  box-shadow: 0 0 20px rgba(47,124,255,0.25);
}
.client-tab.status-danger.active {
  background: linear-gradient(135deg, rgba(255,77,79,0.25), rgba(255,77,79,0.05));
  border-color: var(--color-danger, #FF4D4F);
  box-shadow: 0 0 20px rgba(255,77,79,0.25);
}
.client-tab.status-warning.active {
  background: linear-gradient(135deg, rgba(250,173,20,0.25), rgba(250,173,20,0.05));
  border-color: var(--color-warning, #FAAD14);
  box-shadow: 0 0 20px rgba(250,173,20,0.25);
}
.client-tab.status-success.active {
  background: linear-gradient(135deg, rgba(0,194,146,0.25), rgba(0,194,146,0.05));
  border-color: var(--color-success, #00C292);
  box-shadow: 0 0 20px rgba(0,194,146,0.25);
}
.client-name {
  font-size: 14px; font-weight: 600; color: var(--text-main, #fff);
}

/* 主区：左右分栏 */
.pack-main {
  flex: 1;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 14px;
  min-height: 0;
}
.pack-main__left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.pack-main__right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* 风险卡 */
.pack-risk-card { flex: 1; min-height: 0; overflow: hidden; }
.pack-risk-card :deep(.screen-card__body) { padding: 12px 14px; overflow: auto; }
.risk-list { display: flex; flex-direction: column; gap: 10px; }
.risk-item {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 10px; background: rgba(255,255,255,0.03);
  border-radius: 6px; border-left: 3px solid currentColor;
}
.risk-body { flex:1; min-width:0; }
.risk-title { font-size: 13px; color: var(--text-main, #fff); font-weight: 500; margin-bottom: 4px; }
.risk-meta { font-size: 11px; color: var(--text-sub, rgba(255,255,255,0.6)); }
.risk-empty { text-align: center; color: var(--color-success, #00C292); font-size: 13px; padding: 30px 0; }

/* 趋势区 */
.pack-trend-card { flex: 1; min-height: 0; }
.trend-chart-wrap { width:100%; padding-top: 8px; }
.trend-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.trend-kpi__item {
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  padding: 8px 10px;
}
.trend-kpi__label { font-size: 11px; color: var(--text-sub, rgba(255,255,255,0.6)); margin-bottom: 4px; }
.trend-kpi__value {
  font-size: 20px; font-weight: 700; color: var(--text-main, #fff);
  display: flex; align-items: baseline; gap: 3px;
}
.trend-kpi__value.is-danger { color: var(--color-danger, #FF4D4F); }
.trend-kpi__value.is-warning { color: var(--color-warning, #FAAD14); }
.trend-kpi__value.is-success { color: var(--color-success, #00C292); }
.trend-kpi__unit { font-size: 11px; font-weight: 400; color: var(--text-sub, rgba(255,255,255,0.6)); }
.trend-kpi__sub { font-size: 10px; color: var(--text-sub, rgba(255,255,255,0.5)); margin-top: 3px; }

/* 下方 */
.pack-bottom {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
  flex-shrink: 0;
}
.pack-supply-card { min-height: 0; }
.pack-detail-btn-wrap {
  display: flex; flex-direction: column; gap: 10px;
}
.pack-detail-btn {
  flex: 1;
  background: linear-gradient(135deg, var(--color-primary, #2F7CFF), rgba(47,124,255,0.6));
  border: none; color: #fff; border-radius: 8px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .25s;
}
.pack-detail-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47,124,255,0.4); }
.pack-detail-btn__icon { font-size: 20px; }
.pack-summary {
  background: rgba(255,255,255,0.04);
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  color: var(--text-sub, rgba(255,255,255,0.7));
  line-height: 1.5;
}
</style>
