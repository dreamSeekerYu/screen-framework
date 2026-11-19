<template>
  <!--
    KPI/指标卡片行容器（StatCardRow）
    —— 统一承载 NewStatCard / ScreenCard 等卡片的一行布局
    设计原则：
      1. 以内容自然宽度为基准撑开卡片，避免"内容少的太空 / 内容多的太挤"
      2. 每张卡设 min-width / max-width 宽约束，防止极端尺寸
      3. 剩余空间按比例均分给所有卡，使整行视觉匀称
      4. 字体缩放/省略号由卡片自身 (NewStatCard.fitValue) 做兜底，行层不强制开启
    用法：
      <StatCardRow :gap="16" :min-card-width="180" :max-card-width="420">
        <NewStatCard v-for="k in kpiCards" :key="k.title" ... />
      </StatCardRow>
  -->
  <div
    class="stat-card-row"
    :class="{
      'stat-card-row--wrap': wrap,
      'stat-card-row--stretch': alignCardsHeight
    }"
    :style="rowStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 卡片之间的间距（px）
  gap: { type: Number, default: 16 },
  // 单卡最小宽度（px）—— 防止过窄挤坏内容
  minCardWidth: { type: Number, default: 180 },
  // 单卡最大宽度（px）—— 防止单卡因内容过长独占整行
  maxCardWidth: { type: Number, default: 420 },
  // 内容过宽时是否换行；默认不换行（大屏 KPI 行通常要求一行排完）
  wrap: { type: Boolean, default: false },
  // 是否拉伸每张卡等高
  alignCardsHeight: { type: Boolean, default: true }
})

const rowStyle = computed(() => ({
  gap: `${props.gap}px`,
  '--stat-card-min-w': `${props.minCardWidth}px`,
  '--stat-card-max-w': `${props.maxCardWidth}px`
}))
</script>

<style lang="scss">
/* 非 scoped：需要命中通过默认 slot 渲染进来的卡片元素（它们属于父组件作用域） */
.stat-card-row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;
}

.stat-card-row--wrap {
  flex-wrap: wrap;
}

/* 直接子项统一应用伸缩规则：
   flex: 1 1 auto —— 起于内容自然宽度，剩余空间均分、空间不足按比例收缩
   min / max 宽度 —— 把单卡锁在 [min, max] 区间，杜绝极端尺寸
*/
.stat-card-row > * {
  flex: 1 1 auto;
  min-width: var(--stat-card-min-w, 180px);
  max-width: var(--stat-card-max-w, 420px);
  box-sizing: border-box;
}

/* 等高：让内部卡片填满子项高度（deep 穿透卡片根） */
.stat-card-row--stretch > * > .stat-card,
.stat-card-row--stretch > * > .screen-card {
  height: 100%;
}
</style>
