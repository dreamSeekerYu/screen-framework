<template>
  <ScreenContainer v-if="!$route.meta?.noScale">
    <router-view v-slot="{ Component }">
      <!-- <div class="router-link-container">
        <RouterLink v-for="(route, index) in routeList" :key="index" :to="route.path"> {{ route.name }}</RouterLink>
      </div> -->
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </ScreenContainer>
  <div v-else class="full-page">
    <div class="router-link-container full-page-links">
      <RouterLink v-for="(route, index) in routeList" :key="index" :to="route.path"> {{ route.name }}</RouterLink>
    </div>
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </div>
  <!-- 全局动态导航器：Ctrl+K 唤起 -->
  <DynamicNavigator />
  <!-- 移动端 / 平板：右下角常驻【下一页】翻页箭头（桌面端自动不渲染） -->
  <PagePager />
</template>


<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenContainer from '@/components/layout/ScreenContainer.vue'
import DynamicNavigator from '@/components/common/DynamicNavigator.vue'
import PagePager from '@/components/common/PagePager.vue'
import router from '@/router'
import { RouterLink } from "vue-router";
import { loadData, loadSheet, preloadAll } from '@/utils/dataLoader.js'
import {
  getRowsFromSheet,
  indexSheet,
  getCell,
  cellText,
  getRange,
  cellOfRow,
  toGrid,
  getImgPath,
  hasData,
  rightMostFilledCol,
  latestFilledCols,
} from '@/utils/getDataFromJson.js'

const route = useRoute()
const routeList = ref(router.options.routes);

// 根据路由动态切换body滚动权限：组件演示页允许整体滚动，大屏页保持禁止滚动
const updateBodyScroll = () => {
  if (route.meta?.noScale) {
    document.body.classList.add('body-scrollable')
    document.documentElement.classList.add('body-scrollable')
  } else {
    document.body.classList.remove('body-scrollable')
    document.documentElement.classList.remove('body-scrollable')
  }
}
onMounted(updateBodyScroll)
watch(() => route.path, updateBodyScroll)
// console.log(router.options.routes)

// ============ 异步加载数据（public/data/*.json，不再打进主包）============
// 保留原有全部调试 console.log 与注释代码，逻辑顺序不变
;(async () => {
  // 并行拉取 4 份数据，主包不再包含任何大 JSON
  const [packJson, mainJson, lpaJson, planJson] = await Promise.all([
    loadData('pack'),
    loadData('main'),
    loadData('lpa'),
    loadData('plan'),
  ])

  // 获取单元格/区域数据
  const packSheet = indexSheet(packJson.sheets[0]);
  console.log('packSheet.....',packSheet)
  // console.log(getCell(packSheet,8,10))
  // console.log(getRange(packSheet,6,4,8,20))

  // const totalSheet = indexSheet(jsonData.sheets[0]);
  const totalSheet = indexSheet(mainJson.sheets[1]);
  console.log('totalSheet.....',totalSheet)
  // console.log(getCell(totalSheet, 8, 10))
  // console.log(getRange(totalSheet, 6, 4, 30, 20))
  // console.log(totalSheet.rowByNo.get(24))

  // console.log(totalSheet.colByName['CW43'], hasData(totalSheet, 'CW43'))
  // console.log(totalSheet.colByName['CW44'], hasData(totalSheet, 'CW44'))

  // 最新一列列号(填充率大于40%的列号，从右向左找第一个有数据的列)
  const mostFilledCol = rightMostFilledCol(totalSheet)
  console.log('mostFilledCol.....',mostFilledCol)
  // console.log(getCell(totalSheet, 1, mostFilledCol - 1))
  // console.log(getCell(totalSheet, 2, mostFilledCol - 1))
  // console.log(getCell(totalSheet, 1, mostFilledCol))
  // console.log(getCell(totalSheet, 2, mostFilledCol))
  // console.log(getCell(totalSheet, 1, mostFilledCol + 1))
  // console.log(getCell(totalSheet, 2, mostFilledCol + 1))

  // 获取最近7周的、最新充填的7列列号，用于后续的图表绘制等操作
  // console.log(latestFilledCols(totalSheet))


  const PLAData = indexSheet(lpaJson.sheets[0]);
  // console.log(getCell(PLAData, 8, 10))
  // console.log(getRange(PLAData, 6, 4, 10, 20))
  // console.log(PLAData.colByName['日期'])
  // console.log(PLAData.colByName['问题图片'])
  // 获取图片真实地址
  // console.log(getImgPath(PLAData, PLAData.colByName['问题图片'][1]))
  // console.log(getImgPath(PLAData, 'img_9'))


  // 用起来：一行里「问题描述」（可能富文本）与「问题图片」
  // sheet.rows.forEach(row => {
  //   let descEl = document.createElement('div');
  //   let picsEl = document.createElement('div');
  //   const desc = cellOfRow(sheet, row, '问题描述');
  //   descEl.innerHTML = desc.html || desc.text;       // 有颜色渲染 HTML，否则纯文本
  //   const pics = cellOfRow(sheet, row, '问题图片');
  //   picsEl.innerHTML = pics.images.map(img => `<img src="${img.src}">`).join('');
  //   console.log(descEl)
  //   console.log(picsEl)
  // });



  // console.log(jsonData.sheets[0].rows)
  // 03---pack客户表现数据
  // console.log(getRowsFromSheet(packSheet, {
  //   startRow: 0,
  // }))
  // 04---统计数据--重大质量异常闭环
  getRowsFromSheet(mainJson, {
    startRow: 3,
    endRow: 24,
  })
  // 07---统计数据--过程能力达标率以及趋势
  getRowsFromSheet(mainJson, {
    startRow: 3,
    endRow: 24,
  })
  // 12---qc人力规划数据
  getRowsFromSheet(mainJson, {
    startRow: 3,
    endRow: 24,
  })

  // 16---周度工作计划数据
  const planSheet = indexSheet(planJson.sheets[0]);
  // console.log('16---周度工作计划数据', planSheet)
  getRowsFromSheet(planSheet)
  // 17---周度思考数据
  getRowsFromSheet(mainJson, {
    startRow: 3,
    endRow: 24,
  })

  // 首屏数据就位后，浏览器空闲时再预加载一次（幂等），便于后续页面切换秒开
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => preloadAll())
  }
})()
</script>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.router-link-container {
  position: fixed;
  left: -75px;
  top: 0;
  display: flex;
  flex-direction: column;
  z-index: 9999;

  a {
    display: block;
    margin-right: 30px;
  }
}

.full-page {
  width: 100%;
  min-height: 100vh;
  background: var(--color-bg-page);
  padding: 56px 24px 40px;
}

.full-page-links {
  position: fixed;
  right: 16px;
  top: 12px;
  left: auto;
  flex-direction: row;
  gap: 12px;
  z-index: 9999;

  a {
    margin-right: 0;
    font-size: 12px;
    color: var(--color-primary);
    background: var(--color-bg-card);
    padding: 4px 10px;
    border-radius: 4px;
    box-shadow: var(--shadow-card);
    text-decoration: none;
    transition: all 0.25s ease;

    &:hover {
      color: var(--color-primary-light);
      box-shadow: var(--shadow-hover);
    }
  }
}
</style>
