<template>
  <div class="page-shell">
    <!-- KPI 行：固定高度，一行 NewStatCard/StatCardRow -->
    <div v-if="$slots.kpi" class="page-shell__kpi">
      <slot name="kpi" />
    </div>
    <!-- 主体区：占满剩余高度，内部滚动由页面自控（大屏约束：整页不滚动） -->
    <div class="page-shell__body">
      <slot />
    </div>
    <!-- 页脚说明/口径注释（可选） -->
    <div v-if="$slots.footer" class="page-shell__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
/**
 * 标准页面骨架（布局模板基础件）
 *
 * 目标：把 Pack 页验证过的「1080 一屏约束」固化成组件——
 * 页面根容器为固定高度 flex 列：KPI 行不缩放、主体区占满剩余高度、
 * 整页 overflow:hidden（内部需要滚动时由面板自控，如问题清单列表）。
 *
 * 三种推荐骨架（配合注册中心 layout 字段）：
 *   kpi-grid      → <PageShell><template #kpi>…</template> 图表栅格 </PageShell>
 *   kpi-table     → <PageShell> 上图表 + 下明细表 </PageShell>
 *   tabbed-matrix → <PageShell> Tab行 + 矩阵看板 </PageShell>
 *
 * 配合 usePageOverflowGuard（dev 告警）可在开发期拦截布局回归。
 */
</script>

<style lang="scss" scoped>
.page-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden; // 一屏约束：整页禁滚动

  &__kpi {
    flex: 0 0 auto;
    margin-bottom: var(--spacing-md, 12px);
  }
  &__body {
    flex: 1 1 auto;
    min-height: 0; // 允许子面板 height:100% 生效
    display: flex;
    flex-direction: column;
  }
  &__footer {
    flex: 0 0 auto;
    margin-top: var(--spacing-xs, 6px);
  }
}
</style>
