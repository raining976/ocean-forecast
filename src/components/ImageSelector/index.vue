<template>
    <div class="image-selector-container">
        <div class="info-area">
            <!-- (调试用)
            <h4 class="title">最后选择区域尺寸：</h4>
            <p>宽度: {{ selection.width }}px</p>
            <p>高度: {{ selection.height }}px</p>
            <h4 class="title">角坐标:</h4>
            <p>左上: ({{ selection.x }}, {{ selection.y }})</p>
            <p>右上: ({{ topRight.x }}, {{ topRight.y }})</p>
            <p>左下: ({{ bottomLeft.x }}, {{ bottomLeft.y }})</p>
            <p>右下: ({{ bottomRight.x }}, {{ bottomRight.y }})</p> -->
            <b-button @click="clearSelection" size="is-small">{{ t('common.button.clearSelection') }}</b-button>
            <b-tooltip style="margin: 0 5px; line-height: 30px;" :label="t('components.imageSelector.defaultSelection')" position="is-right"
                type="is-dark"><vue-fontawesome icon="circle-exclamation" /></b-tooltip>
        </div>
        <div class="image-area" ref="imageAreaRef" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
            @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
            <img ref="imageRef" :src="imageUrl" alt="Selectable Image" @load="onImageLoad" draggable="false" />
            <div v-if="selection.active" class="selection-box" :style="selectionStyle"></div>
        </div>


    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 待划定选区的图片URL
const props = defineProps({
    imageUrl: {
        type: String,
        required: true
    },
    width: {
        type: Number,
        default: 432
    },
    height: {
        type: Number,
        default: 432
    },
});

const emit = defineEmits(['selection-string']);

const imageAreaRef = ref(null);
const imageRef = ref(null);
const isSelecting = ref(false);

const selection = reactive({
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    startX: 0,
    startY: 0,
});

const imageHeight = ref(0);
const imageWidth = ref(0);
const naturalWidth = ref(0);
const naturalHeight = ref(0);

let imageOffset = { left: 0, top: 0 };

// 图片加载完成后获取其在页面中的偏移量与显示高度
const onImageLoad = () => {
    if (imageAreaRef.value) {
        const rect = imageAreaRef.value.getBoundingClientRect();
        imageOffset.left = rect.left;
        imageOffset.top = rect.top;
    }
    if (imageRef.value) {
        // clientHeight 反映在页面上显示的高度（考虑 CSS 缩放）
        imageHeight.value = Math.round(imageRef.value.clientHeight || imageRef.value.naturalHeight || 0);
        imageWidth.value = Math.round(imageRef.value.clientWidth || imageRef.value.naturalWidth || 0);
        // 获取图片原始尺寸
        naturalWidth.value = imageRef.value.naturalWidth || 0;
        naturalHeight.value = imageRef.value.naturalHeight || 0;
    }
    // 不在图片加载时触发父级更新，等待用户完成选择后再 emit
};

const handleMouseDown = (event) => {
    event.preventDefault();
    // 确保是在图片区域内开始
    if (!imageAreaRef.value) return;

    isSelecting.value = true;
    selection.active = true;

    const rect = imageAreaRef.value.getBoundingClientRect();
    // 取整，保证所有 selection 变量为整数
    selection.startX = Math.round(event.pageX - rect.left - window.scrollX);
    selection.startY = Math.round(event.pageY - rect.top - window.scrollY);

    // 初始化选区（整数）
    selection.x = selection.startX;
    selection.y = selection.startY;
    selection.width = 0;
    selection.height = 0;
    // 不在按下时触发，等待用户完成选择
};

const handleMouseMove = (event) => {
    if (!isSelecting.value) return;

    const rect = imageAreaRef.value.getBoundingClientRect();
    const currentX = event.pageX - rect.left - window.scrollX;
    const currentY = event.pageY - rect.top - window.scrollY;

    // 处理反向拖拽并保持整数
    if (currentX < selection.startX) {
        selection.x = Math.round(currentX);
        selection.width = Math.round(selection.startX - currentX);
    } else {
        selection.x = Math.round(selection.startX);
        selection.width = Math.round(currentX - selection.startX);
    }

    if (currentY < selection.startY) {
        selection.y = Math.round(currentY);
        selection.height = Math.round(selection.startY - currentY);
    } else {
        selection.y = Math.round(selection.startY);
        selection.height = Math.round(currentY - selection.startY);
    }

    // 不在移动过程中触发事件，避免高频更新
};

const handleMouseUp = () => {
    isSelecting.value = false;
    if (selection.width === 0 && selection.height === 0) {
        // 如果没有拖动，只是点击，则不保留选区
        clearSelection();
    }
    else {
        // 选取结束后一次性发出当前选区字符串
        emitSelectionString();
    }
};

const clearSelection = () => {
    selection.active = false;
    // 默认选择整张图片
    selection.width = imageWidth.value || naturalWidth.value || 0;
    selection.height = imageHeight.value || naturalHeight.value || 0;
    // 保持选区可见
    selection.x = 0;
    selection.y = 0;
    emitSelectionString();
};

const selectionStyle = computed(() => ({
    left: `${selection.x}px`,
    top: `${selection.y}px`,
    width: `${selection.width}px`,
    height: `${selection.height}px`,
}));

// 计算四个角的坐标（用于调试，基于页面坐标，整数）
const topRight = computed(() => ({
    x: Math.round(selection.x + selection.width),
    y: Math.round(selection.y),
}));

const bottomLeft = computed(() => ({
    x: Math.round(selection.x),
    y: Math.round(selection.y + selection.height),
}));

const bottomRight = computed(() => ({
    x: Math.round(selection.x + selection.width),
    y: Math.round(selection.y + selection.height),
}));

// 计算缩放比例
const scaleX = computed(() => {
    // 如果图片原始宽度存在，计算缩放比例使得最大宽度为304
    return naturalWidth.value > 0 ? props.width / naturalWidth.value : 1;
});

const scaleY = computed(() => {
    // 如果图片原始高度存在，计算缩放比例使得最大高度为448
    return naturalHeight.value > 0 ? props.height / naturalHeight.value : 1;
});

// 计算反转后的坐标（以图片底部为原点，Y' = imageHeight - y）并保证为整数
// 然后按照显示尺寸到原始尺寸的比例进行转换，再按照目标尺寸进行缩放
const invertedTopLeft = computed(() => {
    // 先将显示坐标转换为原始图片坐标
    const originalX = imageWidth.value > 0 ? (selection.x / imageWidth.value) * naturalWidth.value : selection.x;
    const originalY = imageHeight.value > 0 ? (selection.y / imageHeight.value) * naturalHeight.value : selection.y;
    // 再进行Y轴反转和缩放到目标尺寸
    return {
        x: Math.round(originalX * scaleX.value),
        y: Math.round((naturalHeight.value - originalY) * scaleY.value),
    };
});

const invertedTopRight = computed(() => {
    const originalX = imageWidth.value > 0 ? ((selection.x + selection.width) / imageWidth.value) * naturalWidth.value : (selection.x + selection.width);
    const originalY = imageHeight.value > 0 ? (selection.y / imageHeight.value) * naturalHeight.value : selection.y;
    return {
        x: Math.round(originalX * scaleX.value),
        y: Math.round((naturalHeight.value - originalY) * scaleY.value),
    };
});

const invertedBottomLeft = computed(() => {
    const originalX = imageWidth.value > 0 ? (selection.x / imageWidth.value) * naturalWidth.value : selection.x;
    const originalY = imageHeight.value > 0 ? ((selection.y + selection.height) / imageHeight.value) * naturalHeight.value : (selection.y + selection.height);
    return {
        x: Math.round(originalX * scaleX.value),
        y: Math.round((naturalHeight.value - originalY) * scaleY.value),
    };
});

const invertedBottomRight = computed(() => {
    const originalX = imageWidth.value > 0 ? ((selection.x + selection.width) / imageWidth.value) * naturalWidth.value : (selection.x + selection.width);
    const originalY = imageHeight.value > 0 ? ((selection.y + selection.height) / imageHeight.value) * naturalHeight.value : (selection.y + selection.height);
    return {
        x: Math.round(originalX * scaleX.value),
        y: Math.round((naturalHeight.value - originalY) * scaleY.value),
    };
});

// 组合成父父组件需要的字符串格式：
// "左下角的Y,左下角X;左上角Y,左上角X;右下角Y,右下角X;右上角Y,右上角X"
const packagedString = computed(() => {
    const bl = invertedBottomLeft.value;
    const tl = invertedTopLeft.value;
    const br = invertedBottomRight.value;
    const tr = invertedTopRight.value;
    return { bl, tl, br, tr }
    // 返回规定顺序的字符串："左下Y,左下X;左上Y,左上X;右下Y,右下X;右上Y,右上X"
    return `${bl.y},${bl.x};${tl.y},${tl.x};${br.y},${br.x};${tr.y},${tr.x}`;
});

function emitSelectionString() {
    emit('selection-string', packagedString.value);
}
</script>

<style scoped lang="scss">
.image-selector-container {
    display: flex;
    flex-direction: column;
    gap: 3px
}

.image-area {
    width: 250px;
    position: relative;
    cursor: crosshair;
    display: inline-block;
    /* 让容器大小贴合图片 */
}

.image-area img {

    display: block;
    /* 移除图片下方的额外空间 */
    user-select: none;
    /* 防止拖动时选中图片 */
}

.selection-box {
    position: absolute;
    border: 2px dashed red;
    background-color: rgba(255, 0, 0, 0.2);
    box-sizing: border-box;
}

.info-area {
    font-family: sans-serif;
    color: #333;

    .title {
        font-size: 16px;
    }

    p {
        color: var(--bulma-text);
    }

}

.info-area h4 {
    margin-top: 0;
    margin-bottom: 10px;
}

.info-area p {
    margin: 5px 0;
}
</style>