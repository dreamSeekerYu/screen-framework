<template>
  <div class="home-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader title="LPA 过程审核" />
    <div v-if="loading" class="data-loading">
      <div class="loading-spinner" />
      数据加载中...
    </div>
    <template v-else>
      <!-- KPI 行 -->
      <div class="lpa-kpi-row">
        <StatCard theme="kpi-side" status="success" title="本周CPK达标率" sub-title="CW44周度" value="98.7" unit="%"
          trend="1.3pp" trend-type="down" trend-label="较上周" badge="达标">
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"></path>
              <path d="M18 17l-5-5-4 4-3-3"></path>
            </svg>
          </template>
        </StatCard>
        <StatCard theme="kpi-side" status="primary" title="累计CPK项目" sub-title="本周覆盖" value="153" unit="项" trend="8项"
          trend-type="up" trend-label="较上周">
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M7 7h10"></path>
              <path d="M7 12h10"></path>
              <path d="M7 17h6"></path>
            </svg>
          </template>
        </StatCard>
        <StatCard theme="kpi-side" status="warning" title="现场问题项" sub-title="最新一次审核" value="2" unit="项"
          trend="待闭环" trend-type="down" trend-label="闭环状态" badge="跟踪中">
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <path d="M12 9v4M12 17h.01"></path>
            </svg>
          </template>
        </StatCard>
      </div>

      <!-- 主体内容区 -->
      <div class="lpa-main">
        <!-- 左：现场问题图片 -->
        <ScreenCard title="现场问题图片" sub-title="审核发现 · 焊接点位" class="lpa-img-card">
          <div class="lpa-img-frame">
            <img v-if="img_src" :src="img_src" class="lpa-img" alt="现场问题图片">
            <div v-else class="lpa-img-empty">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>暂无现场图片</span>
            </div>
          </div>
        </ScreenCard>

        <!-- 右：待建设模块占位 -->
        <ScreenCard title="分析模块" sub-title="规划建设中" class="lpa-plan-card">
          <div class="lpa-placeholder-grid">
            <div v-for="i in 4" :key="i" class="main-chart-placeholder">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <path v-if="i % 2 === 1" d="M3 3v18h18" />
                <rect v-else x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              <span class="placeholder-text">{{ ['分层审核趋势', '问题类型分布', '车间达标率', '整改闭环跟踪'][i - 1] }}</span>
              <span class="placeholder-hint">模块开发中，敬请期待</span>
            </div>
          </div>
        </ScreenCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import { useLazyLoad } from '@/composables/useLazyLoad'
import StatCard from '@/components/common/NewStatCard.vue'

import { loadData } from '@/utils/dataLoader.js'
import {
  getRowsFromSheet,
  indexSheet,
  getCell,
  cellText,
  getRange,
  cellOfRow,
  toGrid,
  getImgPath,
  hasData,
  rightMostFilledCol,
  latestFilledCols,
} from '@/utils/getDataFromJson.js'

// ============ 指标数据 ============
const metricsData = ref([
  { label: '累计访问量', value: 128569, suffix: '', trend: 12.5 },
  { label: '今日订单', value: 3862, suffix: '单', trend: 8.2 },
  { label: '总交易额', value: 8965.3, suffix: '万', trend: 15.6 },
  { label: '活跃用户', value: 28956, suffix: '人', trend: -2.3 }
])

const loading = ref(true)
const img_src = ref('')
let LPAData = null

  // 异步加载 LPA 数据（不再打进组件 chunk）
  ; (async () => {
    const lpaJson = await loadData('lpa')
    LPAData = indexSheet(lpaJson.sheets[0]);
    console.log('LPAData....', LPAData)
    console.log(getCell(LPAData, 8, 10))
    // console.log(getRange(LPAData, 6, 4, 10, 20))
    console.log(LPAData.colByName['日期'])
    console.log(LPAData.colByName['问题图片'])
    // 获取图片真实地址
    console.log(getImgPath(LPAData, LPAData.colByName['问题图片'][1]?.[0]))
    console.log(getImgPath(LPAData, 'img_9'))

    // ============ 指标数据 ============
    img_src.value = getImgPath(LPAData, LPAData.colByName['问题图片'][1]?.[0])
    loading.value = false
  })()
</script>

<style scoped lang="scss">
.home-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 $spacing-md $spacing-md;
  box-sizing: border-box;
  overflow: hidden;
}

.data-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--color-text-muted);
  font-size: $font-md;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  animation: lpa-spin .8s linear infinite;
}

@keyframes lpa-spin {
  to { transform: rotate(360deg); }
}

/* KPI 行 */
.lpa-kpi-row {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $spacing-md;
  margin-bottom: $spacing-md;
}

/* 主体：左图片 + 右占位，纵向撑满剩余高度 */
.lpa-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: $spacing-md;
}

.lpa-img-card,
.lpa-plan-card {
  min-height: 0;
}

.lpa-img-frame {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
  border-radius: $radius-md;
  overflow: hidden;
  padding: $spacing-sm;
}

.lpa-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: $radius-sm;
}

.lpa-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: $font-sm;
}

.lpa-placeholder-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: $spacing-md;
}

.main-chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--color-text-muted);
  border: 2px dashed var(--color-border);
  border-radius: $radius-md;
  transition: all .25s ease;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-bg-hover);
  }

  .placeholder-text {
    font-size: $font-md;
    color: var(--color-text-secondary);
    font-weight: 600;
  }

  .placeholder-hint {
    font-size: $font-xs;
  }
}
</style>
