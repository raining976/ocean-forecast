import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'


// https://vite.dev/config/
export default defineConfig({
  base: '/seaice/',
  esbuild: {
    drop: ['console', 'debugger']
  },
  build: {
    rollupOptions: {
      output: {
        sanitizeFileName: (name) => {
          const sanitized = name.replace(/[^a-zA-Z0-9_.-]/g, '_')
          return sanitized.startsWith('_') ? `file${sanitized}` : sanitized
        }
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  plugins: [
    vue(),
    AutoImport({
      // 自动导入的库
      imports: [
        'vue',
        'vue-router',
        {
          pinia: [
            'defineStore'
          ]
        }
      ],
      dts: 'src/auto-imports.d.ts', // 生成声明文件
      eslintrc: {
        enabled: true, // 生成 .eslintrc-auto-import.json
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true
      }
    }),
    Components({
      // 扫描 src/components 下的组件文件夹，index.vue 作为组件入口
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true, // 递归扫描，确保识别 src/components/<Name>/index.vue 或更深层结构
      // 自定义解析器不需要，默认解析 .vue 的 export default
      dts: 'src/components.d.ts'
    }),
  ],
  server: {
    port: 3000
  },
})
