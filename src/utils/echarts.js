// ECharts 按需引入注册
import * as echarts from 'echarts/core'

// 引入图表类型
import { BarChart, LineChart, PieChart, GaugeChart, MapChart, ScatterChart } from 'echarts/charts'

// 引入组件
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent,
  GeoComponent,
  ToolboxComponent
} from 'echarts/components'

// 引入渲染器
import { CanvasRenderer } from 'echarts/renderers'

// 注册
echarts.use([
  // 图表
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  MapChart,
  ScatterChart,
  // 组件
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent,
  GeoComponent,
  ToolboxComponent,
  // 渲染器
  CanvasRenderer
])

export default echarts
