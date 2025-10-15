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

  </div>
</template>
<script setup>
import { get_monthly_real_time_forecast, get_daily_real_time_forecast } from '@/api'
import { useRTForecastStore } from '@/store'
import { watch, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { createImagePreloader } from '@/utils/imagePreloader'

const rtForecastStore = useRTForecastStore();

const sphereRef = ref(null);

const curImagesUrl = ref([]) // 当前使用的图片URL列表
const fetchedDailyUrls = ref([])
const fetchedMonthlyUrls = ref([])

// 加载动画开关
// const isLoading = ref(true)

// 预加载器实例
let dailyPreloader = null
let monthlyPreloader = null

// 当 preloader 有进度更新时同步回组件状态
function handleProgress(index, status, name) {
  console.debug(`[preloader:${name}] #${index} -> ${status}`)
}

// 获取按日的图片列表并启动 preloader
const getDailyImages = async () => {
  try {
    const res = await get_daily_real_time_forecast();
    const urls = (res || []).map(item => item.path || item.url || item);
    fetchedDailyUrls.value = urls;
    dailyPreloader = createImagePreloader(urls, {
      concurrency: 3,
      initialBatch: 3,
      onProgress: handleProgress,
      name: 'daily'
    });

    // 先加载 initial batch，等待它完成再继续（用于首次渲染）
    await dailyPreloader.loadInitial();
    // 如果当前是 daily 视图，确保 curImagesUrl 更新到已就绪的 daily 列表
    if (rtForecastStore.dateType === 'daily') curImagesUrl.value = fetchedDailyUrls.value;
  } catch (err) {
    console.error('Failed to fetch daily images:', err);
  }
}


// 获取按月的图片列表并启动 preloader（后台加载）
const getMonthlyImages = async () => {
  try {
    const res = await get_monthly_real_time_forecast();
    const urls = (res || []).map(item => item.path || item.url || item);
    fetchedMonthlyUrls.value = urls;
    monthlyPreloader = createImagePreloader(urls, {
      concurrency: 2,
      initialBatch: 0, // 月份不需要阻塞初次渲染
      onProgress: handleProgress,
      name: 'monthly'
    });

    // background load all (don't await here to avoid blocking)
    monthlyPreloader.loadAll().then(() => console.info('monthly preload finished'));
  } catch (err) {
    console.error('Failed to fetch monthly images:', err);
  }
}


watch(() => rtForecastStore.dateType, async (newVal) => {
  if (newVal === 'daily') {
    curImagesUrl.value = fetchedDailyUrls.value;
  } else {
    curImagesUrl.value = fetchedMonthlyUrls.value;
  }
  nextTick().then(() => {
      sphereRef.value && sphereRef.value.restart(); // 重置球的状态

  });
});


onMounted(async () => {
  rtForecastStore.isLoading = true;
  // 并行发起两个请求，但我们会等待 daily 的初始批完成以供首屏渲染
  await Promise.allSettled([getDailyImages(), getMonthlyImages()]);

  // 将 daily 的剩余图片在后台继续加载
  if (dailyPreloader) {
    dailyPreloader.loadAll().then(() => console.info('daily preload finished'));
  }

  // 尝试初始化子组件（如果子组件提供 initCesium）
  if (sphereRef.value && typeof sphereRef.value.initCesium === 'function') {
    try { sphereRef.value.initCesium(); } catch (e) { console.warn('initCesium failed', e); }
  }

})

onUnmounted(() => {
  if (sphereRef.value) {
    sphereRef.value = null
  }
  if (dailyPreloader) {
    dailyPreloader.cancelAll()
    dailyPreloader = null
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

    &:deep(.tabs.is-toggle li + li) {
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