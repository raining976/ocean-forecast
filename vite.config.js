import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      // 自动导入的库
      imports: [
        'vue',
        'vue-router',
        {
          pinia: [
            'defineStore',
            // 可按需补充
          ]
        }
      ],
      dts: 'src/auto-imports.d.ts', // 生成声明文件
      eslintrc: {
        enabled: true, // 生成 .eslintrc-auto-import.json
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true
      }
    })
  ],
})
