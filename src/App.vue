<template>
  <ScreenContainer>
    <router-view v-slot="{ Component }">
      <div class="router-link-container">
        <RouterLink v-for="(route, index) in routeList" :key="index" :to="route.path"> {{ route.name }}</RouterLink>
      </div>
      <transition name="fade" mode="out-in">
        <component :is="Component" />

      </transition>
    </router-view>
  </ScreenContainer>
</template>


<script setup>
import { ref } from 'vue'
import ScreenContainer from '@/components/layout/ScreenContainer.vue'
import jsonData from './data/data.json'
import packData from './data/pack客户表现.json'
import planData from './data/周度工作计划.json'
import LPAData from './data/dataLPA.json'
import router from '@/router'
import { RouterLink } from "vue-router";
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
console.log(router.options.routes)
const routeList = ref(router.options.routes);
// 获取单元格/区域数据
const packSheet = indexSheet(packData.sheets[0]);
console.log(packSheet)
// console.log(getCell(packSheet,8,10))
// console.log(getRange(packSheet,6,4,8,20))

// const totalSheet = indexSheet(jsonData.sheets[0]);
const totalSheet = indexSheet(jsonData.sheets[1]);
console.log(totalSheet)
// console.log(getCell(totalSheet, 8, 10))
// console.log(getRange(totalSheet, 6, 4, 30, 20))
// console.log(totalSheet.rowByNo.get(24))

// console.log(totalSheet.colByName['CW43'], hasData(totalSheet, 'CW43'))
// console.log(totalSheet.colByName['CW44'], hasData(totalSheet, 'CW44'))

// 最新一列列号(填充率大于40%的列号，从右向左找第一个有数据的列)
const mostFilledCol = rightMostFilledCol(totalSheet)
// console.log(mostFilledCol)
// console.log(getCell(totalSheet, 1, mostFilledCol - 1))
// console.log(getCell(totalSheet, 2, mostFilledCol - 1))
// console.log(getCell(totalSheet, 1, mostFilledCol))
// console.log(getCell(totalSheet, 2, mostFilledCol))
// console.log(getCell(totalSheet, 1, mostFilledCol + 1))
// console.log(getCell(totalSheet, 2, mostFilledCol + 1))

// 获取最近7周的、最新充填的7列列号，用于后续的图表绘制等操作
// console.log(latestFilledCols(totalSheet))


const PLAData = indexSheet(LPAData.sheets[0]);
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
getRowsFromSheet(jsonData, {
  startRow: 3,
  endRow: 24,
})
// 07---统计数据--过程能力达标率以及趋势
getRowsFromSheet(jsonData, {
  startRow: 3,
  endRow: 24,
})
// 12---qc人力规划数据
getRowsFromSheet(jsonData, {
  startRow: 3,
  endRow: 24,
})

// 16---周度工作计划数据
const planSheet = indexSheet(planData.sheets[0]);
// console.log('16---周度工作计划数据', planSheet)
getRowsFromSheet(planSheet)
// 17---周度思考数据
getRowsFromSheet(jsonData, {
  startRow: 3,
  endRow: 24,
})
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
  left: 0;
  top: 0;
  display: flex;
  z-index: 9999;

  a {
    display: block;
    margin-right: 30px;
  }
}
</style>
