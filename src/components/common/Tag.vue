<template>
  <span
    class="ui-tag"
    :class="[
      `ui-tag-type--${type}`,
      `ui-tag-size--${size}`,
      { 'is-round': round, 'is-closable': closable, 'is-close-visible': closable }
    ]"
  >
    <slot>
      <span v-if="text" class="ui-tag__text">{{ text }}</span>
    </slot>
    <span
      v-if="closable"
      class="ui-tag__close"
      @click.stop="handleClose"
    >×</span>
  </span>
</template>

<script setup>
const props = defineProps({
  text: { type: String, default: '' },
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'info', 'warning', 'danger'].includes(v)
  },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['small', 'default', 'large'].includes(v)
  },
  round: { type: Boolean, default: false },
  closable: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'click'])

function handleClose(e) {
  emit('close', e)
}
</script>

<style scoped lang="scss">
.ui-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  border-radius: $radius-sm;
  border: 1px solid transparent;
  cursor: default;
  transition: all 0.2s ease;
  background-color: var(--color-bg-card);
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);

  &__text { display: inline-block; }

  &__close {
    margin-left: 4px;
    width: 14px;
    height: 14px;
    line-height: 12px;
    text-align: center;
    border-radius: 50%;
    font-size: 14px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s;
    &:hover { opacity: 1; background: rgba(255,255,255,0.15); }
  }

  &.is-round { border-radius: 20px; }

  /* size */
  &-size--small  { height: 22px; padding: 0 8px; font-size: $font-xs; }
  &-size--default{ height: 26px; padding: 0 10px; font-size: $font-sm; }
  &-size--large  { height: 30px; padding: 0 14px; font-size: $font-md; }

  /* type - 描边风格，适配大屏深色渐变背景 */
  &-type--primary {
    color: var(--color-primary-light);
    border-color: var(--color-primary);
    background: rgba(30, 111, 255, 0.12);
  }
  &-type--success { color: #36cfc9; border-color: rgba(54,207,201,0.5); background: rgba(54,207,201,0.1); }
  &-type--info    { color: #00c6ff; border-color: rgba(0,198,255,0.5);  background: rgba(0,198,255,0.1);  }
  &-type--warning { color: #ffc53d; border-color: rgba(255,197,61,0.5); background: rgba(255,197,61,0.1); }
  &-type--danger  { color: #ff7a45; border-color: rgba(255,122,69,0.5); background: rgba(255,122,69,0.1); }
}
</style>
