<template>
  <!-- 问题与偏差分析（全部由风险规则引擎生成） -->
  <div class="pack-tab-panel">
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
            <div
              v-for="it in issues"
              :key="it.title"
              class="issue-item issue-item--click"
              :class="`issue-item--${it.severity}`"
              :title="`点击查看 ${it.custKey || ''} 详情并定位该周期`"
              @click="$emit('locate', it)"
            >
              <div class="issue-head">
                <StatusTag :type="it.statusType === 'fail' ? 'danger' : (it.severity === 'info' ? 'info' : 'warning')" effect="light" size="small" :text="it.statusText" />
                <h4>{{ it.title }}</h4>
              </div>
              <p class="issue-desc"><strong>问题描述：</strong>{{ it.desc }}</p>
              <p class="issue-meta">
                影响周期：{{ it.period }} | 涉及产品：{{ it.product }}
                <span v-if="it.custKey" class="issue-locate">🔍 查看详情 →</span>
              </p>
            </div>
            <div v-if="!issues.length" class="issue-empty">当前窗口内未扫描到超标或趋势预警事件，各客户指标均在目标范围内。</div>
          </div>
        </ScreenCard>

        <ScreenCard class="pack-chart-card" :show-corners="false">
          <template #title>
            <h3 class="section-title"><span class="text-blue">📋</span> 集成达标结论汇总</h3>
          </template>
          <div class="conclude-grid">
            <div v-for="c in concludes" :key="c.name" class="conclude-card" :class="c.modifier">
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
</template>

<script setup>
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import StatusTag from '@/components/common/StatusTag.vue'

defineProps({
  issues: { type: Array, default: () => [] },
  concludes: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  issueTypeOption: { type: Object, default: () => ({}) },
  riskScoreOption: { type: Object, default: () => ({}) }
})
defineEmits(['locate'])
</script>
