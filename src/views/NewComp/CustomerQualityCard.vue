<template>
  <div class="demo-container" :class="`theme-${currentTheme}`">
    <!-- 顶部操作栏 -->
    <div class="demo-header">
      <h1 class="demo-title">客户质量卡片组件演示</h1>
      <button class="theme-toggle" @click="toggleTheme">
        切换到{{ currentTheme === 'light' ? '暗黑' : '亮色' }}主题
      </button>
    </div>

    <p class="demo-desc">
      通用 CustomerQualityCard 组件，支持标准/多项目两种布局、4种状态色系、亮/暗双主题
    </p>

    <!-- 卡片展示区 -->
    <div class="cards-grid">
      <!-- A1客户 - 关注状态 - 标准布局 -->
      <CustomerQualityCard title="A1客户" status="attention" layout="standard" :metrics="a1Metrics" :progress="85"
        remark="整体达标率 85%，需关注0KM异常" :theme="currentTheme" />

      <!-- A2客户 - 预警状态 - 标准布局 -->
      <CustomerQualityCard title="A2客户" status="warning" layout="standard" :metrics="a2Metrics" :progress="60"
        remark="整体达标率 60%，12MIS需重点关注" :theme="currentTheme" />

      <!-- A3客户 - 达标状态 - 标准布局 -->
      <CustomerQualityCard title="A3客户" status="success" layout="standard" :metrics="a3Metrics" :progress="95"
        remark="整体达标率 95%，质量表现优秀" :theme="currentTheme" />

      <!-- A4客户 - 达标状态 - 多项目布局 -->
      <CustomerQualityCard title="A4客户" status="success" layout="multi" :sections="a4Sections" :progress="80"
        remark="整体达标率 80%，小米N1外观需关注" :theme="currentTheme" />
    </div>

    <!-- 自定义状态示例 -->
    <h2 class="section-title">自定义色系示例</h2>
    <div class="cards-grid cards-grid-small">
      <CustomerQualityCard title="重点客户" status="custom" customColor="#f59e0b" statusText="待审核" layout="standard"
        :metrics="[
          { label: '0KM PPM', value: '1200', extra: '(WK44)', highlight: true },
          { label: '3MIS PPM', value: '85', extra: '(WK43)' },
          { label: '6MIS PPM', value: '32', extra: '达标' },
          { label: '12MIS PPM', value: '18', extra: '(26-2月)' }
        ]" :progress="72" remark="待审核客户，等待质量部确认" :theme="currentTheme" />

      <CustomerQualityCard title="风险客户" status="custom" customColor="#ef4444" statusText="高风险" layout="standard"
        :metrics="[
          { label: '0KM PPM', value: '5280', extra: '(WK44)', highlight: true },
          { label: '3MIS PPM', value: '156', extra: '(WK43)', highlight: true },
          { label: '6MIS PPM', value: '89', extra: '超标' },
          { label: '12MIS PPM', value: '45', extra: '(26-2月)' }
        ]" :progress="35" remark="质量风险较高，需立即介入处理" :theme="currentTheme" />
    </div>

    <!-- 使用示例代码展示 -->
    <h2 class="section-title">使用示例代码</h2>
    <div class="code-block">
      <pre><code>// 1. 引入组件
import CustomerQualityCard from './components/CustomerQualityCard.vue'

// 2. 标准PPM布局 - 预警状态
&lt;CustomerQualityCard
  title="A2客户"
  status="warning"
  layout="standard"
  :metrics="[
    { label: '0KM PPM', value: '2597', extra: '(WK40)', highlight: true },
    { label: '3MIS PPM', value: '2', extra: '(WK44)' },
    { label: '6MIS PPM', value: '71', extra: '(25-11月)' },
    { label: '12MIS PPM', value: '75.4', extra: '(WK44)', highlight: true }
  ]"
  :progress="60"
  remark="整体达标率 60%，12MIS需重点关注"
  theme="light"
/&gt;

// 3. 多项目布局 - 自定义颜色
&lt;CustomerQualityCard
  title="重点客户"
  status="custom"
  customColor="#f59e0b"
  layout="multi"
  :sections="[
    {
      title: 'M5-XP (D03E):',
      items: [
        { label: '0KM PPM峰值', value: '270', extra: '(WK43)', highlight: true }
      ]
    },
    {
      title: 'M6-XM (小米 N1):',
      items: [
        { label: '外观PPM', value: '988' },
        { label: '性能PPM', value: '142', extra: '达标' }
      ]
    }
  ]"
  :progress="80"
  theme="dark"
/&gt;</code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import CustomerQualityCard from '@/components/common/CustomerQualityCard.vue'

// 主题切换
const currentTheme = ref('light')
const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
}

// A1客户数据 - 关注
const a1Metrics = reactive([
  { label: '0KM PPM', value: '3745', extra: '(WK40)', highlight: true },
  { label: '3MIS PPM', value: '0', extra: '达标' },
  { label: '6MIS PPM', value: '0', extra: '达标' },
  { label: '12MIS PPM', value: '7', extra: '(26-2月)' }
])

// A2客户数据 - 预警
const a2Metrics = reactive([
  { label: '0KM PPM', value: '2597', extra: '(WK40)', highlight: true },
  { label: '3MIS PPM', value: '2', extra: '(WK44)' },
  { label: '6MIS PPM', value: '71', extra: '(25-11月)' },
  { label: '12MIS PPM', value: '75.4', extra: '(WK44)', highlight: true }
])

// A3客户数据 - 达标
const a3Metrics = reactive([
  { label: '0KM PPM', value: '2248', extra: '(峰值)', highlight: true },
  { label: '3MIS PPM', value: '0', extra: '达标' },
  { label: '6MIS PPM', value: '0', extra: '达标' },
  { label: '12MIS PPM', value: '0', extra: '达标' }
])

// A4客户数据 - 多项目布局
const a4Sections = reactive([
  {
    title: 'M5-XP (D03E):',
    items: [
      { label: '0KM PPM峰值', value: '270', extra: '(WK43)', highlight: true }
    ]
  },
  {
    title: 'M6-XM (小米 N1):',
    items: [
      { label: '外观PPM', value: '988' },
      { label: '性能PPM', value: '142', extra: '达标' }
    ]
  }
])
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.demo-container {
  min-height: 100vh;
  padding: 32px;
  transition: background-color 0.3s ease;
}

.demo-container.theme-light {
  background: #f0f7ff;
}

.demo-container.theme-dark {
  background: #0f172a;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.demo-title {
  font-size: 24px;
  font-weight: 700;
}

.theme-light .demo-title {
  color: #0f2b5c;
}

.theme-dark .demo-title {
  color: #f1f5f9;
}

.theme-toggle {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.theme-light .theme-toggle {
  background: #1e40af;
  color: white;
}

.theme-light .theme-toggle:hover {
  background: #1e3a8a;
}

.theme-dark .theme-toggle {
  background: #3b82f6;
  color: white;
}

.theme-dark .theme-toggle:hover {
  background: #2563eb;
}

.demo-desc {
  font-size: 14px;
  margin-bottom: 24px;
}

.theme-light .demo-desc {
  color: #4b5563;
}

.theme-dark .demo-desc {
  color: #94a3b8;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.cards-grid-small {
  grid-template-columns: repeat(2, 1fr);
  max-width: 900px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 24px 0 16px 0;
}

.theme-light .section-title {
  color: #1f2937;
}

.theme-dark .section-title {
  color: #e2e8f0;
}

.code-block {
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
}

.theme-light .code-block {
  background: #1e293b;
}

.theme-dark .code-block {
  background: #020617;
  border: 1px solid #334155;
}

.code-block pre {
  margin: 0;
}

.code-block code {
  color: #e2e8f0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.7;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .cards-grid-small {
    grid-template-columns: 1fr;
  }

  .demo-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
