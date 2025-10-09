import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    { path: '/', redirect: '/real-time-forecast' },
    {
        path: '/home',
        name: 'Home',
        component: () => import('../view/Home/index.vue')
    },
    {
        path: '/real-time-forecast',
        name: 'RealTimeForecast',
        component: () => import('../view/RealTimeForecast/index.vue')
    },
    {
        path: '/forecast-test',
        name: 'ForecastTest',
        component: () => import('../view/ForecastTest/index.vue')
    },
    {
        path:'/model-interpreter',
        name: 'ModelInterpreter',
        component: () => import('../view/ModelInterpreter/index.vue')
    },
    {
        path:'/dynamic-analysis',
        name: 'DynamicAnalysis',
        component: () => import('../view/DynamicAnalysis/index.vue')
    }

]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
