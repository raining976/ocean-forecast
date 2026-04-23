<template>
  <div class="realTimeForecastContainer">
    <b-section class="switcherSection">
      <b-tabs type="is-toggle" size="is-small" v-model="rtForecastStore.dateType">
        <b-tab-item :label="t('realTimeForecast.future14Days')" value="daily"></b-tab-item>
        <b-tab-item :label="t('realTimeForecast.future12Months')" value="monthly"></b-tab-item>
      </b-tabs>
    </b-section>
    <Sphere :date-type="rtForecastStore.dateType" :render-mode="currentRenderMode" :fetched-urls="curImagesUrl"
      @handlePlay="rtForecastStore.play" @handlePause="rtForecastStore.pause" :is-playing="rtForecastStore.isPlaying"
      ref="sphereRef" />
  </div>
</template>
<script setup>
import { get_monthly_real_time_forecast, get_realtime_daily_prediction } from '@/api'
import { useRTForecastStore } from '@/store'
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { createImagePreloader } from '@/utils/imagePreloader'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const rtForecastStore = useRTForecastStore();

const sphereRef = ref(null);

const curImagesUrl = ref([])
const fetchedDailyUrls = ref([])
const fetchedMonthlyUrls = ref([])

const RENDER_MODE_SINGLE_IMAGE = 'single-image'
const RENDER_MODE_TILE_TEMPLATE = 'tile-template'

const legacyDailyTileMode = {
  renderMode: RENDER_MODE_TILE_TEMPLATE,
}

const modeConfigs = {
  [rtForecastStore.DAILY]: {
    renderMode: RENDER_MODE_SINGLE_IMAGE,
    preloadName: 'daily',
    concurrency: 3,
    initialBatch: 3,
    loadImages: get_realtime_daily_prediction,
    normalizeFrames: (items = []) => items.map((item) => ({
      ...item,
      displayUrl: item.path,
      cesiumUrl: item.cesium_image_url,
    })),
    getPreloadUrl: (item) => item.cesiumUrl || item.displayUrl || item.path || item.url || item,
  },
  [rtForecastStore.MONTHLY]: {
    renderMode: RENDER_MODE_SINGLE_IMAGE,
    preloadName: 'monthly',
    concurrency: 2,
    initialBatch: 0,
    loadImages: get_monthly_real_time_forecast,
    normalizeFrames: (items = []) => items.map((item) => ({
      ...item,
      displayUrl: item.path || item.url || item,
      cesiumUrl: item.cesiumUrl || item.path || item.url || item,
    })),
    getPreloadUrl: (item) => item.cesiumUrl || item.displayUrl || item.path || item.url || item,
  }
}

const preloaders = {
  [rtForecastStore.DAILY]: null,
  [rtForecastStore.MONTHLY]: null,
}

const currentConfig = computed(() => modeConfigs[rtForecastStore.dateType] || modeConfigs[rtForecastStore.DAILY])
const currentRenderMode = computed(() => currentConfig.value.renderMode)

function handleProgress(index, status, name) {
  console.debug(`[preloader:${name}] #${index} -> ${status}`)
}

function setFramesForType(type, frames) {
  if (type === rtForecastStore.DAILY) {
    fetchedDailyUrls.value = frames
  } else if (type === rtForecastStore.MONTHLY) {
    fetchedMonthlyUrls.value = frames
  }

  if (rtForecastStore.dateType === type) {
    curImagesUrl.value = frames
  }
}

function getFramesByType(type) {
  if (type === rtForecastStore.MONTHLY) return fetchedMonthlyUrls.value
  return fetchedDailyUrls.value
}

function disposePreloader(type) {
  const preloader = preloaders[type]
  if (!preloader) return
  preloader.cancelAll()
  preloaders[type] = null
}

async function setupModeData(type) {
  const config = modeConfigs[type]
  if (!config) return []

  const result = await config.loadImages()
  const frames = config.normalizeFrames(result || [])
  const preloadUrls = frames.map(config.getPreloadUrl).filter(Boolean)

  disposePreloader(type)
  preloaders[type] = createImagePreloader(preloadUrls, {
    concurrency: config.concurrency,
    initialBatch: config.initialBatch,
    onProgress: handleProgress,
    name: config.preloadName,
  })

  if (config.initialBatch > 0) {
    await preloaders[type].loadInitial()
  }

  setFramesForType(type, frames)

  preloaders[type].loadAll().then(() => console.info(`${config.preloadName} preload finished`))

  return frames
}

watch(() => rtForecastStore.dateType, async (newVal) => {
  curImagesUrl.value = getFramesByType(newVal)
  nextTick().then(() => {
    sphereRef.value && sphereRef.value.restart()
  })
})

onMounted(async () => {
  rtForecastStore.isLoading = true
  await Promise.allSettled([
    setupModeData(rtForecastStore.DAILY),
    setupModeData(rtForecastStore.MONTHLY)
  ])

  if (rtForecastStore.dateType === rtForecastStore.DAILY && !curImagesUrl.value.length) {
    curImagesUrl.value = fetchedDailyUrls.value
  }

  if (sphereRef.value && typeof sphereRef.value.initCesium === 'function') {
    try { sphereRef.value.initCesium() } catch (e) { console.warn('initCesium failed', e) }
  }
})

onUnmounted(() => {
  if (sphereRef.value) {
    sphereRef.value = null
  }

  disposePreloader(rtForecastStore.DAILY)
  disposePreloader(rtForecastStore.MONTHLY)

  void legacyDailyTileMode
})
</script>


<style scoped lang="scss">
.realTimeForecastContainer {
  position: relative;
  width: 100%;
//  height: 100vh;
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