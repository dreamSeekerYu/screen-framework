<template>
  <span
    class="ui-tag"
    :class="[
      `ui-tag-type--${type}`,
      `ui-tag-size--${size}`,
      `ui-tag-effect--${effect}`,
      { 'is-round': round, 'is-closable': closable, 'is-close-visible': closable }
    ]"
    :style="customStyle"
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
import { computed } from 'vue'
const props = defineProps({
  text: { type: String, default: '' },
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'info', 'warning', 'danger'].includes(v)
  },
  effect: {
    type: String,
    default: 'light',
    validator: (v) => ['light', 'plain', 'dark'].includes(v)
  },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['small', 'default', 'large'].includes(v)
  },
  round: { type: Boolean, default: false },
  closable: { type: Boolean, default: false },
  color: { type: String, default: '' },
})

const emit = defineEmits(['close', 'click'])

const customStyle = computed(() => {
  if (!props.color) return {}
  if (props.effect === 'dark') {
    return { background: props.color, borderColor: props.color, color: '#fff' }
  }
  if (props.effect === 'plain') {
    return { color: props.color, borderColor: props.color, background: 'transparent' }
  }
  return { color: props.color, borderColor: props.color + '66', background: props.color + '1a' }
})

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
    &:hover { opacity: 1; background: var(--color-bg-hover); }
  }

  &.is-round { border-radius: 20px; }

  /* size */
  &-size--small  { height: 22px; padding: 0 8px; font-size: $font-xs; }
  &-size--default{ height: 26px; padding: 0 10px; font-size: $font-sm; }
  &-size--large  { height: 30px; padding: 0 14px; font-size: $font-md; }

  /* type - 语义色驱动，自动适配浅色/深色主题 */
  &-type--primary {
    color: var(--color-primary);
    border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  }
  &-type--success { color: var(--color-success); border-color: color-mix(in srgb, var(--color-success) 50%, transparent); background: color-mix(in srgb, var(--color-success) 12%, transparent); }
  &-type--info    { color: var(--color-info); border-color: color-mix(in srgb, var(--color-info) 50%, transparent); background: color-mix(in srgb, var(--color-info) 12%, transparent); }
  &-type--warning { color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 50%, transparent); background: color-mix(in srgb, var(--color-warning) 12%, transparent); }
  &-type--danger  { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 50%, transparent); background: color-mix(in srgb, var(--color-danger) 12%, transparent); }
}
</style>
