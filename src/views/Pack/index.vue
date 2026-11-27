<template>
  <div class="home-screen pack-screen">
    <ScreenHeader title="PACK客户质量表现监控大屏" :sub-title="`CALB 中创新航 | 数据截止：${packData.asOf} | 实时监控`" />

    <div v-if="loading" class="p-loading">数据加载中...</div>
    <div v-else-if="loadError" class="p-loading">数据加载失败：{{ loadError }}</div>

    <template v-else>
      <!-- 主Tab导航（总览仪表盘 / 客户详情分析 / 问题与偏差分析） -->
      <div class="pack-main-tabs">
        <button
          v-for="t in MAIN_TABS"
          :key="t.key"
          class="pack-tab-btn"
          :class="{ active: mainTab === t.key }"
          @click="mainTab = t.key"
        >
          <span class="icon">{{ t.icon }}</span>{{ t.label }}
        </button>
      </div>

      <div class="pack-content">
        <!-- ========== 总览仪表盘 ========== -->
        <div v-if="mainTab === 'overview'" class="pack-tab-panel pack-tab-panel--overview">
          <!-- KPI 行：StatCardRow + NewStatCard，副标题/状态色由风险规则引擎动态生成 -->
          <StatCardRow class="pack-kpi-row" :gap="16" :min-card-width="200" :max-card-width="460">
            <NewStatCard
              v-for="(k, i) in overviewKpis"
              :key="k.title"
              theme="kpi-top"
              :status="k.status"
              :title="k.title"
              :sub-title="k.sub"
              :value="k.value"
              :count-up="true"
              :fit-value="false"
              animated
              :animation-delay="i * 80"
            />
          </StatCardRow>

          <!-- 客户概览卡片（风险等级由规则引擎评分生成，达标条宽度来自真实 passRate） -->
          <div class="pack-client-grid">
            <div
              v-for="c in overviewCards"
              :key="c.key"
              class="pack-client-card"
              :class="{ selected: activeClient === c.key }"
              @click="jumpToDetail(c.key)"
            >
              <div class="cc-head">
                <h3 class="cc-name">{{ c.name }}</h3>
                <StatusTag :type="c.riskLevel" effect="light" size="small" :text="c.riskText" />
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
          </div>

          <!-- 图表区域：ScreenCard + BaseChart -->
          <div class="pack-chart-grid">
            <ScreenCard class="pack-chart-card" :show-corners="false">
              <template #title>
                <div class="chart-title"><span class="chart-bar"></span>各客户0KM PPM趋势对比</div>
              </template>
              <div class="chart-box-h300">
                <BaseChart :option="overviewTrendOption" />
              </div>
            </ScreenCard>
            <ScreenCard class="pack-chart-card" :show-corners="false">
              <template #title>
                <div class="chart-title"><span class="chart-bar"></span>各周期PPM达标情况统计</div>
              </template>
              <template #subTitle>
                <div class="chart-sub">得分 = 目标/实际×100（封顶100），由数据实时计算</div>
              </template>
              <div class="chart-box-h300">
                <BaseChart :option="overviewRadarOption" />
              </div>
            </ScreenCard>
          </div>
        </div>

        <!-- ========== 客户详情分析 ========== -->
        <div v-if="mainTab === 'detail'" class="pack-tab-panel">
          <!-- 客户选择器 -->
          <div class="pack-client-tabs">
            <button
              v-for="t in CLIENT_TABS"
              :key="t.key"
              class="client-tab-btn"
              :class="{ active: activeClient === t.key }"
              @click="activeClient = t.key"
            >{{ t.label }}</button>
          </div>

          <!-- A1/A2/A3/M5 详情：通用A型布局 -->
          <div v-if="currentA" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">{{ currentA.meta.fullName }} - 质量表现详情</h3>
              <StatusTag :type="currentRisk.level" effect="light" size="small" :text="`${currentRisk.text} · ${currentRisk.score}分`" />
            </div>

            <div class="detail-chart-grid">
              <ScreenCard v-for="p in A_PERIODS" :key="p.key" class="detail-chart-block" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">{{ p.title }}</div>
                </template>
                <div class="chart-box-h280">
                  <BaseChart :option="periodOption(currentA, p.key)" />
                </div>
              </ScreenCard>
            </div>

            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">详细数据表（最近 {{ detailWeeks(currentA).length }} 个供货周）</h4>
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
              <StatusTag :type="riskOf('M5').level" effect="light" size="small" :text="`${riskOf('M5').text} · ${riskOf('M5').score}分`" />
            </div>
            <div class="detail-chart-grid--wide">
              <ScreenCard class="detail-chart-block full" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">M5-XP 集成0KM表现</div>
                </template>
                <div class="chart-box-h300">
                  <BaseChart :option="m5ChartOption" />
                </div>
              </ScreenCard>
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
                    <td>{{ r.target }}</td>
                    <td><span class="cc-status" :class="`status-${r.status}`">{{ r.statusText }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="detail-note note-blue">
              <h4>M5集成结论（由数据自动生成）</h4>
              <p>{{ m5Conclusion }}</p>
            </div>
          </div>

          <!-- A4-M6 详情 -->
          <div v-if="activeClient === 'M6' && m6" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">A4客户 - M6-XM (小米-N1) 质量表现</h3>
              <StatusTag :type="riskOf('M6').level" effect="light" size="small" :text="`${riskOf('M6').text} · ${riskOf('M6').score}分`" />
            </div>
            <div class="detail-chart-grid">
              <ScreenCard class="detail-chart-block" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">小米-N1 0KM客户表现</div>
                </template>
                <div class="chart-box-h300">
                  <BaseChart :option="m6ChartOption" />
                </div>
              </ScreenCard>
              <ScreenCard class="detail-chart-block" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">关键指标数据</div>
                </template>
                <div class="m6-metrics">
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>{{ m6.kpi.km0.peakWeek || '窗口' }} 外观PPM峰值</span>
                      <span class="m6-val" :class="m6.kpi.km0.status === 'success' ? 'text-green' : 'text-red'">{{ fmt(m6.kpi.km0.ppm) }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill" :class="m6.kpi.km0.status === 'success' ? 'bar-green' : 'bar-red'" :style="{ width: Math.min(100, m6.kpi.km0.target ? m6.kpi.km0.ppm / m6.kpi.km0.target * 100 : 100) + '%' }"></div></div>
                    <div class="m6-sub">目标值：{{ m6.kpi.km0.target || 300 }}PPM，{{ m6.kpi.km0.ppm > m6.kpi.km0.target ? `超标${(m6.kpi.km0.ppm / m6.kpi.km0.target).toFixed(1)}倍` : '达标' }}</div>
                  </div>
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>{{ m6.kpi.km3.peakWeek || '窗口' }} 性能PPM峰值</span>
                      <span class="m6-val" :class="m6.kpi.km3.status === 'success' ? 'text-green' : 'text-red'">{{ fmt(m6.kpi.km3.ppm) }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill" :class="m6.kpi.km3.status === 'success' ? 'bar-green' : 'bar-red'" :style="{ width: Math.min(100, m6.kpi.km3.target ? m6.kpi.km3.ppm / m6.kpi.km3.target * 100 : 100) + '%' }"></div></div>
                    <div class="m6-sub">目标值：{{ m6.kpi.km3.target || 150 }}PPM，{{ m6.kpi.km3.ppm <= m6.kpi.km3.target ? '达标' : '超标' }}</div>
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
              </ScreenCard>
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
              <h4>M6集成结论（由数据自动生成）与未计入问题说明</h4>
              <p>{{ m6Conclusion }}</p>
              <p><strong>未计入0KM问题（业务备注）：</strong></p>
              <ul>
                <li>• 水管磕伤（翻包导致），客户端已处理，不计入</li>
                <li>• 箱盖及箱体变形6例（出厂照片无异常），判定为中储物流责任，不计入</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ========== 问题与偏差分析（全部由风险规则引擎生成） ========== -->
        <div v-if="mainTab === 'issues'" class="pack-tab-panel">
          <div class="pack-issues-grid">
            <div class="issues-left">
              <ScreenCard class="pack-chart-card mb" :show-corners="false">
                <template #title>
                  <h3 class="section-title"><span class="text-red">⚠️</span> 偏差问题汇总</h3>
                </template>
                <template #subTitle>
                  <div class="chart-sub">由各客户各周期 PPM 实际值 vs 目标值自动扫描生成</div>
                </template>
                <div class="issue-list">
                  <div v-for="it in issueItems" :key="it.title" class="issue-item" :class="`issue-item--${it.severity}`">
                    <div class="issue-head">
                      <StatusTag :type="it.statusType === 'fail' ? 'danger' : (it.severity === 'info' ? 'info' : 'warning')" effect="light" size="small" :text="it.statusText" />
                      <h4>{{ it.title }}</h4>
                    </div>
                    <p class="issue-desc"><strong>问题描述：</strong>{{ it.desc }}</p>
                    <p class="issue-meta">影响周期：{{ it.period }} | 涉及产品：{{ it.product }}</p>
                  </div>
                  <div v-if="!issueItems.length" class="issue-empty">当前窗口内未扫描到超标或趋势预警事件，各客户指标均在目标范围内。</div>
                </div>
              </ScreenCard>

              <ScreenCard class="pack-chart-card" :show-corners="false">
                <template #title>
                  <h3 class="section-title"><span class="text-blue">📋</span> 集成达标结论汇总</h3>
                </template>
                <div class="conclude-grid">
                  <div v-for="c in concludeItems" :key="c.name" class="conclude-card" :class="c.modifier">
                    <h4 :class="c.titleColor">{{ c.name }}<span v-if="c.score != null" class="conclude-score">{{ c.score }}分</span></h4>
                    <p>{{ c.text }}</p>
                  </div>
                </div>
              </ScreenCard>
            </div>

            <div class="issues-right">
              <ScreenCard class="pack-chart-card mb" :show-corners="false">
                <template #title>
                  <h3 class="section-title sm">问题类型分布</h3>
                </template>
                <div class="chart-box-h250">
                  <BaseChart :option="issueTypeOption" />
                </div>
              </ScreenCard>
              <ScreenCard class="pack-chart-card mb" :show-corners="false">
                <template #title>
                  <h3 class="section-title sm">各客户风险评级</h3>
                </template>
                <template #subTitle>
                  <div class="chart-sub">评分 = 100 - Σ事件扣分（超标按倍数、预警小额扣）</div>
                </template>
                <div class="chart-box-h250">
                  <BaseChart :option="riskScoreOption" />
                </div>
              </ScreenCard>
              <ScreenCard class="pack-chart-card" :show-corners="false">
                <template #title>
                  <h3 class="section-title sm">改进建议（按风险排序自动生成）</h3>
                </template>
                <div class="suggest-list">
                  <div v-for="(s,i) in suggestions" :key="i" class="suggest-item">
                    <span class="suggest-no" :class="s.color">{{ i+1 }}</span>
                    <p>{{ s.text }}</p>
                  </div>
                </div>
              </ScreenCard>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import { loadPackData, PERIOD_FIELD } from '@/utils/parsePack.js'
import { buildPackInsight, fmtNum, riskLevelOf } from '@/utils/packRiskRules.js'
import { chartC, tooltipStyle, legendStyle, gridStyle, axisStyle, valueAxisStyle } from '@/utils/chartTheme.js'

const loading = ref(true)
const loadError = ref('')
const packData = reactive({ asOf: '', customers: [], peak0km: { value: 0 }, peak3m: { value: 0 }, peak12m: { value: 0 }, totalCustomers: 0 })
const mainTab = ref('overview')
const activeClient = ref('A1')

const MAIN_TABS = [
  { key: 'overview', label: '总览仪表盘', icon: '📊' },
  { key: 'detail',   label: '客户详情分析', icon: '📈' },
  { key: 'issues',   label: '问题与偏差分析', icon: '⚠️' },
]
const CLIENT_TABS = [
  { key: 'A1', label: 'A1客户' },
  { key: 'A2', label: 'A2客户' },
  { key: 'A3', label: 'A3客户' },
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
  if (['A1', 'A2', 'A3'].includes(activeClient.value)) {
    return packData.customers.find(c => c.key === activeClient.value) || a1.value
  }
  return null
})

function fmt(v) { return fmtNum(v) }

/* ========== 风险规则引擎（问题清单/结论/建议/评分/雷达 全部数据驱动） ========== */
const insight = computed(() => {
  if (!packData.customers.length) return null
  return buildPackInsight(packData.customers)
})
const issueItems = computed(() => insight.value?.issueItems || [])
const concludeItems = computed(() => insight.value?.concludeItems || [])
const suggestions = computed(() => insight.value?.suggestions || [])

/** 按客户 key 取风险评分与等级 */
function riskOf(custKey) {
  const r = insight.value?.riskScores.find(x => x.custKey === custKey)
  return r || { score: 100, level: 'success', text: '达标' }
}
const currentRisk = computed(() => currentA.value ? riskOf(currentA.value.key) : riskOf('M5'))

const m5Conclusion = computed(() => {
  const c = concludeItems.value.find(x => x.name === (m5.value?.meta.name || 'M5客户'))
  return c?.text || '整体达标'
})
const m6Conclusion = computed(() => {
  const c = concludeItems.value.find(x => x.name === (m6.value?.meta.name || 'M6-XM客户'))
  if (!c) return '—'
  return `${c.text}。外观/性能PPM口径详见上方图表与数据表。`
})

/* ========== KPI 行（副标题动态生成，消除写死文案） ========== */
const overviewKpis = computed(() => {
  if (!insight.value) return []
  const peaks = insight.value.peaks
  const kpiOf = (peak, title) => {
    const o = peak.owner
    let status = 'success'
    let sub = '窗口内无超标记录'
    if (o && o.target && peak.value > o.target) {
      status = o.ratio >= 3 ? 'danger' : 'warning'
      sub = `⚡ ${o.name} ${o.week || ''} 超目标${o.ratio}倍`
    } else if (o) {
      sub = `峰值出现在 ${o.name} ${o.week || ''}，未超目标`
    }
    return { title, value: peak.value, sub, status }
  }
  const dangerCount = packData.dangerCustomers + packData.warningCustomers
  return [
    { title: '监控客户数量', value: packData.totalCustomers,
      sub: dangerCount ? `${dangerCount} 家客户需关注` : '全部客户纳入监控',
      status: dangerCount ? 'warning' : 'success' },
    kpiOf(peaks.km0, '0KM PPM峰值'),
    kpiOf(peaks.km3, '3MIS PPM峰值'),
    kpiOf(peaks.km12, '12MIS PPM峰值'),
  ]
})

/* ========== 客户概览卡片 ========== */
const statusColor = (s) => s === 'success' ? 'text-green' : (s === 'warning' ? 'text-orange' : (s === 'danger' ? 'text-red' : 'text-blue'))

function buildACard(c, barClass) {
  const k = c.kpi
  const risk = riskOf(c.key)
  const periods = c.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
  const metrics = periods.map(pk => {
    const item = k[pk]
    const label = c.isM6 ? item.label : pk.replace('km', '').replace('km0', '0KM') + ' PPM'
    const lbl = c.isM6 ? item.label : ({ km0: '0KM PPM', km3: '3MIS PPM', km6: '6MIS PPM', km12: '12MIS PPM' }[pk])
    const over = item.target && item.ppm > item.target
    const value = item.ppm <= 0
      ? '0 达标'
      : `${fmt(item.ppm)}${item.peakWeek ? ' (' + item.peakWeek + ')' : ''}${!over ? ' 达标' : ''}`
    return { label: lbl, value, colorClass: over ? 'text-red' : statusColor(item.status) }
  })
  const barClassByLevel = { success: 'bar-green-green', warning: 'bar-green-orange', danger: 'bar-orange-red' }
  return {
    key: c.key,
    name: c.meta.name,
    riskLevel: risk.level,
    riskText: `${risk.text} · ${risk.score}分`,
    metrics,
    barClass: barClassByLevel[risk.level] || barClass,
    passRate: c.passRate,
    remark: `${c.passRate}% 周期达标${risk.level !== 'success' ? '，存在超标周期需关注' : '，整体表现稳定'}`,
  }
}

const overviewCards = computed(() => {
  if (!insight.value) return []
  const cards = [a1.value, a2.value, a3.value].filter(Boolean).map(c => buildACard(c))
  // A4 合并卡（M5 + M6）：风险分 = 两者均值
  if (m5.value && m6.value) {
    const base = buildACard(m5.value)
    const s5 = riskOf('M5').score, s6 = riskOf('M6').score
    const avg = Math.round((s5 + s6) / 2)
    const lv = riskLevelOf(avg)
    const passRate = Math.round((m5.value.passRate + m6.value.passRate) / 2)
    cards.push({
      ...base,
      key: 'A4',
      name: 'A4客户',
      riskLevel: lv.level,
      riskText: `${lv.text} · ${avg}分`,
      metrics: [
        { label: 'M5 0KM PPM峰值', value: `${fmt(m5.value.kpi.km0.ppm)}${m5.value.kpi.km0.peakWeek ? ' (' + m5.value.kpi.km0.peakWeek + ')' : ''}`, colorClass: m5.value.kpi.km0.status === 'success' ? 'text-green' : 'text-orange' },
        { label: 'M6 外观PPM峰值', value: `${fmt(m6.value.kpi.km0.ppm)}${m6.value.kpi.km0.peakWeek ? ' (' + m6.value.kpi.km0.peakWeek + ')' : ''}`, colorClass: m6.value.kpi.km0.status === 'success' ? 'text-green' : 'text-red' },
        { label: 'M6 性能PPM峰值', value: `${fmt(m6.value.kpi.km3.ppm)}${m6.value.kpi.km3.status === 'success' ? ' 达标' : ''}`, colorClass: m6.value.kpi.km3.status === 'success' ? 'text-green' : 'text-red' },
      ],
      barClass: lv.level === 'success' ? 'bar-green-green' : 'bar-orange-red',
      passRate,
      remark: `M5达标率${m5.value.passRate}% · M6达标率${m6.value.passRate}%（合并均值${passRate}%）`,
    })
  }
  return cards
})

const m6PeakDelivery = computed(() => {
  if (!m6.value) return { value: 0, week: '' }
  let max = 0, mw = ''
  const d = m6.value.metrics.delivery?.values || {}
  Object.keys(d).forEach(w => { if (Number(d[w]) > max) { max = Number(d[w]); mw = w } })
  return { value: max, week: mw }
})

/* ========== 图表通用底座（BaseChart 自动解析 var() 与主题重绘） ========== */
function chartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: chartC.textMuted },
    legend: legendStyle(),
    grid: gridStyle(),
    tooltip: tooltipStyle({ trigger: 'axis' }),
  }
}

/* ========== 总览：0KM 趋势对比（时间轴由数据推导，不再写死） ========== */
const overviewTrendOption = computed(() => {
  const list = [a1.value, a2.value, m5.value].filter(Boolean)
  if (!list.length || !m6.value) return {}
  // 月份取各客户并集（保持时间顺序），周取最近 5 个
  const months = [...new Set(list.flatMap(c => c.months || []))]
  const weeks = [...new Set(list.flatMap(c => c.weeks || []))].slice(-5)
  const labels = [...months, ...weeks]
  const seriesOf = (cust, field) => labels.map(l => Number(cust.metrics[field]?.values[l] ?? 0))
  const mk = (name, data) => ({ name, type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 6 })
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['A1', 'A2', 'M5-XP', 'M6-XM外观'], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: labels },
    yAxis: { ...valueAxisStyle(), type: 'value', name: 'PPM' },
    series: [
      mk('A1', seriesOf(a1.value, 'actual0km')),
      mk('A2', seriesOf(a2.value, 'actual0km')),
      mk('M5-XP', seriesOf(m5.value, 'actual0km')),
      mk('M6-XM外观', seriesOf(m6.value, 'ppmApp')),
    ],
  }
})

/* ========== 总览：雷达图（各维度得分由目标/实际实时计算） ========== */
const overviewRadarOption = computed(() => {
  if (!insight.value || !a1.value) return {}
  const { radarOf, radarIndicators } = insight.value
  const mk = (name, cust) => ({ value: radarOf(cust), name, areaStyle: { opacity: 0.1 } })
  return {
    ...chartTheme(),
    tooltip: tooltipStyle({ trigger: 'item' }),
    legend: legendStyle({ data: ['A1', 'A2', 'A3', 'A4'], top: 0 }),
    radar: {
      indicator: radarIndicators,
      axisName: { color: chartC.textMuted },
      splitArea: { areaStyle: { color: ['color-mix(in srgb, var(--color-primary) 2%, transparent)', 'color-mix(in srgb, var(--color-primary) 5%, transparent)'] } },
      axisLine: { lineStyle: { color: chartC.axisLine } },
    },
    series: [{
      type: 'radar',
      data: [
        mk('A1', a1.value),
        mk('A2', a2.value),
        mk('A3', a3.value),
        mk('A4', m5.value),
      ].filter(d => d.value),
    }],
  }
})

/* ========== A 型详情：四周期图表（纵轴上限由数据计算） ========== */
function periodOption(cust, pKey) {
  const f = PERIOD_FIELD[pKey]
  const allLabels = [...(cust.months || []), ...(cust.weeks || [])]
  const get = (field) => allLabels.map(l => Number(cust.metrics[field]?.values[l] ?? 0))
  const supplyArr = get(f.supply)
  const failArr = get(f.fail)
  const targetArr = allLabels.map(l => Number(cust.metrics[f.target]?.values[l] ?? f.targetDefault))
  const actualArr = get(f.actual)
  const peak = Math.max(...actualArr, ...targetArr, 1)
  const rotate = allLabels.length > 14 ? 45 : 0
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['供货数', '故障数', `${f.label}目标`, `${f.label}实际`], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: allLabels, axisLabel: { ...axisStyle().axisLabel, rotate, fontSize: 9 } },
    yAxis: [
      { ...valueAxisStyle(), type: 'value', name: '供货数', position: 'left' },
      { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
    ],
    series: [
      { name: '供货数', type: 'bar', data: supplyArr, yAxisIndex: 0, itemStyle: { color: chartC.primary } },
      { name: '故障数', type: 'bar', data: failArr, yAxisIndex: 0, itemStyle: { color: chartC.danger } },
      { name: `${f.label}目标`, type: 'line', data: targetArr, yAxisIndex: 1, lineStyle: { color: chartC.primaryL, width: 2 }, symbol: 'none' },
      { name: `${f.label}实际`, type: 'line', data: actualArr, yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 6 },
    ],
  }
}

/* ========== A 型详情表格 ========== */
function takeRecentWeeks(cust, n = 5) {
  return (cust.weeks || []).filter(w => /WK\d+/.test(w)).slice(-n)
}
function detailWeeks(cust) {
  return takeRecentWeeks(cust, 5)
}
function detailRows(cust) {
  if (!cust) return []
  const wks = detailWeeks(cust)
  const getM = (key) => cust.metrics[key]?.values || {}
  return [
    { name: '0KM故障数', weekly: wks.map(w => getM('fail')[w] ?? 0), target: cust.kpi.km0.target || 24, status: 'primary' },
    { name: '3MIS故障数', weekly: wks.map(w => getM('fail3m')[w] ?? 0), target: cust.kpi.km3.target || 5, status: 'primary' },
    { name: '6MIS故障数', weekly: wks.map(w => getM('fail6m')[w] ?? 0), target: cust.kpi.km6.target || 300, status: 'primary' },
    { name: '12MIS故障数', weekly: wks.map(w => getM('fail12m')[w] ?? 0), target: cust.kpi.km12.target || 105, status: 'primary' },
  ]
}
function valColor(rowStatus, v, target) {
  if (rowStatus === 'primary') return ''
  if (Number(v) > 0) return 'text-red font'
  return 'text-green'
}
function formatVal(v) { return v ?? 0 }

/* ========== M5 详情 ========== */
const m5ChartOption = computed(() => {
  if (!m5.value) return {}
  const mm = m5.value.metrics
  const target = m5.value.kpi.km0.target || 15
  const periods = [...(m5.value.months || []), ...takeRecentWeeks(m5.value, 5)]
  const get = (k) => periods.map(p => Number(mm[k]?.values[p] ?? 0))
  const peak = Math.max(...get('actual0km'), target, 1)
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['供货数', '故障数', '0KM目标', '0KM实际'], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: periods },
    yAxis: [
      { ...valueAxisStyle(), type: 'value', name: '供货数', position: 'left' },
      { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
    ],
    series: [
      { name: '供货数', type: 'bar', data: get('supply'), yAxisIndex: 0, itemStyle: { color: chartC.primary } },
      { name: '故障数', type: 'bar', data: get('fail'), yAxisIndex: 0, itemStyle: { color: chartC.danger } },
      { name: '0KM目标', type: 'line', data: periods.map(() => target), yAxisIndex: 1, lineStyle: { color: chartC.primaryL, width: 2 }, symbol: 'none' },
      { name: '0KM实际', type: 'line', data: get('actual0km'), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 8 },
    ],
  }
})

const m5Rows = computed(() => {
  if (!m5.value) return []
  const rows = []
  const winTarget = m5.value.kpi.km0.target || 15
  const periods = [
    { key: (m5.value.months || []).slice(-1)[0] || '—', type: 'month' },
    ...takeRecentWeeks(m5.value, 5).map(w => ({ key: w, type: 'week' })),
  ]
  const m = m5.value.metrics
  periods.forEach(p => {
    const fail = m.fail.values[p.key] ?? 0
    const supply = m.supply.values[p.key] ?? 0
    const ppm = m.actual0km.values[p.key] ?? 0
    const target = Number(m.target0km.values[p.key] ?? winTarget) || winTarget
    const over = ppm > target
    rows.push({
      period: p.key, fail, supply, ppm: fmt(ppm), target,
      ppmColor: over ? (ppm >= target * 15 ? 'text-red font' : 'text-orange') : 'text-green',
      status: over ? 'fail' : 'pass', statusText: over ? '超标' : '达标',
    })
  })
  return rows
})

/* ========== M6 详情 ========== */
const m6ChartOption = computed(() => {
  if (!m6.value) return {}
  const labels = [...(m6.value.months || []), ...(m6.value.weeks || [])]
  const mm = m6.value.metrics
  const get = (k) => labels.map(l => Number(mm[k]?.values[l] ?? 0))
  const tApp = m6.value.kpi.km0.target || 300
  const tPerf = m6.value.kpi.km3.target || 150
  const peak = Math.max(...get('ppmApp'), ...get('ppmPerf'), tApp, tPerf, 1)
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['周交付', 'PPM-外观', 'PPM-性能', '目标-外观', '目标-性能'], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: labels },
    yAxis: [
      { ...valueAxisStyle(), type: 'value', name: '交付量', position: 'left' },
      { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
    ],
    series: [
      { name: '周交付', type: 'bar', data: get('delivery'), yAxisIndex: 0, itemStyle: { color: chartC.accent || 'var(--color-accent)' } },
      { name: 'PPM-外观', type: 'line', data: get('ppmApp'), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 8 },
      { name: 'PPM-性能', type: 'line', data: get('ppmPerf'), yAxisIndex: 1, lineStyle: { color: chartC.warning, width: 2 }, symbolSize: 8 },
      { name: '目标-外观', type: 'line', data: labels.map(() => tApp), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 1, type: 'dashed' }, symbol: 'none' },
      { name: '目标-性能', type: 'line', data: labels.map(() => tPerf), yAxisIndex: 1, lineStyle: { color: chartC.warning, width: 1, type: 'dashed' }, symbol: 'none' },
    ],
  }
})

const m6TableHeaders = computed(() => {
  if (!m6.value) return []
  return [...(m6.value.months || []), ...(m6.value.weeks || [])]
})
const m6TableRows = computed(() => {
  if (!m6.value) return []
  const headers = m6TableHeaders.value
  const mm = m6.value.metrics
  const getV = (metric, h) => mm[metric]?.values[h] ?? 0
  const colorOf = (v, target) => {
    if (Number(v) === 0) return ''
    if (Number(v) > target) return 'text-red font'
    if (Number(v) > target * 0.5) return 'text-orange'
    return 'text-green'
  }
  const targetApp = m6.value.kpi.km0.target || 300
  const targetPerf = m6.value.kpi.km3.target || 150
  return [
    { name: '0KM-外观故障数', values: headers.map(h => getV('failApp', h)), color: headers.map(h => Number(getV('failApp', h)) > 0 ? 'text-red' : '') },
    { name: '0KM-性能故障数', values: headers.map(h => getV('failPerf', h)), color: headers.map(h => Number(getV('failPerf', h)) > 0 ? 'text-red' : '') },
    { name: '周交付量', values: headers.map(h => getV('delivery', h)), color: headers.map(() => 'text-blue font') },
    { name: '外观PPM', values: headers.map(h => fmt(getV('ppmApp', h))), color: headers.map(h => colorOf(getV('ppmApp', h), targetApp)) },
    { name: '性能PPM', values: headers.map(h => fmt(getV('ppmPerf', h))), color: headers.map(h => colorOf(getV('ppmPerf', h), targetPerf)) },
  ]
})

/* ========== 问题分析页图表（数据由规则引擎产出） ========== */
const TYPE_COLOR = {
  '0KM异常': 'var(--color-danger)',
  'MIS趋势': 'var(--color-warning)',
  '外观问题': 'var(--color-primary)',
  '性能问题': 'var(--color-accent)',
}
const issueTypeOption = computed(() => {
  const dist = insight.value?.issueTypeDist || []
  return {
    ...chartTheme(),
    tooltip: tooltipStyle({ trigger: 'item' }),
    series: [{
      type: 'pie', radius: ['50%', '72%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: 'var(--color-bg-card)', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {d}%', color: chartC.textMuted, fontSize: 11 },
      data: dist.map(d => ({ ...d, itemStyle: { color: TYPE_COLOR[d.name] || 'var(--color-primary)' } })),
    }],
  }
})

const riskScoreOption = computed(() => {
  const scores = [...(insight.value?.riskScores || [])].sort((a, b) => a.score - b.score)
  const colorOf = (level) => level === 'success' ? 'var(--color-primary-light)' : (level === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)')
  return {
    ...chartTheme(),
    tooltip: tooltipStyle(),
    grid: { left: '5%', right: '12%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { ...valueAxisStyle(), type: 'value', max: 100, axisLabel: { ...valueAxisStyle().axisLabel, formatter: '{value}分' } },
    yAxis: { ...axisStyle(), type: 'category', data: scores.map(s => s.name) },
    series: [{
      type: 'bar', barWidth: 20,
      label: { show: true, position: 'right', formatter: '{c}分', color: chartC.textMuted },
      data: scores.map(s => ({ value: s.score, itemStyle: { color: colorOf(s.level), borderRadius: [0, 3, 3, 0] } })),
    }],
  }
})

/* ========== 交互 ========== */
function jumpToDetail(clientKey) {
  activeClient.value = clientKey
  mainTab.value = 'detail'
}

/* ========== 加载 ========== */
onMounted(async () => {
  try {
    loading.value = true
    const d = await loadPackData()
    Object.assign(packData, d)
  } catch (e) {
    console.error(e)
    loadError.value = e.message || '未知错误'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss';

.pack-screen {
  padding: $spacing-md;
  background: transparent;
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
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
  background: var(--color-bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-body);
  cursor: pointer;
  transition: all .25s;
  box-shadow: var(--shadow-card);
  font-family: inherit;
  .icon { margin-right: 6px; }
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    color: #fff;
    border-color: transparent;
  }
}
.pack-content { min-height: 0; flex: 1; display: flex; flex-direction: column; }
.pack-tab-panel { animation: fadeIn .4s ease; }
/* 总览面板：纵向填满剩余高度，图表区自适应拉伸 */
.pack-tab-panel--overview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  .pack-kpi-row {
    flex-shrink: 0;
    height: 88px;
    margin-bottom: $spacing-md;
  }
  .pack-client-grid { flex-shrink: 0; margin-bottom: $spacing-md; }
  .pack-chart-grid {
    flex: 1;
    min-height: 320px;
  }
  .pack-chart-card {
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.screen-card__body) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .chart-box-h300 {
      height: auto;
      flex: 1;
      min-height: 260px;
    }
  }
}
@keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
.p-loading { padding: 40px; text-align: center; color: var(--text-sec); }

/* ============ KPI 行 ============ */
.pack-kpi-row :deep(.stat-card) {
  height: 100%;
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
  @media (max-width: 1100px) { grid-template-columns: repeat(2,1fr); }
}
.pack-client-card {
  background: var(--color-bg-card);
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
.cc-metrics { display: flex; flex-direction: column; gap: $spacing-xs; }
.cc-row { display: flex; justify-content: space-between; font-size: $font-sm; }
.cc-label { color: var(--text-sec); }
.cc-val { font-weight: 600; }
.cc-bar { height: 4px; background: var(--color-bg-soft); border-radius: 99px; overflow: hidden; margin-top: $spacing-md; }
.cc-bar-fill { height: 100%; border-radius: 99px;
  &.bar-green-orange { background: linear-gradient(90deg,var(--color-accent),var(--color-primary)); }
  &.bar-orange-red    { background: linear-gradient(90deg,var(--color-warning),var(--color-danger)); }
  &.bar-green-green   { background: linear-gradient(90deg,color-mix(in srgb, var(--color-success) 60%, #ffffff),var(--color-success)); }
}
.cc-remark { font-size: $font-xs; color: var(--text-muted); margin-top: $spacing-xs; }

/* ============ 图表卡片 ============ */
.pack-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: $spacing-md;
}
.pack-chart-card {
  background: var(--color-bg-card);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  box-shadow: var(--shadow-card);
  &.mb { margin-bottom: $spacing-md; }
}
.chart-title {
  font-size: $font-md;
  font-weight: 700;
  color: var(--text-main);
  display: flex; align-items: center; gap: $spacing-sm;
}
.chart-sub { font-size: $font-xs; color: var(--text-muted); font-weight: 400; }
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
  background: var(--color-bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-body);
  cursor: pointer;
  transition: all .25s;
  font-family: inherit;
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: linear-gradient(90deg,var(--color-primary),var(--color-accent));
    color: #fff;
    border-color: transparent;
  }
}
.pack-detail-card {
  background: var(--color-bg-card);
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
}
.detail-chart-grid--wide { display: grid; grid-template-columns: 1fr; gap: $spacing-md; }
.detail-chart-block {
  background: var(--color-bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-sm $spacing-md;
  box-shadow: var(--shadow-card);
  &.full { grid-column: 1/-1; }
}
.detail-sub-title {
  font-size: $font-md; font-weight: 600; color: var(--color-primary);
  margin: 0;
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
.m6-metrics { display: flex; flex-direction: column; gap: $spacing-md; padding-top: $spacing-sm; }
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
  h4 { font-weight: 700; margin: 0 0 $spacing-xs 0; font-size: $font-md; }
  p, li { color: var(--text-body); font-size: $font-sm; line-height: 1.6; margin: 0 0 $spacing-xs 0; }
  ul { padding-left: $spacing-md; margin: 0; }
}

/* ============ 问题分析 ============ */
.pack-issues-grid { display: grid; grid-template-columns: 2fr 1fr; gap: $spacing-lg; }
.issues-left, .issues-right { display: flex; flex-direction: column; min-width: 0; }
.section-title { font-size: $font-lg; font-weight: 700; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: $spacing-sm;
  &.sm { font-size: $font-md; }
}
.issue-list { display: flex; flex-direction: column; gap: $spacing-md; }
.issue-item {
  border-left: 3px solid var(--color-warning);
  transition: all .25s;
  padding: $spacing-xs 0 $spacing-xs $spacing-md;
  &:hover { background: var(--color-bg-hover); }
  &--danger { border-left-color: var(--color-danger); }
  &--info   { border-left-color: var(--color-info, var(--color-primary)); }
}
.issue-empty { padding: $spacing-lg 0; text-align: center; color: var(--text-muted); font-size: $font-sm; }
.issue-head { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.issue-head h4 { margin: 0; font-weight: 700; color: var(--text-main); font-size: $font-md; }
.issue-desc { color: var(--text-body); font-size: $font-sm; margin: 0 0 $spacing-xs 0; line-height: 1.5; }
.issue-meta { color: var(--text-muted); font-size: $font-xs; margin: 0; }

.conclude-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: $spacing-md; }
.conclude-card {
  padding: $spacing-md; border-radius: $radius-md; background: var(--color-bg-soft); border-left: 4px solid;
  h4 { font-weight: 700; margin: 0 0 $spacing-xs 0; font-size: $font-md; display: flex; align-items: center; gap: $spacing-sm; }
  p { color: var(--text-body); font-size: $font-sm; margin: 0; line-height: 1.5; }
  &.border-green  { border-left-color: var(--color-success); h4 { color: var(--color-success); } }
  &.border-orange { border-left-color: var(--color-warning); h4 { color: var(--color-warning); } }
  &.border-red    { border-left-color: var(--color-danger); h4 { color: var(--color-danger); } }
  &.border-blue   { border-left-color: var(--color-primary); h4 { color: var(--color-primary); } }
}
.conclude-score { font-size: $font-xs; font-weight: 600; color: var(--text-muted); }

.suggest-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.suggest-item { display: flex; gap: $spacing-sm; align-items: flex-start; font-size: $font-sm; color: var(--text-body); }
.suggest-no {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: $font-sm;
  &.no-red    { background: var(--color-danger-bg); color: var(--color-danger); }
  &.no-orange { background: var(--color-warning-bg); color: var(--color-warning); }
  &.no-blue   { background: var(--color-info-bg); color: var(--color-primary); }
  &.no-green  { background: var(--color-success-bg); color: var(--color-success); }
}

@media (max-width: 1100px) {
  .pack-chart-grid, .pack-issues-grid, .conclude-grid { grid-template-columns: 1fr; }
  .detail-chart-grid { grid-template-columns: 1fr; }
}
</style>
