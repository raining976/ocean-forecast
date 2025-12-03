<template>
    <div class="resultDisplayContainer">
        <div class="resultContainer">
            <section>
                <!-- 标题和提示信息 -->
                <h3 class="title">{{ displayTitle }} <b-tooltip :label="displayTooltip" position="is-bottom" type="is-dark">
                        <vue-fontawesome icon="circle-exclamation" />
                    </b-tooltip></h3>

                <!-- 空数据提示 -->
                <b-message v-if="taskList.length == 0">
                    {{ displayEmptyMessage }}
                </b-message>
            </section>
            <section class="resultList">
                <!-- 结果列表 -->
                <b-notification :closable="false" v-for="(task, idx) in taskList" :key="task.task_id">
                    <div class="taskId">
                        <span class="idBox">
                            {{ t('components.resultDisplay.taskId') }}: {{ task.task_id }}
                        </span>
                        <span class="tag">
                            <!-- 状态标签 -->
                            <b-tag
                                :type="resultList[idx]?.status === '完成' ? 'is-success is-light' : 'is-warning is-light'">
                                {{ resultList[idx]?.status === '完成' ? t('common.status.completed') : (resultList[idx]?.status === '进行中' ? t('common.status.processing') : resultList[idx]?.status) }}
                            </b-tag>
                        </span>
                    </div>
                    <!-- 结果遮罩层，点击查看详情 -->
                    <div class="resultMask" @click="showModal(idx)">
                        <img src="@/assets/images/result_mask.png" alt="">
                        <span class="iconBox" v-if="resultList[idx]?.status === '完成'">
                            <vue-fontawesome class="eyeIcon" icon="eye" />
                        </span>
                        <span class="iconBox" v-else>
                            <vue-fontawesome class="eyeIcon" icon="eye-slash" />
                        </span>
                    </div>
                    <div class="createdTime">
                        {{ t('components.resultDisplay.submitTime') }}: {{ task.created_time }}
                    </div>
                </b-notification>
            </section>
        </div>

        <!-- 详情弹窗 -->
        <b-modal v-model="isModalActive">
            <div class="modalBox">
                <h3 class="title">{{ displayModalTitle }}</h3>
                <div class="content">
                    <li class="imgItem" v-for="(img, index) in currentImages" :key="index">
                        <img :src="getImageUrl(img?.path || img)" alt="Result Image" @click="previewImage(img?.path || img)" />
                        <p style="text-align: center; margin: 2px 0;">{{ img?.date }}</p>
                    </li>
                </div>
            </div>
        </b-modal>

        <!-- 图片预览弹窗 -->
        <b-modal v-model="isPreviewActive" class="previewModal">
            <div>
                <img :src="getImageUrl(previewImgUrl)" alt="Preview Image" />
            </div>
        </b-modal>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 定义组件接收的属性
const props = defineProps({
    // 标题
    title: {
        type: String,
        default: '',
    },
    // 提示信息
    tooltip: {
        type: String,
        default: ''
    },
    // 无数据时的提示信息
    emptyMessage: {
        type: String,
        default: ''
    },
    // 任务列表数据
    taskList: {
        type: Array,
        default: () => [],
        required: true
    },
    // 结果列表数据 (需与任务列表索引对应)
    resultList: {
        type: Array,
        default: () => [],
        required: true
    },
    // 弹窗标题
    modalTitle: {
        type: String,
        default: ''
    }
})

const displayTitle = computed(() => props.title || t('components.resultDisplay.title'))
const displayTooltip = computed(() => props.tooltip || t('components.resultDisplay.tooltip'))
const displayEmptyMessage = computed(() => props.emptyMessage || t('common.message.noResult'))
const displayModalTitle = computed(() => props.modalTitle || t('components.resultDisplay.modalTitle'))

const websiteUrl = import.meta.env.VITE_WEBSITE_URL

// 弹窗控制
const isModalActive = ref(false);
const activeIdx = ref(null)
const previewImgUrl = ref(null)
const isPreviewActive = ref(false);

// 获取当前选中的结果图片列表
const currentImages = computed(() => {
    if (activeIdx.value !== null && props.resultList[activeIdx.value]) {
        return props.resultList[activeIdx.value].images || [];
    }
    return [];
});

// 显示详情弹窗
const showModal = (idx) => {
    // 只有状态为'完成'时才允许查看
    if (props.resultList[idx]?.status !== '完成') return;
    isModalActive.value = true;
    activeIdx.value = idx;
}

// 预览图片
const previewImage = (img) => {
    previewImgUrl.value = img;
    isPreviewActive.value = true;
}

// 处理图片URL
const getImageUrl = (img) => {
    if (!img) return '';
    return img.startsWith('http') ? img : websiteUrl + img;
}
</script>

<style scoped lang="scss">
$container-height: 680px;

.resultDisplayContainer {
    height: 100%;

    .resultContainer {
        width: 100%; // 适应父容器宽度
        background-color: var(--bulma-scheme-main);
        border-radius: 10px;
        height: 100%; // 适应父容器高度
        padding: 20px 30px;
        overflow-y: auto;

        &:deep(.field-label) {
            flex: auto;
            text-align: left; // 确保标签左对齐
        }

        .title {
            text-align: left;
            font-size: 18px;
            margin-bottom: 10px;
        }

        .resultList {
            padding: 10px 0;

            .taskId {
                display: flex;
                justify-content: space-between;
            }

            .taskId,
            .createdTime {
                font-size: 14px;
            }

            .resultMask {
                margin: 3px 0;
                cursor: pointer;
                position: relative; // 确保图标绝对定位相对于此元素

                &:hover .eyeIcon {
                    opacity: 1;
                }

                &:hover img {
                    filter: blur(4px);
                }

                img {
                    width: 100%;
                    display: block;
                    border-radius: 8px;
                    filter: blur(3px);
                    box-shadow: inset 0 0 0 1000px rgba(255, 255, 255, 0.25);
                    pointer-events: none;
                }

                .eyeIcon {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: auto;
                    color: var(--bulma-scheme-main-bis);
                    font-size: 20px;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
            }
        }
    }

    .modalBox {
        width: 900px;
        min-height: 600px;
        padding: 20px 30px;
        border-radius: 10px;
        background-color: var(--bulma-scheme-main);
        margin: 0 auto;

        .title {
            color: var(--bulma-text);
            text-align: center;
            margin-bottom: 20px;
        }

        .content {
            display: flex;
            flex-direction: column;
            gap: 10px;
            justify-content: center;
            align-items: center;
            .imgItem {
                list-style: none;

                img {
                    cursor: pointer;
                    border-radius: 4px;

                    &:hover {
                        opacity: 0.8;
                    }
                }
            }
        }
    }

    .previewModal {
        &:deep(.modal-content) {
            max-width: 100vw !important;
            display: flex;
            justify-content: center;

            img {
                max-height: 90vh;
                object-fit: contain;
            }
        }
    }
}
</style>