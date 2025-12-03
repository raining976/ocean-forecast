import { createI18n } from 'vue-i18n'
import zhCN from './languages/zh-CN.json'
import enUS from './languages/en-US.json'

// 获取浏览器语言
const getBrowserLanguage = () => {
  const language = navigator.language || navigator.userLanguage
  if (language.toLowerCase().includes('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: getBrowserLanguage(), // 默认语言
  fallbackLocale: 'en-US', // 备用语言
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
