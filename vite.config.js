import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 注意：package.json 中声明了 "type": "module"，本配置文件按 ESM 加载，
      // ESM 下不存在 __dirname，故使用 fileURLToPath + import.meta.url 解析绝对路径
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8888,
    open: true,
    host: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/variables.scss" as *;`
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts'],
          vendor: ['vue', 'vue-router', 'pinia', 'axios']
        }
      }
    }
  }
})
