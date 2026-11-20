<template>
  <div class="ui-tabs" :class="`ui-tabs-type--${type}`">
    <!-- 标签头 -->
    <div class="ui-tabs__nav" ref="navRef">
      <div
        class="ui-tabs__active-bar"
        :style="activeBarStyle"
      ></div>
      <div
        v-for="(pane, index) in panes"
        :key="pane.name || index"
        class="ui-tabs__item"
        :class="{ 'is-active': currentName === (pane.name || index), 'is-disabled': pane.disabled }"
        @click="handleClick(pane, index)"
      >
        <span class="ui-tabs__item-label">
          {{ pane.label }}
          <sup v-if="pane.badge" class="ui-tabs__badge">{{ pane.badge }}</sup>
        </span>
      </div>
    </div>
    <!-- 内容区 -->
    <div class="ui-tabs__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, provide, computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: 0 },
  type: {
    type: String,
    default: 'card',
    validator: (v) => ['line', 'card', 'segment'].includes(v)
  },
  stretch: { type: Boolean, default: false } // segment 类型是否均分
})

const emit = defineEmits(['update:modelValue', 'change'])
const currentName = ref(props.modelValue)
const panes = ref([])
const navRef = ref(null)
const activeBarStyle = ref({})

// 子 TabPane 通过 provide/inject 注册
const addPane = (pane) => {
  panes.value.push(pane)
  nextTick(updateBar)
}
const removePane = (name) => {
  panes.value = panes.value.filter(p => p.name !== name)
  nextTick(updateBar)
}
const updatePane = (name, patch) => {
  const p = panes.value.find(x => x.name === name)
  if (p) Object.assign(p, patch)
  nextTick(updateBar)
}
provide('tabs', { addPane, removePane, updatePane, currentName, panes })

function handleClick(pane, index) {
  if (pane.disabled) return
  const name = pane.name || index
  currentName.value = name
  emit('update:modelValue', name)
  emit('change', name)
  nextTick(updateBar)
}

function updateBar() {
  if (!navRef.value) return
  const items = navRef.value.querySelectorAll('.ui-tabs__item')
  const idx = panes.value.findIndex((p, i) => (p.name || i) === currentName.value)
  const target = items[idx]
  if (!target) return
  activeBarStyle.value = {
    width: `${target.offsetWidth}px`,
    left: `${target.offsetLeft}px`
  }
}

watch(() => props.modelValue, (v) => {
  currentName.value = v
  nextTick(updateBar)
})

onMounted(() => {
  // 默认激活第一个
  if (panes.value.length && currentName.value === 0 && panes.value[0].name !== undefined) {
    currentName.value = panes.value[0].name
  }
  nextTick(updateBar)
  window.addEventListener('resize', updateBar)
})
</script>

<style scoped lang="scss">
.ui-tabs {
  width: 100%;
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary);

  &__nav {
    position: relative;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  &__item {
    position: relative;
    padding: 10px 18px;
    cursor: pointer;
    font-size: $font-sm;
    color: var(--color-text-secondary);
    transition: color 0.2s;
    display: flex;
    align-items: center;
    white-space: nowrap;
    user-select: none;

    &:hover { color: var(--color-primary-light); }
    &.is-active { color: var(--color-text-primary); font-weight: 600; }
    &.is-disabled { color: var(--color-text-muted); cursor: not-allowed; }
  }

  &__item-label {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  &__badge {
    position: absolute;
    top: -6px;
    right: -14px;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    text-align: center;
  }

  &__active-bar {
    position: absolute;
    bottom: -1px;
    height: 2px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
    border-radius: 2px;
    transition: left 0.3s ease, width 0.3s ease;
  }

  &__content {
    flex: 1;
    padding-top: $spacing-md;
    position: relative;
    overflow: hidden;
  }

  /* card 卡片类型 */
  &-type--card {
    .ui-tabs__nav {
      border-bottom: none;
      gap: 4px;
    }
    .ui-tabs__item {
      border: 1px solid var(--color-border-light);
      border-bottom: none;
      border-radius: $radius-md $radius-md 0 0;
      background: rgba(255,255,255,0.03);
      padding: 8px 16px;
      &.is-active {
        background: var(--color-bg-card);
        border-color: var(--color-primary);
        color: var(--color-primary-light);
      }
    }
    .ui-tabs__active-bar { display: none; }
  }

  /* segment 分段按钮类型 */
  &-type--segment {
    .ui-tabs__nav {
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      padding: 3px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid var(--color-border);
    }
    .ui-tabs.stretch .ui-tabs__nav { width: 100%; }
    .ui-tabs.stretch .ui-tabs__item { flex: 1; justify-content: center; }
    .ui-tabs__item {
      border-radius: $radius-sm;
      padding: 6px 16px;
      &.is-active {
        background: var(--color-primary);
        color: #fff;
        box-shadow: 0 2px 8px rgba(30,111,255,0.4);
      }
    }
    .ui-tabs__active-bar { display: none; }
  }
}
</style>
