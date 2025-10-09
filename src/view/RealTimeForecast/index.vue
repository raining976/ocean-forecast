<template>
    <div class="realTimeForecastContainer">
        <b-section class="switcherSection">
            <b-tabs type="is-toggle" size="is-small" v-model="rtForecastStore.dateType">
                <b-tab-item label="未来14日" value="daily"></b-tab-item>
                <b-tab-item label="未来12月" value="monthly"></b-tab-item>
            </b-tabs>
        </b-section>
        <!-- 球 -->
        <Sphere :date-type="rtForecastStore.dateType" :fetched-urls="curImagesUrl" @handlePlay="rtForecastStore.play"
            @handlePause="rtForecastStore.pause" :is-playing="rtForecastStore.isPlaying" ref="sphereRef" />
        <!-- /球 -->
        <!-- 加载动画 -->
        <b-loading
                :is-full-page="false"
                v-model="isLoading"
                :can-cancel="true"
            ></b-loading>
        <!-- /加载动画 -->
    </div>
</template>
<script setup>
import { get_monthly_real_time_forecast, get_daily_real_time_forecast } from '@/api'
import { useRTForecastStore } from '@/store'
import { watch } from 'vue';

const rtForecastStore = useRTForecastStore();

const sphereRef = ref(null);

const curImagesUrl = ref([]) // 当前使用的图片URL列表
const fetchedDailyUrls = ref([])
const fetchedMonthlyUrls = ref([])

// --- 1. 配置与状态管理 ---
const initialBatchSize = 3;      // 初始并行加载的数量
const isLoading = ref(true) // 前五张图片的加载动画 

// 状态追踪
// 使用一个数组来记录每个图片的状态: 'pending', 'loading', 'loaded', 'error'
const imageStatus = ref(null); // 图片加载状态数组 new Array(curImagesUrl.length).fill('pending');

// --- 2. 加载器模块 ---

/**
 * 预加载单个图片并更新其状态
 * @param {number} index 图片在数组中的索引
 */
function loadImage(index) {
    if (index >= curImagesUrl.value.length || imageStatus.value[index] !== 'pending') {
        return; // 防止越界或重复加载
    }

    const url = curImagesUrl.value[index];
    imageStatus.value[index] = 'loading';

    console.log(`开始加载: #${index}`);
    let img = new Image();
    img.src = url;

    const cleanup = () => {
        // 解除对闭包的引用，中断循环引用（虽然现代浏览器能处理，但这是好习惯）
        img.onload = null;
        img.onerror = null;
        // 明确表示我们不再需要这个对象
        img = null;
    };

    img.onload = () => {
        imageStatus.value[index] = 'loaded';
        console.log(`加载成功: #${index}`);
        cleanup();
    };
    img.onerror = () => {
        imageStatus.value[index] = 'error';
        console.error(`加载失败: #${index}`);
        cleanup();
    };

}


// --- 3. 管理与协调模块 ---

let backgroundLoadIndex = 0; // 追踪后台需要加载的图片索引

/**
 * 按顺序加载下一个未加载的图片
 */
function loadNextInBackground(concurrency = 1) {
    // 并行后台加载器：启动 `concurrency` 个 worker 并行去取下一个 pending 并加载
    if (!curImagesUrl.value || curImagesUrl.value.length === 0) {
        return Promise.resolve();
    }

    let active = 0;
    return new Promise((resolve) => {
        const tickInterval = 900; // ms，每个 tick 尝试发起新请求
        let tickTimer = null;

        const startTasksForTick = () => {
            // 启动新的 worker，直到达到并发上限或者没有待处理图片
            while (active < concurrency && backgroundLoadIndex < curImagesUrl.value.length) {
                const idx = backgroundLoadIndex++;
                if (imageStatus.value[idx] !== 'pending') {
                    continue;
                }

                active++;
                loadImage(idx);

                // 轮询该图片状态，完成后减少 active
                const timer = setInterval(() => {
                    const s = imageStatus.value[idx];
                    if (s === 'loaded' || s === 'error') {
                        clearInterval(timer);
                        active--;
                    }
                }, 200);
            }

            // 如果所有图片都处理完且没有活跃任务，完成并清理定时器
            if (backgroundLoadIndex >= curImagesUrl.value.length && active === 0) {
                if (tickTimer) clearInterval(tickTimer);
                resolve();
            }
        };

        // 每个 tick 调用一次，分散请求峰值
        tickTimer = setInterval(startTasksForTick, tickInterval);
        // 立即触发一次以避免等待第一个 tick
        startTasksForTick();
    });
}


/**
 * 程序入口：初始化并开始整个流程
 */
async function startLoadImages() {
    // UI: 显示加载动画
    isLoading.value = true;

    // **并行加载初始批次**
    const initialPromises = [];
    const end = Math.min(initialBatchSize, curImagesUrl.value.length);
    for (let i = 0; i < end; i++) {
        // loadImage(i) 会启动加载，但我们不需要在这里等待它
        // 我们创建一个Promise来知道它何时完成
        initialPromises.push(new Promise(resolve => {
            const check = setInterval(() => {
                if (imageStatus.value[i] === 'loaded' || imageStatus.value[i] === 'error') {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        }));

        loadImage(i);
    }

    // 初始化后台加载索引
    backgroundLoadIndex = end;
    // 等待所有初始图片加载完成
    await Promise.all(initialPromises);
    console.log("初始批次加载完成！");



    // 开始初始化Cesium
    // template 里需为 Sphere 增加 ref="sphereRef"
    // 尝试调用子组件的 initCesium，最多重试若干次以等待子组件挂载
    await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 5;
        const interval = setInterval(() => {
            attempts++;
            if (sphereRef.value && typeof sphereRef.value.initCesium === 'function') {
                clearInterval(interval);
                try {
                    // 将当前图片列表传入子组件的初始化函数（根据子组件定义调整参数）
                    sphereRef.value.initCesium();
                } catch (e) {
                    console.error('调用 initCesium 出错：', e);
                }
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('无法获取 Sphere 组件实例或 initCesium 方法不存在');
                resolve();
            }
        }, 100);
    });

    setTimeout(() => {
        loadNextInBackground().then(() => {
            console.log('所有图片加载完成！');
        });
    }, 2000);

    // UI: 隐藏加载动画
    isLoading.value = false;
}

// --- fetch远程资源 ---

// 获取按日的图片列表
const getDailyImages = async () => {
    await get_daily_real_time_forecast().then(res => {
        const urls = res.map(item => item.path)
        fetchedDailyUrls.value = urls
        curImagesUrl.value = urls
    }).catch(err => {
        console.error('Failed to fetch daily images:', err)
    })
}

// 获取按月的图片列表
const getMonthlyImages = async () => {
    await get_monthly_real_time_forecast().then(res => {
        const urls = res.map(item => item.path)
        fetchedMonthlyUrls.value = urls
        curImagesUrl.value = urls
    }).catch(err => {
        console.error('Failed to fetch monthly images:', err)
    })
}


// 切换日/月
const isDaily = ref(true)
watch(() => rtForecastStore.dateType, (newVal) => {
    if (newVal === 'daily') {
        if (fetchedDailyUrls.value.length === 0) {
            getDailyImages();
        } else {
            curImagesUrl.value = fetchedDailyUrls.value;
        }
    } else {
        if (fetchedMonthlyUrls.value.length === 0) {
            getMonthlyImages();
        } else {
            curImagesUrl.value = fetchedMonthlyUrls.value;
        }
    }
    imageStatus.value = new Array(curImagesUrl.value.length).fill('pending'); // 初始化状态数组
    sphereRef.value && sphereRef.value.restart(); // 重置球的状态
});


onMounted(async () => {
    await getDailyImages();
    imageStatus.value = new Array(curImagesUrl.value.length).fill('pending'); // 初始化状态数组
    startLoadImages();
})

onUnmounted(() => {
    // 清理工作
    if (sphereRef.value) {
        sphereRef.value = null
    }
});



</script>



<style scoped lang="scss">
.realTimeForecastContainer {
    position: relative;
    width: 100%;
    height: 100%;
    // margin-top: -25px;

    .switcherSection {
        position: absolute;
        top: 0;
        left: 10%;
        z-index: 2;

        &:deep(.tabs.is-toggle a) {
            color: #fff
        }

        &:deep(.tabs.is-toggle li + li){
            overflow: hidden;
        }

        &:deep(.tabs.is-toggle li.is-active a) {
            background-color: var(--color-primary);
            text-align: center;
            border-color: #fff;
            color: #fff;
            overflow: hidden;

        }
        &:deep(.tabs.is-toggle li a:hover) {
            background-color: var(--color-primary-light);
            border-color: #fff;

            color: #fff;    
        }
    }
}
</style>