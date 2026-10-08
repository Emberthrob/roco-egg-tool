import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    // 关闭 CSS 压缩：esbuild 会把未加前缀的 backdrop-filter 误删，导致毛玻璃效果失效
    cssMinify: false,
  },
})
