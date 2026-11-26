<template>
  <Teleport to="body">
    <Transition name="page-pager">
      <button
        v-if="visible"
        class="page-pager"
        type="button"
        :aria-label="`下一页：${nextPage?.title || ''}`"
        :title="`下一页：${nextPage?.title || ''}`"
        @click="goNext"
      >
        <span class="page-pager__text">下一页</span>
        <svg class="page-pager__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * 移动端 / 平板专用的右下角【下一页】翻页箭头
 *
 * - 仅触屏设备渲染，桌面浏览器不渲染（判定逻辑见 composables/useTouchDevice.js）
 * - 页面顺序取自 config/navPages.js，与全局导航器（Alt+K）共用同一份白名单，末尾循环
 * - Teleport 到 body：脱离 ScreenContainer 的 1920×1080 缩放上下文，
 *   按钮尺寸不随大屏缩放变化，手机上依然保持可点击的物理尺寸
 * - z-index 低于 Dialog(2000) 与导航器(9999)，弹窗 / 导航器打开时被自然盖住，不会误触
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navigateByStep, peekNavPage } from '@/config/navPages'
import { useIsTouchDevice } from '@/composables/useTouchDevice'

const router = useRouter()
const route = useRoute()
const isTouch = useIsTouchDevice()

// 下一页（随路由变化自动更新，仅用于标题 / 显隐判断）
const nextPage = computed(() => peekNavPage(router, route.path, 1))

// 展示条件：触屏设备 + 有下一页 + 页面未显式关闭（meta.hidePager）
const visible = computed(() => isTouch.value && !!nextPage.value && !route.meta?.hidePager)

// 与 Alt+] 快捷键完全同一个入口：同样的顺序、同样的兜底、同样的 router.push，
// 不额外做防连点限制（连按快捷键本身就会连续翻页，行为保持一致）
function goNext() {
  navigateByStep(router, route.path, 1)
}
</script>

<style scoped lang="scss">
.page-pager {
  position: fixed;
  // 安全区适配：刘海屏 / 全面屏底部 Home 条不会压住按钮
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  z-index: 900;

  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 44px;
  padding: 0 12px 0 16px;

  border: 1px solid color-mix(in srgb, #ffffff 30%, transparent);
  border-radius: 999px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: #ffffff;
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--color-primary) 42%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.18);

  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.4px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;

  &:active {
    transform: scale(0.94);
    box-shadow: 0 3px 10px color-mix(in srgb, var(--color-primary) 36%, transparent);
  }

  &__text {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
  }

  &__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    // 轻微呼吸位移：只动 transform（合成器友好），成本可忽略
    animation: pager-nudge 1.8s ease-in-out infinite;
  }
}

@keyframes pager-nudge {
  0%, 60%, 100% { transform: translateX(0); }
  75% { transform: translateX(3px); }
  88% { transform: translateX(0); }
}

/* 出现 / 消失过渡 */
.page-pager-enter-active,
.page-pager-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.page-pager-enter-from,
.page-pager-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.92);
}

/* 尊重系统「减弱动态效果」偏好 */
@media (prefers-reduced-motion: reduce) {
  .page-pager__icon { animation: none; }
  .page-pager { transition: none; }
}
</style>
