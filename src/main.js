import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style/global.css'
import App from './App.vue'
import router from './router'

// 导入 Buefy 和 Bulma 样式
import Buefy from 'buefy'
import 'bulma/css/bulma.css'
import 'buefy/dist/css/buefy.css'


// 导入 Font Awesome 的核心部分
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCirclePause, faEarthAmericas,faCirclePlay} from '@fortawesome/free-solid-svg-icons'; // <-- 按需导入您想使用的图标
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// 这是 SVG Core 的工作方式：必须显式添加图标，这样最终打包时只会包含用到的图标
library.add(faCirclePause, faEarthAmericas,faCirclePlay);




const pinia = createPinia()
const app = createApp(App)

// 注册全局组件
app.component('vue-fontawesome', FontAwesomeIcon);

app.use(pinia).use(router).use(Buefy, {
    // 告诉 Buefy 使用 Font Awesome作为默认图标包
    defaultIconPack: 'fas', // 'fas' for solid, 'far' for regular, 'fab' for brands
    // 关键：告诉 Buefy 使用我们刚刚注册的 <vue-fontawesome> 组件来渲染图标
    defaultIconComponent: 'vue-fontawesome',
}).mount('#app')
