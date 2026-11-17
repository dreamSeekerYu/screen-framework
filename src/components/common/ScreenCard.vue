<template>
  <div class="screen-card">
    <!-- 卡片头部 -->
    <div v-if="title || $slots.title" class="screen-card__header">
      <div class="screen-card__title-bar"></div>
      <slot name="title">
        <span class="screen-card__title">{{ title }}</span>
      </slot>
      <div class="screen-card__header-extra">
        <slot name="extra" />
      </div>
    </div>
    
    <!-- 卡片内容区 -->
    <div class="screen-card__body">
      <slot />
    </div>
    
    <!-- 四个角装饰 -->
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
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
    align-items: center;
    margin-bottom: $spacing-md;
    position: relative;
  }
  
  &__title-bar {
    width: 4px;
    height: 18px;
    background: var(--color-primary);
    margin-right: $spacing-sm;
    border-radius: 2px;
  }
  
  &__title {
    font-size: $font-md;
    font-weight: 600;
    color: var(--color-text-primary);
    flex: 1;
  }
  
  &__header-extra {
    color: var(--color-text-secondary);
    font-size: $font-sm;
  }
  
  &__body {
    width: 100%;
    height: calc(100% - #{$font-md} - #{$spacing-md} - #{$spacing-md});
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
