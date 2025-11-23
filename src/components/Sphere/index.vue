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
                            <b-slider-tick :value="val"> {{ sliderHint[index] }}</b-slider-tick>
                        </template>
                    </b-slider>
                </b-field>
            </section>
        </div>
    </div>

</template>

<script setup>
let Cesium = window.Cesium


import { useRTForecastStore } from '@/store'
const rtForecastStore = useRTForecastStore();

const props = defineProps({
    initialCoords: { type: Array, default: () => [-180, -90, 180, 90] },
    autoStart: { type: Boolean, default: true },
    isPlaying: { type: Boolean, default: true },
    switchInterval: { type: Number, default: 1500 },
    fetchedUrls: { type: Array, default: () => [] },
    dateType: { type: String, default: 'daily' } // daily or monthly

})




// 默认图层的贴图
import defaultImageUrl from "@/assets/images/default-earth-image.png"
import { watch } from 'vue';

const viewer = ref(null) // 实例
const switchTimer = { id: null } // 定时器句柄
let _creditEl = null

const currentIndex = ref(0)
const baseLayer = ref(null) // 默认图层
const currentLayer = ref(null) // 当前图层
const imageryLayers = ref(null) // 图层集合


// --------- 控制是否自动播放 -----------
// 开始播放
const startPlaying = () => {
    if (!switchTimer.id) {
        switchTimer.id = setInterval(switchToNextImage, props.switchInterval)
    }
}

// 停止播放
const stopPlaying = () => {
    if (switchTimer.id) {
        clearInterval(switchTimer.id)
        switchTimer.id = null
    }
}

// 重新播放
const restart = () => {
    stopPlaying()
    currentIndex.value = 0
    switchToNextImage(0)
    startPlaying()

}


// 切换下一张图
const switchToNextImage = (targetIndex) => {
    let nextIndex
    if (targetIndex !== undefined) {
        nextIndex = targetIndex
    } else {
        nextIndex = (currentIndex.value + 1) % props.fetchedUrls.length
    }
    const nextLayer = updateToIndex(nextIndex % props.fetchedUrls.length)

    // 等最新图层的 provider ready 后再移除旧图层，避免闪烁
    const provider = nextLayer && nextLayer.imageryProvider;

    // 先隐藏并置透明，等 provider ready 后再淡入显示
    try { nextLayer.alpha = 0; nextLayer.show = false; } catch (e) { /* ignore */ }

    waitForReadyWithTimeout(provider, 5000).then(async (res) => {
        try {
            currentIndex.value = nextIndex;
            nextLayer.show = true;
            imageryLayers.value.raiseToTop(nextLayer);
            await animateAlpha(nextLayer, 0, 1, 600);

            try {
                imageryLayers.value.remove(currentLayer.value, true);
            } catch (e) { /* ignore */ }

            currentLayer.value = nextLayer;
        } catch (e) {
            console.warn('switchToNextImage error during show/animate', e);
            try { imageryLayers.value.remove(currentLayer.value, true); } catch (e) { }
            currentLayer.value = nextLayer;
            currentIndex.value = nextIndex;
        }
    }).catch((err) => {
        // provider 未能就绪：回退为短延时后切换，避免无限等待
        console.warn('nextLayer provider not ready, fallback,', err);
        setTimeout(() => {
            try {
                imageryLayers.value.remove(currentLayer.value, true);
            } catch (e) { /* ignore */ }
            currentLayer.value = nextLayer;
            currentIndex.value = nextIndex;
        }, 100);
    });
}


const initFirstLayer = () => {
    currentIndex.value = 0
    currentLayer.value = updateToIndex(currentIndex.value)

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


// 初始化球体 
// 在前x张图预加载完成之后，初始化球体
// 包括创建实例，贴默认图，定位
const initCesium = async () => {
    // 在cesium申请的token
    Cesium.Ion.defaultAccessToken = undefined

    const provider = new Cesium.SingleTileImageryProvider({
        url: defaultImageUrl,
        rectangle: Cesium.Rectangle.fromDegrees(...props.initialCoords)
    })

    // 创建 viewer，不自动创建默认影像提供者
    // 为了隐藏左下角的 Cesium credit 链接，创建一个不可见的 creditContainer 并在组件卸载时移除，避免内存泄漏
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
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        imageryProvider: provider,
        creditContainer: _creditEl
    })

    imageryLayers.value = viewer.value.imageryLayers

    // 监听瓦片加载
    const tileLoadListener = viewer.value.scene.globe.tileLoadProgressEvent.addEventListener(function (pendingRequests) {
        if (pendingRequests === 0) {
            // 瓦片加载完成！现在我们等待这一帧被画出来

            // 使用 requestAnimationFrame 等待下一次绘制
            requestAnimationFrame(function () {
                // 在这里，我们可以非常有信心地说：
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

    // 在北极点创建一个不可见的实体作为我们的“锚点”
    const northPoleEntity = viewer.value.entities.add({
        // 位置：经度0, 纬度90 (北极点), 高度0
        position: Cesium.Cartesian3.fromDegrees(0, 90, 0),
        // 我们不给这个实体任何外观（如 point, billboard 等），所以它在场景中是不可见的
        description: 'North Pole Anchor'
    });


    // 将 Viewer 的相机设置为追踪这个实体
    // 这是实现“锁定”效果的关键。一旦设置，相机将始终朝向这个实体。
    viewer.value.trackedEntity = northPoleEntity;


    // 配置相机控制器
    const cameraController = viewer.value.scene.screenSpaceCameraController;

    // (a) 禁用倾斜(Tilt)功能。
    // 这样用户（例如通过按住中键或Ctrl+左键拖动）就无法改变相机的俯仰角，
    // 从而保持一个稳定的、类似2D地图的上帝视角。
    cameraController.enableTilt = true;

    // (b) 滚轮只用于缩放 (Zoom)。这是默认行为，我们确保它开启。
    cameraController.enableZoom = true;

    // (c) 鼠标拖动用于旋转 (Rotate)。这也是默认行为，我们确保它开启。
    cameraController.enableRotate = true;



    // (d) [关键] 再次应用约束轴，从根本上解决滚轮缩放时在极点产生的旋转问题。
    // 即使在追踪模式下，这个设置依然至关重要。
    cameraController.constrainedAxis = Cesium.Cartesian3.UNIT_Z;


    // 记录默认底图 layer 引用，供后续 ready 等待使用
    try { baseLayer.value = viewer.value.imageryLayers.get(0); } catch (e) { baseLayer.value = null }

    try {
        // 使用 flyTo 实现从高处飞向北极并旋转的动画
        const startHeight = 30000000; // 起始高度
        const endHeight = 15000000; // 结束高度
        const startPos = Cesium.Cartesian3.fromDegrees(0, 89.5, startHeight);
        const destination = Cesium.Cartesian3.fromDegrees(0, 90, endHeight);

        // 先设置瞬时到起始位置（不动画），再执行 flyTo
        viewer.value.camera.setView({ destination: startPos });

        await viewer.value.camera.flyTo({
            destination: destination,
            orientation: {
                heading: 0.0,
                pitch: -Math.PI / 2,
                roll: 0.0
            },
            duration: 2.0,
            easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
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
const updateToIndex = (index) => {
    if (index < 0 || index >= props.fetchedUrls.length) return;
    const imageUrl = props.fetchedUrls[index];
    let layer;
    try {
        layer = imageryLayers.value.addImageryProvider(
            new Cesium.SingleTileImageryProvider({
                url: imageUrl,
                rectangle: Cesium.Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0)
            })
        );
    } catch (e) {
        console.warn('addImageryProvider error', e)
    }


    return layer;
}


// ---------- 控件函数 ------------
const sliderChange = (v) => {
    if (typeof v !== 'number' || v < 0 || v > props.fetchedUrls.length) return;
    if (!props.isPlaying) {
        switchToNextImage(v);
        return
    };
    stopPlaying()
    switchToNextImage(v);
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

import { next12Months, next14Days } from '@/utils/dateUtils'
// 根据daily or monthly 切换slider下方提示
const sliderHint = computed(() => {
    if (props.dateType === 'daily') {
        return next14Days()
    } else {
        return next12Months()
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
    if (switchTimer.id) {
        clearInterval(switchTimer.id)
        switchTimer.id = null
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
        width: 60px;
        color: #fff;
    }
}
</style>
