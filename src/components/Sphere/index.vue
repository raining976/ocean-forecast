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

const props = defineProps({
    initialCoords: { type: Array, default: () => [-180, -90, 180, 90] },
    autoStart: { type: Boolean, default: true },
    isPlaying: { type: Boolean, default: true },
    switchInterval: { type: Number, default: 5000 },
    fetchedUrls: { type: Array, default: () => [] },
    dateType: { type: String, default: 'daily' }, // daily or monthly
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

        // 有些情况下事件不会立刻触发，这里主动检查一次
        requestAnimationFrame(() => onProgress(0))
    })
}

// 开始播放
const startPlaying = () => {
    if (playState.active) return
    playState.active = true
    const currentToken = ++playState.token

    // 串行循环：上一张加载完成后再切下一张
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

    // 等最新图层的 provider ready 后再移除旧图层，避免闪烁
    const provider = nextLayer && nextLayer.imageryProvider;

    // 先隐藏并置透明，等 provider ready 后再淡入显示
    try { nextLayer.alpha = 0; nextLayer.show = false; } catch (e) { /* ignore */ }

    try {
        await waitForReadyWithTimeout(provider, 5000)
    } catch (err) {
        // provider 未能就绪：仍然继续，后续走瓦片空闲等待兜底
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

    // 关键：需同时满足“至少展示2秒”与“瓦片加载到空闲”后才允许切下一张
    const minStayPromise = new Promise((resolve) => {
        const rest = Math.max(0, MIN_SWITCH_INTERVAL - (Date.now() - frameStartAt))
        setTimeout(resolve, rest)
    })
    await Promise.all([waitForTilesIdle(20000, 250), minStayPromise])
    return true
}


const initFirstLayer = async () => {
    currentIndex.value = 0
    currentLayer.value = await updateToIndex(currentIndex.value)

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
    if (props.dateType === 'monthly') {
        return await Cesium.SingleTileImageryProvider.fromUrl(props.defaultImageUrl, {
            rectangle: Cesium.Rectangle.fromDegrees(...props.initialCoords)
        })
    } else return new Cesium.UrlTemplateImageryProvider({
        url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        minimumLevel: 0,
        maximumLevel: 7,
    });
};


// 初始化球体 
// 在前x张图预加载完成之后，初始化球体
// 包括创建实例，贴默认图，定位
const initCesium = async () => {
    const baseProvider = await createBaseProvider()

    // // 创建 viewer，不自动创建默认影像提供者
    // // 为了隐藏左下角的 Cesium credit 链接，创建一个不可见的 creditContainer 并在组件卸载时移除，避免内存泄漏
    if (!_creditEl) {
        _creditEl = document.createElement('div');
        // 隐藏并放到 body 中，这样 Cesium 会写入 credit 内容到该元素，但用户不可见
        _creditEl.style.position = 'absolute';
        _creditEl.style.width = '0px';
        _creditEl.style.height = '0px';
        _creditEl.style.overflow = 'hidden';
        _creditEl.style.left = '-9999px';
        _creditEl.style.top = '-9999px';
        document.body.appendChild(_creditEl);
    }

    viewer.value = new Cesium.Viewer('cesiumContainer', {
        // Use a local ellipsoid terrain provider to avoid automatic requests
        // to Cesium Ion (https://assets.ion.cesium.com/...)
        // terrainProvider: new Cesium.EllipsoidTerrainProvider(),
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

    // 监听瓦片加载
    const tileLoadListener = viewer.value.scene.globe.tileLoadProgressEvent.addEventListener(function (pendingRequests) {
        if (pendingRequests === 0) {
            // 瓦片加载完成！现在我们等待这一帧被画出来

            // 使用 requestAnimationFrame 等待下一次绘制
            requestAnimationFrame(function () {
                // 1. 所有瓦片数据已加载。
                // 2. 包含这些清晰瓦片的帧已经被绘制到了屏幕上。
                rtForecastStore.isLoading = false; // 隐藏加载动画
                // 开始播放
                startPlaying()

            });
            // 别忘了移除监听器
            tileLoadListener();
        }
    });


    // 记录默认底图 layer 引用，供后续 ready 等待使用
    try { baseLayer.value = viewer.value.imageryLayers.get(0); } catch (e) { baseLayer.value = null }

    try {
        // 1. 限制最近距离 (对应最大 Zoom Level)
        // 设置为 250,000 米，约等于 Level 7
        viewer.value.scene.screenSpaceCameraController.minimumZoomDistance = 250000

        // 2. 限制最远距离 (对应最小 Zoom Level)
        // 防止用户缩小到看不见地球，设置为 20,000,000 米
        viewer.value.scene.screenSpaceCameraController.maximumZoomDistance = 20000000
        // 飞向北极
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
        // ignore
    }

    // 等默认底图 provider 就绪后再初始化第一张播放图，避免在底图未就绪时开始动画
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
    const imageUrl = item.path || item.url || item;
    let layer;

    try {
        const provider = await createTileProvider(imageUrl)
        layer = imageryLayers.value.addImageryProvider(
            provider
        );
    } catch (e) {
        console.warn('addImageryProvider error', e)
    }


    return layer;
}

const createTileProvider = async (urlTemplate) => {
    if (props.dateType === 'monthly') {
        return await Cesium.SingleTileImageryProvider.fromUrl(urlTemplate, {
            rectangle: Cesium.Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0)
        })
    } else
        return new Cesium.UrlTemplateImageryProvider({
            url: urlTemplate,
            tilingScheme: new Cesium.GeographicTilingScheme(),
            minimumLevel: 0,
            maximumLevel: 6,
            hasAlphaChannel: true,
            rectangle: Cesium.Rectangle.fromDegrees(
                -180, // 西
                30, // 南
                180, // 东
                90, // 北
            ),
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
    // 优先使用后端返回的日期
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
    // 移除之前创建的 credit container，防止内存泄漏
    try {
        if (_creditEl && _creditEl.parentNode) {
            _creditEl.parentNode.removeChild(_creditEl)
        }
    } catch (e) {
        // ignore
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
