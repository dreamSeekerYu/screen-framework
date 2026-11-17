<template>
  <div v-show="isActive" class="ui-tab-pane">
    <slot />
  </div>
</template>

<script setup>
import { inject, ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  name: { type: [String, Number], default: undefined },
  disabled: { type: Boolean, default: false },
  badge: { type: [String, Number], default: '' }
})

const tabs = inject('tabs', null)
const paneName = ref(props.name)

const isActive = computed(() => {
  if (!tabs) return true
  return tabs.currentName.value === paneName.value
})

onMounted(() => {
  if (tabs) {
    // 若未传 name，则用注册顺序作为 name
    paneName.value = props.name !== undefined ? props.name : tabs.panes.length
    tabs.addPane({
      label: props.label,
      name: paneName.value,
      disabled: props.disabled,
      badge: props.badge
    })
  }
})

onBeforeUnmount(() => {
  if (tabs) tabs.removePane(paneName.value)
})
</script>

<style scoped>
.ui-tab-pane {
  width: 100%;
  height: 100%;
}
</style>
