<template>
  <div style="padding: 40px; background: #f5f7fa; min-height: 100vh;">
    <h2 style="margin-bottom: 24px; color: #1d2129;">📊 统计卡片组件 - 插槽用法演示</h2>
    
    <!-- 第一行：基础用法（原有props方式） -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">一、基础Props用法（原有方式完全兼容）</h3>
      <StatCard
        title="上周重点困难工作"
        explain="描述性文本 explain"
        :value="4"
        unit="项"
        status="warning"
        variant="default"
      />
      <StatCard
        title="下两周重点风险任务"
        explain="描述性文本 explain"
        :value="4"
        unit="项"
        status="danger"
        variant="default"
      />
      <StatCard
        title="核心风险卡点"
        explain="描述性文本 explain"
        :value="8"
        unit="项"
        status="primary"
        variant="default"
      />
      <StatCard
        title="需协调资源支持"
        explain="描述性文本 explain"
        :value="6"
        unit="项"
        status="success"
        variant="default"
      />
    </div>

    <!-- 第二行：样式变体演示 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">二、样式变体（outlined / plain / dash）</h3>
      <StatCard
        title="本周防错失效率"
        explain="CW44 零失效"
        value="0.0"
        unit="%"
        status="success"
        variant="outlined"
        brightness="light"
      />
      <StatCard
        title="累计防错项目"
        explain="覆盖5车间/11线体"
        :value="106"
        unit="项"
        status="primary"
        variant="default"
      />
      <StatCard
        title="本周防错失效"
        explain="CW44 新增"
        :value="0"
        unit="件"
        status="warning"
        variant="outlined"
        brightness="dark"
      />
      <StatCard
        title="未闭环失效项"
        explain="全部达标"
        :value="0"
        unit="项"
        status="info"
        variant="dash"
      />
      <StatCard
        title="零失效线体"
        explain="11条线体全覆盖"
        :value="11"
        unit="条"
        color="#722ed1"
        variant="plain"
        brightness="light"
      />
    </div>

    <!-- 第三行：插槽用法演示 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">三、插槽基础用法（局部自定义）</h3>
      
      <!-- 带图标前缀 -->
      <StatCard
        title="今日新增用户"
        explain="较昨日 +12.5%"
        :value="1286"
        unit="人"
        status="primary"
        variant="plain"
      >
        <template #prefix>
          <span style="margin-right: 10px; font-size: 28px;">👥</span>
        </template>
        <template #suffix>
          <span style="margin-left: 8px; font-size: 16px; color: #00b42a;">↑</span>
        </template>
      </StatCard>

      <!-- 自定义标题和数值 -->
      <StatCard
        explain="实时更新中"
        :value="98.6"
        unit="%"
        status="success"
        variant="outlined"
      >
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #00b42a;">●</span>
            <span>系统运行状态</span>
            <el-tag size="small" type="success" style="margin-left: auto;">正常</el-tag>
          </div>
        </template>
      </StatCard>

      <!-- 带右上角操作 -->
      <StatCard
        title="待处理工单"
        explain="超过24小时未处理: 3条"
        :value="24"
        unit="件"
        status="warning"
        variant="default"
      >
        <template #action>
          <span style="color: #4080ff; cursor: pointer; font-size: 14px;">查看全部 →</span>
        </template>
      </StatCard>

      <!-- 虚线边框自定义内容 -->
      <StatCard
        status="danger"
        variant="dash"
        brightness="light"
      >
        <template #title>
          <span style="color: #f53f3f;">⚠️ 异常告警</span>
        </template>
        <template #explain>
          <span style="color: #f53f3f;">CPU使用率超过90%，请及时处理</span>
        </template>
        <template #value>
          <span style="font-size: 42px; font-weight: bold; color: #f53f3f;">92%</span>
        </template>
      </StatCard>
    </div>

    <!-- 第四行：扩展插槽演示 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">四、扩展插槽（增加额外内容）</h3>
      
      <!-- 左侧扩展 -->
      <StatCard
        title="本月销售额"
        :value="128.5"
        unit="万"
        status="primary"
        variant="plain"
        brightness="light"
      >
        <template #left-extra>
          <div style="margin-top: 8px; font-size: 13px; color: #86909c;">
            目标完成率：<span style="color: #00b42a; font-weight: 600;">85.7%</span>
          </div>
        </template>
        <template #suffix>
          <span style="margin-left: 8px; font-size: 16px; color: #00b42a;">↑ 18.2%</span>
        </template>
      </StatCard>

      <!-- 右侧扩展 -->
      <StatCard
        title="订单总量"
        explain="近30天"
        :value="3682"
        unit="单"
        status="success"
        variant="default"
      >
        <template #right-extra>
          <div style="margin-top: 8px; font-size: 13px; color: #86909c; text-align: right;">
            退款率：<span style="color: #f53f3f;">1.2%</span>
          </div>
        </template>
      </StatCard>

      <!-- 尺寸演示 small -->
      <StatCard
        title="访问量"
        explain="今日"
        :value="12.8"
        unit="k"
        size="small"
        status="info"
        variant="outlined"
      >
        <template #suffix>
          <span style="margin-left: 6px; font-size: 14px; color: #86909c;">PV</span>
        </template>
      </StatCard>

      <!-- 尺寸演示 large -->
      <StatCard
        title="年度总营收"
        explain="2026年目标"
        :value="1.2"
        unit="亿"
        size="large"
        color="#eb2f96"
        variant="plain"
        brightness="dark"
      />
    </div>

    <!-- 第五行：完全自定义默认插槽 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">五、完全自定义（默认插槽覆盖全部布局）</h3>
      
      <!-- 完全自定义布局1：带进度条 -->
      <StatCard status="primary" variant="default" size="default">
        <div style="width: 100%;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <div>
              <div style="font-size: 18px; font-weight: 500; color: #1d2129;">项目完成进度</div>
              <div style="font-size: 14px; color: #86909c; margin-top: 4px;">剩余工期：15天</div>
            </div>
            <div style="font-size: 32px; font-weight: bold; color: #4080ff;">76%</div>
          </div>
          <div style="height: 8px; background: #e5e6eb; border-radius: 4px; overflow: hidden;">
            <div style="width: 76%; height: 100%; background: linear-gradient(90deg, #4080ff, #69b1ff); border-radius: 4px;"></div>
          </div>
        </div>
      </StatCard>

      <!-- 完全自定义布局2：多指标 -->
      <StatCard status="success" variant="plain" brightness="light">
        <div style="width: 100%; display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 28px; font-weight: bold; color: #00b42a;">128</div>
            <div style="font-size: 14px; color: #4e5969; margin-top: 4px;">已完成</div>
          </div>
          <div style="width: 1px; background: #c9cdd4;"></div>
          <div>
            <div style="font-size: 28px; font-weight: bold; color: #ff7d00;">24</div>
            <div style="font-size: 14px; color: #4e5969; margin-top: 4px;">进行中</div>
          </div>
          <div style="width: 1px; background: #c9cdd4;"></div>
          <div>
            <div style="font-size: 28px; font-weight: bold; color: #86909c;">8</div>
            <div style="font-size: 14px; color: #4e5969; margin-top: 4px;">待开始</div>
          </div>
        </div>
      </StatCard>

      <!-- 完全自定义布局3：图表迷你 -->
      <StatCard status="warning" variant="outlined">
        <div style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 16px; color: #4e5969;">转化率趋势</div>
            <div style="font-size: 36px; font-weight: bold; color: #ff7d00; margin-top: 4px;">4.82%</div>
            <div style="font-size: 13px; color: #00b42a; margin-top: 4px;">周同比 ↑ 0.6pp</div>
          </div>
          <div style="font-size: 48px;">📈</div>
        </div>
      </StatCard>
    </div>
  </div>
</template>

<script setup>
import StatCard from '@/components/common/StatCard.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
