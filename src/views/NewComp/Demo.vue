<template>
  <div class="demo-container">
    <h2>StatusTag 状态标签（修复后）</h2>

    <!-- 实心模式 -->
    <div class="demo-section">
      <p>solid 实色模式（浅色背景用）：</p>
      <div class="tag-demo-row">
        <StatusTag type="success" text="成功" />
        <StatusTag type="info" text="信息" />
        <StatusTag type="warning" text="警告" />
        <StatusTag type="danger" text="危险" />
        <StatusTag type="default" text="默认" />
      </div>
    </div>

    <!-- 浅底模式 -->
    <div class="demo-section">
      <p>light 浅底模式（浅色背景柔和风格）：</p>
      <div class="tag-demo-row">
        <StatusTag type="success" text="成功" effect="light" />
        <StatusTag type="info" text="信息" effect="light" />
        <StatusTag type="warning" text="警告" effect="light" />
        <StatusTag type="danger" text="危险" effect="light" />
        <StatusTag type="default" text="默认" effect="light" />
      </div>
    </div>

    <!-- 尺寸演示 -->
    <div class="demo-section">
      <p>三种尺寸（小/默认/大）：</p>
      <div class="tag-demo-row">
        <StatusTag type="success" text="小号" size="small" />
        <StatusTag type="success" text="默认" />
        <StatusTag type="success" text="大号" size="large" />
      </div>
    </div>
    <div class="demo-section">
      <p>方形非圆角标签（round=false）</p>
      <div class="tag-demo-row">
        <StatusTag type="success" text="成功" effect="light" :round="false" />
        <StatusTag type="info" text="信息" effect="light" :round="false" />
        <StatusTag type="warning" text="警告" effect="light" :round="false" />
        <StatusTag type="danger" text="危险" effect="light" :round="false" />
        <StatusTag type="default" text="默认" effect="light" :round="false" />
      </div>
    </div>

    <h2>SummaryBar 总结栏（1:1还原截图）</h2>

    <!-- 第一张截图：异常闭环 - 青蓝渐变 -->
    <div class="demo-section">
      <SummaryBar type="info"
        content="<span class='highlight'>连续6周实现100%按期闭环</span>，累计关闭245件零超期；本周新增5件全部按期完成，M6车间占4件（80%），异常类型集中在装配与焊接类；所有异常均制定永久对策，无流出风险。"
        :tags="[
          { text: '100%按期闭环', type: 'success' },
          { text: '零超期', type: 'info' },
          { text: '永久对策全覆盖', type: 'info' },
          { text: '零流出', type: 'info' }
        ]" />
    </div>

    <!-- 第二张截图：CPK质量 - 深蓝渐变 -->
    <div class="demo-section">
      <SummaryBar type="primary"
        content="<b>本期结论：</b>连续6周CPK达标率稳定在98.7%以上，工序平均CPK1.68处于良好水平；本周仅A3-P2工序2项动态测试因样本量少CPK略低，其余8工序100%达标，过程能力整体稳定可控。"
        :tags="[
          { text: '平均CPK 1.68', type: 'default' },
          { text: '8/9工序100%', type: 'default' },
          { text: '无重大风险', type: 'success' },
          { text: '下周补测A3-P2', type: 'info' }
        ]" />
    </div>

    <!-- 示例1：info青蓝渐变 - 异常闭环场景（对应第一张图） -->
    <SummaryBar type="info" icon="check"
      content="<span class='highlight'>连续6周实现100%按期闭环</span>，累计关闭245件零超期；本周新增5件全部按期完成，M6车间占4件（80%），异常类型集中在装配与焊接类；所有异常均制定永久对策，无流出风险。"
      :tags="[
        { text: '100%按期闭环', type: 'success', effect: 'plain' },
        { text: '零超期', type: 'default', effect: 'plain' },
        { text: '永久对策全覆盖', type: 'default', effect: 'plain' },
        { text: '零流出', type: 'info', effect: 'plain' }
      ]" style="margin-bottom: 16px;" />

    <!-- 示例2：primary深蓝渐变 - CPK质量场景（对应第二张图） -->
    <SummaryBar type="primary" icon="success"
      content="本期结论：<span class='highlight'>连续6周CPK达标率稳定在98.7%以上</span>，工序平均CPK1.68处于良好水平；本周仅A3-P2工序2项动态测试因样本量少CPK略低，其余8工序100%达标，过程能力整体稳定可控。"
      :tags="[
        { text: '平均CPK 1.68', type: 'default', effect: 'plain' },
        { text: '8/9工序100%', type: 'default', effect: 'plain' },
        { text: '无重大风险', type: 'success', effect: 'plain' },
        { text: '下周补测A3-P2', type: 'info', effect: 'plain' }
      ]" style="margin-bottom: 16px;" />

    <!-- 示例3：warning警告场景 -->
    <SummaryBar type="warning" icon="warning"
      content="注意：M5车间<span class='highlight'>CPK指标偏低</span>，当前值1.21低于预警线，需立即排查工艺参数，预计3个工作日完成整改。" :tags="[
        { text: 'CPK 1.21', type: 'default', effect: 'plain' },
        { text: '待整改', type: 'warning', effect: 'plain' },
        { text: '3工作日', type: 'info', effect: 'plain' }
      ]" style="margin-bottom: 16px;" />

    <!-- 示例4：danger异常场景 -->
    <SummaryBar type="danger" icon="error"
      content="告警：A3生产线出现<span class='highlight'>批量质量异常</span>，不良率达2.3%，已立即停线排查，根因为夹具偏移，预计24小时内恢复生产。" :tags="[
        { text: '停线整改', type: 'danger', effect: 'plain' },
        { text: '不良率2.3%', type: 'default', effect: 'plain' },
        { text: '24小时恢复', type: 'info', effect: 'plain' }
      ]" style="margin-bottom: 24px;" />

    <!-- 示例5：自定义图标插槽 -->
    <SummaryBar type="success" :show-icon="true">
      <template #icon>
        <span style="font-size: 14px; font-weight: 700;">99</span>
      </template>
      本周综合得分<span class="highlight">99分</span>，整体运行优秀，所有指标超额完成。
      <template #tags>
        <StatusTag text="优秀" type="success" effect="plain" />
      </template>
    </SummaryBar>

  </div>
</template>

<script setup>
import StatusTag from '@/components/common/StatusTag.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'
</script>

<style scoped>
.demo-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  background-color: #f0f7ff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-section {
  margin-bottom: 24px;
}

h2 {
  margin: 30px 0 16px 0;
  color: #1e293b;
  font-size: 20px;
}

p {
  margin: 0 0 12px 0;
  color: #475569;
  font-size: 14px;
}

.tag-demo-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>