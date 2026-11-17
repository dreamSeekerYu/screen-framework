<template>
  <div ref="chartRef" class="base-chart"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import echarts from '@/utils/echarts'
import { useResize } from '@/composables/useResize'
import { useThemeStore } from '@/stores/theme'
import { resolveCssVars } from '@/utils/color'

const props = defineProps({
  // 图表配置项
  option: {
    type: Object,
    required: true
  },
  // 是否显示加载动画
  loading: {
    type: Boolean,
    default: false
  },
  // 初始化配置
  initOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['chart-ready', 'chart-click'])

const chartRef = ref(null)
let chartInstance = null
const themeStore = useThemeStore()

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value, null, props.initOptions)
  
  // 绑定点击事件
  chartInstance.on('click', (params) => {
    emit('chart-click', params)
  })
  
  // 设置初始配置
  if (props.option) {
    const resolvedOption = resolveCssVars(props.option)
    chartInstance.setOption(resolvedOption)
  }
  
  // 控制加载动画
  if (props.loading) {
    chartInstance.showLoading()
  }
  
  emit('chart-ready', chartInstance)
}

// 更新图表配置
const updateChart = () => {
  if (!chartInstance || !props.option) return
  const resolvedOption = resolveCssVars(props.option)
  chartInstance.setOption(resolvedOption, true)
}

// 响应窗口大小变化
const resizeChart = () => {
  chartInstance?.resize()
}

// 主题变化时重新渲染
const handleThemeChange = () => {
  nextTick(() => {
    if (chartInstance) {
      chartInstance.dispose()
      initChart()
    }
  })
}

// 监听option变化
watch(() => props.option, updateChart, { deep: true })

// 监听loading状态
watch(() => props.loading, (val) => {
  if (!chartInstance) return
  val ? chartInstance.showLoading() : chartInstance.hideLoading()
})

// 监听主题变化
watch(() => themeStore.currentTheme, handleThemeChange)

useResize(resizeChart)

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  chartInstance?.dispose()
  chartInstance = null
})

// 暴露实例供外部调用
defineExpose({
  getInstance: () => chartInstance,
  resize: resizeChart
})
</script>

<style scoped lang="scss">
.base-chart {
  width: 100%;
  height: 100%;
}
</style>
