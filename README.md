# 数据可视化大屏开发框架

基于 Vue3 + Vite + 纯 JavaScript 构建的数据大屏开发框架，包含自适应缩放、主题切换、懒加载、通用组件封装等核心能力。

## ✨ 核心特性

- **📱 自适应缩放**：基于 `transform: scale()` 实现 1920×1080 设计稿等比缩放，内容双向居中，适配任意分辨率屏幕
- **🎨 多主题切换**：内置淡色商务（默认）/ 淡色青碧 / 科技深蓝 / 政务红金四套主题，支持自定义扩展，CSS变量实现无刷新切换，ECharts 图表自动随主题重绘
- **⚡ 多层懒加载**：路由懒加载 + 组件视口懒加载 + 资源懒加载，提升首屏加载速度
- **📊 ECharts 封装**：统一的图表基础组件，自动处理生命周期、resize响应、主题切换重绘
- **🧩 通用组件**：开箱即用的大屏标准组件（卡片、数字翻牌器、滚动列表、时间、进度条等）
- **🔧 工程化规范**：清晰的目录结构，统一的代码风格，按需引入依赖，体积优化

## 🚀 快速启动

确保本地已安装 Node.js 16+ 版本：

本项目统一使用 **yarn**（Yarn 1.22.22），请勿使用 npm / pnpm，也不要提交 `package-lock.json`。

```bash
# 1. 安装依赖
yarn install

# 2. 启动开发服务（默认端口8888，自动打开浏览器）
yarn dev

# 3. 构建生产包
yarn build

# 4. 预览生产构建
yarn preview
```

## 📁 目录结构

```
screen-framework/
├── public/                 # 静态资源目录
├── src/
│   ├── assets/
│   │   ├── styles/         # 全局样式
│   │   │   ├── variables.scss   # SCSS变量 + 三套主题CSS变量
│   │   │   └── global.scss      # 全局重置样式
│   │   ├── images/         # 图片资源
│   │   └── icons/          # 图标资源
│   ├── components/
│   │   ├── layout/         # 布局组件
│   │   │   ├── ScreenContainer.vue  # 自适应缩放容器（核心）
│   │   │   └── ScreenHeader.vue     # 大屏通用头部
│   │   ├── common/         # 通用UI组件
│   │   │   ├── ScreenCard.vue       # 标准卡片容器（带角标装饰）
│   │   │   ├── ThemeSwitch.vue      # 主题切换按钮
│   │   │   └── TimeClock.vue        # 实时时间显示
│   │   ├── chart/          # 图表组件
│   │   │   └── BaseChart.vue        # ECharts基础封装
│   │   └── data/           # 数据展示组件
│   │       └── NumberCounter.vue    # 数字滚动翻牌器
│   ├── composables/        # 组合式函数
│   │   ├── useResize.js            # 窗口resize防抖监听
│   │   ├── useLazyLoad.js          # 元素视口懒加载
│   │   ├── useTouchDevice.js       # 触屏设备判定
│   │   ├── useCarousel.js          # 大屏轮播（多页游标联动）
│   │   ├── useTimeWindow.js        # 时间窗口（近4周/12周/月/全部）
│   │   ├── useMarkPointLink.js     # ECharts markPoint 跨图联动
│   │   └── usePageOverflowGuard.js # 页面溢出看门狗
│   ├── stores/             # Pinia状态管理
│   │   └── theme.js        # 主题状态管理
│   ├── router/             # 路由配置
│   │   └── index.js
│   ├── utils/              # 工具函数
│   │   ├── request.js      # Axios请求封装
│   │   └── echarts.js      # ECharts按需引入注册
│   ├── api/                # 接口请求
│   ├── views/              # 页面视图
│   │   └── Home/
│   │       └── index.vue   # 首页演示示例
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── index.html              # HTML入口
├── vite.config.js          # Vite配置
└── package.json
```

## 🧩 核心组件使用说明

### 1. ScreenContainer 自适应容器
包裹在最外层，自动处理屏幕等比缩放，所有内容都写在容器内部即可，尺寸直接按1920×1080设计稿写px：

```vue
<ScreenContainer>
  <!-- 你的大屏内容 -->
</ScreenContainer>
```

### 2. ScreenCard 标准卡片
大屏通用卡片容器，带四角装饰、标题栏：

```vue
<ScreenCard title="卡片标题">
  <div>卡片内容</div>
  <template #extra>右侧扩展区域</template>
</ScreenCard>
```

### 3. BaseChart 图表组件
统一封装ECharts，传入option即可，自动响应resize、主题变化：

```vue
<BaseChart :option="chartOption" @chart-click="handleClick" />
```

### 4. NumberCounter 数字翻牌器
数字从0滚动到目标值，支持千分位、前后缀、小数位数：

```vue
<NumberCounter :value="128569" suffix="人" :duration="1500" />
```

### 5. 组件懒加载
使用 `useLazyLoad` 实现元素进入视口才渲染，适合非首屏图表延迟加载：

```js
import { useLazyLoad } from '@/composables/useLazyLoad'

const { targetRef, isVisible } = useLazyLoad()
```

```vue
<div ref="targetRef">
  <BaseChart v-if="isVisible" :option="option" />
</div>
```

## 🎨 自定义主题

在 `src/assets/styles/variables.scss` 中添加新主题（复制任一主题块并覆盖全部变量）：

```scss
:root[data-theme='your-theme-key'] {
  --color-primary: #你的主色;
  // ... 覆盖其他变量（背景/文字/边框/语义色/阴影/图表色系等全套）
}
```

然后在 `src/stores/theme.js` 的 `THEMES` 数组中添加对应配置即可（数组第一项为默认主题）。

> ⚠️ 规范：业务组件/页面中禁止硬编码颜色，一律引用 `--color-*` 系列变量或 `color-mix()` 组合；
> ECharts option 中可直接写 `'var(--color-primary)'` 字符串，`BaseChart` 会自动解析并在主题切换时重绘。

## 📊 ECharts 扩展图表类型

在 `src/utils/echarts.js` 中引入需要的图表类型和组件即可自动注册使用。
