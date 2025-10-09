<template>
    <div class="appNavContainer">
        <!-- 导航栏1 -->
        <ul class="navList">
            <router-link :to="item.link" v-for="item,index in leftList" :key="item.name">
                <li class="navItem" :class="{ active: index === activeNavIndex }">
                    {{ item.name }}
                </li>
            </router-link>
        </ul>
        <div class="title">
            <h3 class="zh"> “寒冰”北极海冰时空多尺度预报基础模型</h3>
            <h3 class="cn">
                Foundation Model for Arctic Sea Ice Spatio-Temporal Multi-Scale Forecasting
            </h3>
        </div>
        <!-- 导航栏2 -->
        <ul class="navList">
             <router-link :to="item.link" v-for="item,index in rightList" :key="item.name">
                <li class="navItem" :class="{ active: index === activeNavIndex - leftList.length }">
                    {{ item.name }}
                </li>
            </router-link>
        </ul>
    </div>
</template>

<script setup>
import { computed } from 'vue';
const route = useRoute();

// 计算当前激活的导航索引
const activeNavIndex = computed(() => {
    const path = route.path;
    const index1 = leftList.findIndex(item => item.link === path);
    const index2 = rightList.findIndex(item => item.link === path);

    if(index1 !== -1) {
        return index1;
    } else if(index2 !== -1) {
        return index2 + leftList.length; // 右边的索引需要加上左边的长度
    } else {
        return -1; // 没有匹配项
    }
});

// 左边的list
const leftList = [
    {
        name: '实时预报',
        link: '/real-time-forecast',
    },
    {
        name: '预报测试',
        link: '/forecast-test',
    },
]

// 右边的list
const rightList = [
    {
        name: '逐日模型可解释性',
        link: '/model-interpreter',
    },
    {
        name: '逐月动力学分析',
        link: '/dynamic-analysis',
    },
]


</script>

<style lang="scss" scoped>
.appNavContainer {
    width: 100%;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-image: url('@/assets/images/app-top.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;

    .title {
        color: #fff;
        align-self: flex-start;
        padding: 5px 0;

        .zh,
        .cn {
            margin: 0;
            padding: 0;
            text-align: center;
            font-weight: 700;
            font-size: 20px;
        }

        .cn {
            font-size: 12px;
        }
    }

    .navList {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        margin-top: -10px;

        li {
            margin: 0 10px;
            color: #d4edfd;
            font-weight: 700;
            font-size: 14px;
            height: 20px;
        }
    }

    .active {
        position: relative;
        background-image: url('@/assets/images/active-bg.png');
        background-repeat: no-repeat;
        background-size: 100% 100%;

        &::after {
            position: absolute;
            top: 20px;
            left: 0;
            content: "";
            width: 100%;
            height: 15px;
            background-image: url('@/assets/icons/active-arrow-down.png');
            background-repeat: no-repeat;
            background-size: contain;
            background-position: center;
        }
    }
}
</style>