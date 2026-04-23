<template>
    <div class="cesiumComponentContainer">
        <div id="cesiumContainer"></div>
        <div class="controllerContainer ">
            <div class="playAndPause">
                <vue-fontawesome @click="$emit('handlePlay')" icon="circle-play" class="has-text-white" size="lg"
                    v-show="!isPlaying" />
                <vue-fontawesome @click="$emit('handlePause')" icon="circle-pause" class="has-text-white" size="lg"
                    v-show="isPlaying" />
            </div>
            <section style="flex:1; margin: 0 10px;">
                <b-field>
                    <b-slider @change="sliderChange" v-model="currentIndex" :min="0"
                        :max="props.fetchedUrls.length || 14" ticks>
                        <template v-for="val, index in props.fetchedUrls.length" :key="val">
                            <b-slider-tick :value="val" class="desktop-only"> {{ sliderHint[index] }}</b-slider-tick>
                        </template>
                    </b-slider>
                </b-field>
            </section>
        </div>
    </div>

</template>

<script setup>
import * as Cesium from 'cesium'


import { useRTForecastStore } from '@/store'
const rtForecastStore = useRTForecastStore();

const RENDER_MODE_SINGLE_IMAGE = 'single-image'
const RENDER_MODE_TILE_TEMPLATE = 'tile-template'

const props = defineProps({
    initialCoords: { type: Array, default: () => [-180, -90, 180, 90] },
    autoStart: { type: Boolean, default: true },
    isPlaying: { type: Boolean, default: true },
    switchInterval: { type: Number, default: 5000 },
    fetchedUrls: { type: Array, default: () => [] },
    dateType: { type: String, default: 'daily' },
    renderMode: { type: String, default: RENDER_MODE_SINGLE_IMAGE },
    defaultImageUrl: { type: String, default: defaultImageUrl }
})




// 默认图层的贴图
import defaultImageUrl from "@/assets/images/basemap_8k.webp"



import { watch } from 'vue';

const viewer = ref(null) // 实例
const playState = { active: false, token: 0 } // 串行播放状态
let _creditEl = null
const MIN_SWITCH_INTERVAL = 2000 // 最短切换时间 2s

const currentIndex = ref(0)
const baseLayer = ref(null) // 默认图层
const currentLayer = ref(null) // 当前图层
const imageryLayers = ref(null) // 图层集合

const isSingleImageMode = computed(() => props.renderMode === RENDER_MODE_SINGLE_IMAGE)
const isTileTemplateMode = computed(() => props.renderMode === RENDER_MODE_TILE_TEMPLATE)

const getFrameUrl = (item) => {
    if (!item) return item
    if (typeof item === 'string') return item
    return item.cesiumUrl || item.url || item.path || item.displayUrl || item.cesium_image_url || item
}

const getRectangleFromCoords = (coords = props.initialCoords) => {
    const [west = -180, south = -90, east = 180, north = 90] = coords
    return Cesium.Rectangle.fromDegrees(west, south, east, north)
}

const getFrameRectangle = (item) => {
    const rectangle = item && typeof item === 'object' ? item.cesium_rectangle : null
    if (!rectangle) return getRectangleFromCoords()

    const { west, south, east, north } = rectangle
    return Cesium.Rectangle.fromDegrees(west, south, east, north)
}


// --------- 控制是否自动播放 -----------
// 等待当前场景瓦片加载到空闲，避免当前图层未加载完成就切下一张
const waitForTilesIdle = (timeout = 20000, quietMs = 250) => {
    if (!viewer.value || !viewer.value.scene || !viewer.value.scene.globe) return Promise.resolve()

    return new Promise((resolve) => {
        let finished = false
        let quietTimer = null
        let timeoutTimer = null

        const done = () => {
            if (finished) return
            finished = true
            if (quietTimer) clearTimeout(quietTimer)
            if (timeoutTimer) clearTimeout(timeoutTimer)
            try { removeListener && removeListener() } catch (e) { /* ignore */ }
            resolve()
        }

        const onProgress = (pendingRequests) => {
            if (finished) return
            if (pendingRequests > 0) {
                if (quietTimer) {
                    clearTimeout(quietTimer)
                    quietTimer = null
                }
                return
            }

            if (quietTimer) clearTimeout(quietTimer)
            quietTimer = setTimeout(done, quietMs)
        }

        const removeListener = viewer.value.scene.globe.tileLoadProgressEvent.addEventListener(onProgress)
        timeoutTimer = setTimeout(done, timeout)

        requestAnimationFrame(() => onProgress(0))
    })
}

const waitForFrameSettled = async (provider) => {
    if (isTileTemplateMode.value) {
        await Promise.all([
            waitForReadyWithTimeout(provider, 5000),
            waitForTilesIdle(20000, 250)
        ])
        return
    }

    await waitForReadyWithTimeout(provider, 5000)
}

const waitForMinimumStay = (frameStartAt) => new Promise((resolve) => {
    const rest = Math.max(0, MIN_SWITCH_INTERVAL - (Date.now() - frameStartAt))
    setTimeout(resolve, rest)
})

// 开始播放
const startPlaying = () => {
    if (playState.active) return
    playState.active = true
    const currentToken = ++playState.token

    ; (async () => {
        while (playState.active && currentToken === playState.token) {
            const switched = await switchToNextImage()
            if (!switched) break
            if (!playState.active || currentToken !== playState.token) break
        }
    })()
}

// 停止播放
const stopPlaying = () => {
    playState.active = false
    playState.token += 1
}

// 重新播放
const restart = async () => {
    stopPlaying()
    currentIndex.value = 0
    await switchToNextImage(0)
    startPlaying()

}


// 切换下一张图
const switchToNextImage = async (targetIndex) => {
    if (!props.fetchedUrls.length) return false

    let nextIndex
    if (targetIndex !== undefined) {
        nextIndex = targetIndex
    } else {
        nextIndex = (currentIndex.value + 1) % props.fetchedUrls.length
    }
    const frameStartAt = Date.now()
    const nextLayer = await updateToIndex(nextIndex % props.fetchedUrls.length)
    if (!nextLayer) return false

    const provider = nextLayer && nextLayer.imageryProvider;

    try { nextLayer.alpha = 0; nextLayer.show = false; } catch (e) { /* ignore */ }

    try {
        await waitForReadyWithTimeout(provider, 5000)
    } catch (err) {
        console.warn('nextLayer provider not ready, fallback,', err)
    }

    try {
        currentIndex.value = nextIndex;
        nextLayer.show = true;
        imageryLayers.value.raiseToTop(nextLayer);
        await animateAlpha(nextLayer, 0, 1, 600);

        try {
            if (currentLayer.value) imageryLayers.value.remove(currentLayer.value, true);
        } catch (e) { /* ignore */ }

        currentLayer.value = nextLayer;
    } catch (e) {
        console.warn('switchToNextImage error during show/animate', e);
        try { if (currentLayer.value) imageryLayers.value.remove(currentLayer.value, true); } catch (e) { }
        currentLayer.value = nextLayer;
        currentIndex.value = nextIndex;
    }

    await Promise.all([waitForFrameSettled(provider), waitForMinimumStay(frameStartAt)])
    return true
}


const initFirstLayer = async () => {
    currentIndex.value = 0
    currentLayer.value = await updateToIndex(currentIndex.value)

    if (!currentLayer.value) {
        rtForecastStore.isLoading = false
        return
    }

    try {
        const provider = currentLayer.value.imageryProvider
        await waitForFrameSettled(provider)
    } catch (e) {
        console.warn('init first layer wait failed', e)
    }

    rtForecastStore.isLoading = false
    startPlaying()
}



// 渐变动画
const animateAlpha = (layer, from, to, duration = 600) => {
    return new Promise((resolve) => {
        const start = performance.now();
        const loop = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const val = from + (to - from) * t;
            try { layer.alpha = val; } catch (e) { /* ignore */ }
            if (t < 1) requestAnimationFrame(loop);
            else resolve();
        };
        requestAnimationFrame(loop);
    });
};

// 带超时的 readyPromise 等待
const waitForReadyWithTimeout = (p, timeout = 5000) => {
    if (!p || !p.readyPromise) return Promise.resolve();
    let timer = null;
    return Promise.race([
        p.readyPromise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('provider ready timeout')), timeout);
        })
    ]).finally(() => {
        if (timer) clearTimeout(timer);
    });
};

// 创建默认底图 provider
const createBaseProvider = async () => {
    if (isSingleImageMode.value) {
        return await Cesium.SingleTileImageryProvider.fromUrl(props.defaultImageUrl, {
            rectangle: getRectangleFromCoords()
        })
    }

    return new Cesium.UrlTemplateImageryProvider({
        url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        minimumLevel: 0,
        maximumLevel: 7,
    });
};


// 初始化球体
const initCesium = async () => {
    const baseProvider = await createBaseProvider()

    if (!_creditEl) {
        _creditEl = document.createElement('div');
        _creditEl.style.position = 'absolute';
        _creditEl.style.width = '0px';
        _creditEl.style.height = '0px';
        _creditEl.style.overflow = 'hidden';
        _creditEl.style.left = '-9999px';
        _creditEl.style.top = '-9999px';
        document.body.appendChild(_creditEl);
    }

    viewer.value = new Cesium.Viewer('cesiumContainer', {
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        baseLayer: new Cesium.ImageryLayer(baseProvider),
        creditContainer: _creditEl
    })

    imageryLayers.value = viewer.value.imageryLayers

    try { baseLayer.value = viewer.value.imageryLayers.get(0); } catch (e) { baseLayer.value = null }

    try {
        viewer.value.scene.screenSpaceCameraController.minimumZoomDistance = 250000
        viewer.value.scene.screenSpaceCameraController.maximumZoomDistance = 20000000
        viewer.value.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0.0, 90.0, 8000000.0),
            orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_TWO,
                roll: 0.0,
            },
            duration: 2,
        })
    } catch (e) {
    }

    try {
        const baseProvider = baseLayer.value && baseLayer.value.imageryProvider;

        waitForReadyWithTimeout(baseProvider, 5000).then(() => {
            initFirstLayer()
        })
    } catch (e) {
        initFirstLayer()
    }
}


// 更新当前图层为目标index图层
const updateToIndex = async (index) => {
    if (index < 0 || index >= props.fetchedUrls.length) return;
    const item = props.fetchedUrls[index];
    const imageUrl = getFrameUrl(item);
    let layer;

    try {
        const provider = await createFrameProvider(item, imageUrl)
        layer = imageryLayers.value.addImageryProvider(
            provider
        );
    } catch (e) {
        console.warn('addImageryProvider error', e)
    }


    return layer;
}

const createFrameProvider = async (item, urlTemplate) => {
    if (isSingleImageMode.value) {
        return await Cesium.SingleTileImageryProvider.fromUrl(urlTemplate, {
             rectangle: getFrameRectangle(item)
        })
    }

    return new Cesium.UrlTemplateImageryProvider({
        url: urlTemplate,
        tilingScheme: new Cesium.GeographicTilingScheme(),
        minimumLevel: 0,
        maximumLevel: 6,
        hasAlphaChannel: true,
        rectangle: getRectangleFromCoords(),
    });
};


// ---------- 控件函数 ------------
const sliderChange = async (v) => {
    if (typeof v !== 'number' || v < 0 || v > props.fetchedUrls.length) return;
    if (!props.isPlaying) {
        await switchToNextImage(v);
        return
    };
    stopPlaying()
    await switchToNextImage(v);
    startPlaying()
}

// 监听播放状态变化
watch(() => props.isPlaying, (newVal) => {
    if (newVal) {
        startPlaying()
    } else {
        stopPlaying()
    }
})

// 根据daily or monthly 切换slider下方提示
const sliderHint = computed(() => {
    if (props.fetchedUrls && props.fetchedUrls.length > 0) {
        const first = props.fetchedUrls[0]
        if (first && typeof first === 'object' && first.date) {
            return props.fetchedUrls.map(item => item.date)
        }
    }

})



//  -----------------组件销毁
onBeforeUnmount(() => {
    if (viewer.value && !viewer.value.isDestroyed()) {
        try {
            viewer.value.destroy()
        } catch (e) {
            console.warn('destroy viewer error', e)
        }
    }
    try {
        if (_creditEl && _creditEl.parentNode) {
            _creditEl.parentNode.removeChild(_creditEl)
        }
    } catch (e) {
    }
    _creditEl = null
})

// 暴露给父组件调用
defineExpose({ initCesium, restart })

// 触发播放事件
defineEmits(['handlePlay', 'handlePause'])

</script>

<style scoped lang="scss">
.cesiumComponentContainer {
    width: 100vw;

}

#cesiumContainer {
    width: 100%;
    height: 70vh;
    margin: 30px 0;
    overflow: hidden;
}

.controllerContainer {
    display: flex;
    align-items: center;
    width: 70vw;
    margin: 0 auto;

    // slider填充背景颜色
    &:deep(.b-slider-fill) {
        background-color: #3e689d;
    }

    // slider刻度背景颜色
    &:deep(.b-slider-tick) {
        background-color: transparent;
    }

    &:deep(.b-slider-tick-label) {
        width: 80px;
        color: #fff;
    }
}


@media screen and (max-width: 768px) {
    .desktop-only {
        display: none !important;
    }
}
</style>
