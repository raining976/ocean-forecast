import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import 'bulma/css/bulma.css'
import 'buefy/dist/css/buefy.css'

import './style/global.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia).use(router).use(Buefy).mount('#app')
