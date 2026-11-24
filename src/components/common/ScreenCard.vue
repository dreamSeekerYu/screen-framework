<template>
  <div class="screen-card">
    <!-- 卡片头部 -->
    <div v-if="title || subTitle || $slots.title || $slots.subTitle" class="screen-card__header">
      <div class="screen-card__title-bar"></div>
      <div class="screen-card__title-group">
        <slot name="title">
          <span class="screen-card__title">{{ title }}</span>
        </slot>
        <div v-if="subTitle || $slots.subTitle" class="screen-card__sub">
          <slot name="subTitle">{{ subTitle }}</slot>
        </div>
      </div>
      <div class="screen-card__header-extra">
        <slot name="extra" />
      </div>
    </div>

    <!-- 卡片内容区 -->
    <div class="screen-card__body">
      <slot />
    </div>

    <!-- 四个角装饰 -->
    <!-- <template v-if="showCorners">
      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>
    </template> -->
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  // 标题下方副标题（也可用 #subTitle 插槽自定义）
  subTitle: {
    type: String,
    default: ''
  },
  // 是否显示四角装饰（部分页面沿用无角装饰的简洁样式时可关闭）
  showCorners: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped lang="scss">
.screen-card {
  position: relative;
  width: 100%;
  height: 100%;
  padding: $card-padding;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: $radius-md;
  box-sizing: border-box;
  // 纵向 flex：头部固定、内容区自适应剩余高度，保证图表有真实高度
  display: flex;
  flex-direction: column;
  min-height: 0;

  // 边框光效
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--color-primary) 50%, transparent 100%);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    margin-bottom: $spacing-md;
    position: relative;
    flex-shrink: 0;
  }

  &__title-bar {
    width: 4px;
    height: 18px;
    background: var(--color-primary);
    margin-right: $spacing-sm;
    margin-top: 2px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  &__title-group {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    font-size: $font-md;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.3;
  }

  &__sub {
    margin-top: 2px;
    font-size: $font-sm;
    color: var(--color-text-secondary);
    line-height: 1.3;
  }

  &__header-extra {
    color: var(--color-text-secondary);
    font-size: $font-sm;
    flex-shrink: 0;
    margin-left: $spacing-sm;
  }

  &__body {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    // 让内部子元素（图表/表格/列表）能在 flex 容器里继承高度
    > * { min-height: 0; }
  }

  // 四角装饰
  .corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: var(--color-primary);
    border-style: solid;

    &-tl {
      top: -1px;
      left: -1px;
      border-width: 2px 0 0 2px;
    }
    &-tr {
      top: -1px;
      right: -1px;
      border-width: 2px 2px 0 0;
    }
    &-bl {
      bottom: -1px;
      left: -1px;
      border-width: 0 0 2px 2px;
    }
    &-br {
      bottom: -1px;
      right: -1px;
      border-width: 0 2px 2px 0;
    }
  }
}
</style>
