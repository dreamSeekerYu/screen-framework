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
  json: {
    // 禁止把 json 整体内联为 ES Module（避免意外 static import 再次把数据打进主包）
    stringify: false,
  },
  build: {
    outDir: 'dist',
    // gzip 前单 chunk 报警阈值
    chunkSizeWarningLimit: 1000,
    // 生产构建关闭 sourcemap（如需要调试可打开）
    sourcemap: false,
    // 启用 CSS 代码分割，避免样式被打入主包
    cssCodeSplit: true,
    // esbuild 压缩设置
    minify: 'esbuild',
    target: 'es2018',
    rollupOptions: {
      output: {
        // 分包策略：核心框架 / UI / ECharts 各自独立，便于浏览器缓存
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/]echarts[\\/]/.test(id)) return 'echarts'
            if (/[\\/]vue[\\/]/.test(id) || /[\\/]vue-router[\\/]/.test(id) ||
                /[\\/]pinia[\\/]/.test(id)) return 'vue-vendor'
            return 'vendor'
          }
          // src/data 下的 json 已迁移到 public/data，理论上不会再出现；
          // 这里加一层保险，万一有残留 import，强制走异步 chunk，避免撑大主包
          if (id.includes('/src/data/') && id.endsWith('.json')) {
            return 'data-json'
          }
        },
        // 产物按类型分目录，便于 CDN 缓存策略
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames(assetInfo) {
          const name = assetInfo.name || ''
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name)) {
            return 'assets/img/[name]-[hash][extname]'
          }
          if (/\.css$/i.test(name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          if (/\.(woff2?|ttf|eot|otf)$/i.test(name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      }
    }
  }
})
