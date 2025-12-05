<template>
    <div class="appNavContainer" :class="{ 'is-en': locale === 'en-US' }">
        <!-- 手机端菜单按钮 -->
        <div class="mobile-menu-toggle" @click="isMobileMenuOpen = true">
            <vue-fontawesome icon="bars" size="lg" />
        </div>

        <!-- 手机端侧边栏 -->
        <div class="mobile-drawer-overlay" v-if="isMobileMenuOpen" @click="isMobileMenuOpen = false"></div>
        <div class="mobile-drawer" :class="{ 'is-open': isMobileMenuOpen }">
            <div class="drawer-header">
                <span class="close-btn" @click="isMobileMenuOpen = false">
                    <vue-fontawesome icon="times" size="lg" />
                </span>
            </div>
            <ul class="mobile-nav-list">
                <router-link :to="item.link" v-for="item in [...leftList, ...rightList]" :key="item.name"
                    @click="isMobileMenuOpen = false">
                    <li class="mobile-nav-item" :class="{ active: route.path === item.link }">
                        {{ item.name }}
                    </li>
                </router-link>
            </ul>
            <div class="mobile-lang-switch">
                <div class="lang-option" :class="{ active: locale === 'zh-CN' }" @click="locale = 'zh-CN'">中文</div>
                <div class="lang-option" :class="{ active: locale === 'en-US' }" @click="locale = 'en-US'">English</div>
            </div>
        </div>

        <!-- 导航栏1 -->
        <ul class="navList desktop-only">
            <router-link :to="item.link" v-for="item, index in leftList" :key="item.name">
                <li class="navItem" :class="{ active: index === activeNavIndex }">
                    {{ item.name }}
                </li>
            </router-link>
        </ul>
        <div class="title">
            <h3 class="zh"> {{ t('nav.titleZh') }}</h3>
            <h3 class="cn">
                {{ t('nav.titleEn') }}
            </h3>
        </div>
        <!-- 导航栏2 -->
        <ul class="navList desktop-only">
            <router-link :to="item.link" v-for="item, index in rightList" :key="item.name">
                <li class="navItem" :class="{ active: index === activeNavIndex - leftList.length }">
                    {{ item.name }}
                </li>
            </router-link>
        </ul>
        <div class="lang-switch desktop-only">
            <b-dropdown v-model="locale" aria-role="list" position="is-bottom-left">
                <template #trigger>
                    <div class="lang-btn">
                        <span>{{ locale === 'zh-CN' ? '中文' : 'EN' }}</span>
                        <vue-fontawesome icon="chevron-down" size="xs" style="margin-left: 5px;" />
                    </div>
                </template>

                <b-dropdown-item value="zh-CN" aria-role="listitem">中文</b-dropdown-item>
                <b-dropdown-item value="en-US" aria-role="listitem">English</b-dropdown-item>
            </b-dropdown>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { t, locale } = useI18n();
const isMobileMenuOpen = ref(false);

// 左边的list
const leftList = computed(() => [
    {
        name: t('nav.realTimeForecast'),
        link: '/real-time-forecast',
    },
    {
        name: t('nav.forecastTest'),
        link: '/forecast-test',
    },
]);

// 右边的list
const rightList = computed(() => [
    {
        name: t('nav.modelInterpreter'),
        link: '/model-interpreter',
    },
    {
        name: t('nav.dynamicAnalysis'),
        link: '/dynamic-analysis',
    },
]);

// 计算当前激活的导航索引
const activeNavIndex = computed(() => {
    const path = route.path;
    const index1 = leftList.value.findIndex(item => item.link === path);
    const index2 = rightList.value.findIndex(item => item.link === path);

    if (index1 !== -1) {
        return index1;
    } else if (index2 !== -1) {
        return index2 + leftList.value.length; // 右边的索引需要加上左边的长度
    } else {
        return -1; // 没有匹配项
    }
});
</script>

<style lang="scss" scoped>
$nav-height: 80px;

.appNavContainer {
    position: relative;
    width: 100%;
    height: $nav-height;
    display: flex;
    justify-content: center;
    align-items: center;
    background-image: url('@/assets/images/app-top.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    padding: 0 70px;

    &.is-en {
        .navList li {
            font-size: 12px;
        }

        .title {
            .zh {
                font-size: 14px;
            }

            .cn {
                font-size: 10px;
            }
        }
    }

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

        &.desktop-only .active {
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


}

.lang-switch {
    position: absolute;
    right: 25px;
    top: 20px;
    z-index: 20;

    :deep(.dropdown-trigger) {
        .lang-btn {
            color: #d4edfd;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            border: 1px solid #d4edfd;
            padding: 2px 8px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 60px;

            &:hover {
                background-color: rgba(212, 237, 253, 0.2);
            }
        }
    }

    :deep(.dropdown-menu) {
        min-width: 100%;
        margin-top: 4px;

        .dropdown-content {
            background: #fff !important;
            border: 1px solid #d4edfd;
            padding: 0;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);

            .dropdown-item {
                color: #0f1c2e !important;
                padding: 6px 12px;
                font-size: 14px;
                text-align: center;

                &:hover {
                    background-color: #f5f5f5 !important;
                    color: #0f1c2e !important;
                }

                &.is-active {
                    background-color: #0f1c2e !important;
                    color: #fff !important;
                }
            }
        }
    }
}

// Mobile Menu Styles
.mobile-menu-toggle {
    display: none;
    position: absolute;
    left: 20px;
    top: 70px;
    transform: translateY(-50%);
    color: #fff;
    cursor: pointer;
    z-index: 30;
    padding: 10px;
    /* 增加点击区域 */
}

.mobile-drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
}

.mobile-drawer {
    position: fixed;
    top: 0;
    left: -280px;
    width: 280px;
    height: 100vh;
    background: #0f1c2e;
    z-index: 100;
    transition: left 0.3s ease;
    padding: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);

    &.is-open {
        left: 0;
    }

    .drawer-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;

        .close-btn {
            color: #fff;
            cursor: pointer;
            padding: 5px;
        }
    }

    .mobile-nav-list {
        flex: 1;
        list-style: none;
        padding: 0;
        margin: 0;

        a {
            text-decoration: none;
            display: block;
            margin-bottom: 15px;
        }

        .mobile-nav-item {
            color: #d4edfd;
            font-size: 16px;
            padding: 10px 15px;
            border-radius: 4px;
            transition: background 0.3s;

            &.active {
                background: rgba(212, 237, 253, 0.1);
                color: #fff;
                font-weight: bold;
            }
        }
    }

    .mobile-lang-switch {
        display: flex;
        justify-content: center;
        border-top: 1px solid rgba(212, 237, 253, 0.2);
        padding-top: 20px;
        margin-top: 20px;

        .lang-option {
            color: #d4edfd;
            padding: 5px 15px;
            cursor: pointer;
            font-size: 14px;
            border-radius: 4px;
            margin: 0 5px;

            &.active {
                background: #d4edfd;
                color: #0f1c2e;
                font-weight: bold;
            }
        }
    }
}

@media screen and (max-width: 768px) {
    .desktop-only {
        display: none !important;
    }

    .mobile-menu-toggle {
        display: block !important;
    }

    .appNavContainer {
        padding: 0 20px;
        justify-content: center;

        .title {
            align-self: center;
            text-align: center;
            width: 100%;

            .zh {
                font-size: 18px;
            }

            .cn {
                font-size: 10px;
            }
        }
    }
}
</style>