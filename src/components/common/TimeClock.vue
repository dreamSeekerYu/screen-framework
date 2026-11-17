<template>
  <div class="time-clock">
    <span class="date">{{ dateStr }}</span>
    <span class="time">{{ timeStr }}</span>
    <!-- <span class="week">{{ weekStr }}</span> -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const dateStr = ref('')
const timeStr = ref('')
const weekStr = ref('')
let timer = null

const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const padZero = (num) => num.toString().padStart(2, '0')

const updateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = padZero(now.getMonth() + 1)
  const day = padZero(now.getDate())
  const hours = padZero(now.getHours())
  const minutes = padZero(now.getMinutes())
  const seconds = padZero(now.getSeconds())
  
  dateStr.value = `${year}-${month}-${day}`
  timeStr.value = `${hours}:${minutes}:${seconds}`
  weekStr.value = weekMap[now.getDay()]
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.time-clock {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  font-size: $font-md;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  
  .time {
    font-size: $font-lg;
    color: var(--color-text-primary);
    font-weight: 600;
    font-family: 'DIN Alternate', sans-serif;
  }
}
</style>
