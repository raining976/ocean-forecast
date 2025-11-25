<template>
    <div class="modelInterpreterContainer">
        <div class="formContainer">
            <section>
                <b-field label="数据范围" horizontal class="datepickerBox" :type="dateError ? 'is-danger' : ''"
                    :message="dateError">
                    <b-datepicker placeholder="点击选择..." range style="width: 230px;" size="is-small" :min-date="minDate"
                        :max-date="maxDate" @range-end="rangeEnd" @range-start="rangeStart">
                    </b-datepicker>
                    <b-tooltip style="margin: 0 10px; line-height: 30px;" label="日期有效范围为1979-2023,前后范围最短为14天"
                        position="is-right" type="is-dark"><vue-fontawesome icon="circle-exclamation" /></b-tooltip>
                </b-field>
                <b-field label="预测间隔" horizontal>
                    <b-numberinput size="is-small" type="is-dark" v-model.number="form.pred_gap" min="1"
                        style="width: 230px; height: 30px;"></b-numberinput><span
                        style="font-weight: bold; line-height: 30px;">天</span>
                </b-field>
                <b-field label="分析目标" horizontal class="gradType">
                    <b-radio v-model="form.grad_type" name="analysisObjective" native-value="sum" type="is-black">
                        均值
                    </b-radio>
                    <b-radio v-model="form.grad_type" name="analysisObjective" native-value="l2" type="is-black">
                        分布
                    </b-radio>
                </b-field>
                <b-field label="选定位置" horizontal>
                    <image-selector :image-url="imgUrl" @selection-string="onSelection" />
                </b-field>
                <b-field label="选定变量" horizontal>
                    <b-select placeholder="选择一个变量" size="is-small" @update:modelValue="updateVariable">
                        <option v-for="option, idx in selectableVariable" :value="option.value" :key="idx">
                            {{ option.label }}
                        </option>
                    </b-select>
                </b-field>

                <b-field horizontal><b-button type="is-dark" size="is-small" style="margin: 10px 0;"
                        @click="submitForm">提交分析</b-button></b-field>
            </section>
        </div>
        <div class="resultContainer">
            <section>
                <b-field label="逐日模型可解释性分析结果热图" horizontal>
                    <b-tooltip label="缓存最近三条分析记录" position="is-bottom" type="is-dark"><vue-fontawesome
                            icon="circle-exclamation" /></b-tooltip>
                </b-field>
                <b-message v-if="modelInterpreterStore.taskList.length == 0">
                    提交分析之后才会显示结果热图!
                </b-message>
            </section>
            <section class="resultList">
                <b-notification :closable="false" v-for="task, idx in modelInterpreterStore.taskList"
                    :key="task.task_id">
                    <div class="taskId">
                        <span class="idBox">
                            任务id: {{ task.task_id }}
                        </span>
                        <span class="tag">
                            <b-tag
                                :type="modelInterpreterStore.resultList[idx].status === '完成' ? 'is-success is-light' : 'is-warning is-light'">{{
                                    modelInterpreterStore.resultList[idx].status }}</b-tag>
                        </span>
                    </div>
                    <div class="resultMask" @click="showModal(idx)">
                        <!-- TODO:这里图片可以压缩 -->
                        <img src="@/assets/images/result_mask.png" alt="">
                        <span class="iconBox" v-if="modelInterpreterStore.resultList[idx].status === '完成'">
                            <vue-fontawesome class="eyeIcon" icon="eye" />
                        </span>
                        <span class="iconBox" v-else>
                            <vue-fontawesome class="eyeIcon" icon="eye-slash" />
                        </span>
                    </div>
                    <div class="createdTime">
                        提交时间: {{ task.created_time }}
                    </div>
                </b-notification>
            </section>
        </div>
        <b-modal v-model="isModalActive">
            <div class="modalBox">
                <h3 class="title">逐日模型可解释性分析结果热图</h3>
                <div class="content">
                    <li class="imgItem" v-for="(img, index) in modelInterpreterStore.resultList[activeIdx].images"
                        :key="index">
                        <img :src="img.startsWith('http') ? img : websiteUrl + img" alt="Result Image"
                            @click="previewImgUrl = img; isPreviewActive = true" />
                    </li>
                </div>
            </div>
        </b-modal>
        <b-modal v-model="isPreviewActive" class="previewModal">
            <div>
                <img :src="previewImgUrl.startsWith('http') ? previewImgUrl : websiteUrl + previewImgUrl" alt="Preview Image" />
            </div>
        </b-modal>
    </div>
</template>


<script setup>
import { useModelInterpreter } from "@/api"
import { openToast } from "@/utils/toast"
import { useModelInterpreterStore } from "@/store"

const websiteUrl = import.meta.env.VITE_WEBSITE_URL 
const modelInterpreterStore = useModelInterpreterStore();

const dateRange = ref([null, null]);

const form = reactive({
    start_time: "", // yyyyMMdd,
    end_time: "", // yyyyMMdd,
    pred_gap: 1, // 预测间隔天数 只能是数字
    grad_type: 'sum', // sum: 均值, l2: 分布
    variable: "", // 变量代码 1 2 3 4 5 6
    position: "", // 选定位置字符串 "左下Y,左下X;左上Y,左上X;右下Y,右下X;右上Y,右上X"
})

const minDate = new Date(1979, 0, 1); // 1979-01-01
const maxDate = new Date(2023, 11, 31); // 2023-12-31

const selectableVariable = [
    {
        label: '海冰密集度(SIC)',
        value: '1'
    },
    {
        label: '海冰U分量(SI_U)',
        value: '2'
    },
    {
        label: '海冰V分量(SI_V)',
        value: '3'
    },
    {
        label: '2米温度(T2M)',
        value: '4'
    },
    {
        label: '10米U风(U10M)',
        value: '5'
    },
    {
        label: '10米V风(V10M)',
        value: '6'
    }
]

const imgUrl = new URL('@/assets/images/arctic_mask.webp', import.meta.url).href


// 根据select修改form.variable值
// 如果绑定v-model会导致placeholder不显示的问题
const updateVariable = (value) => {
    form.variable = value;
}

// 日期范围是否不符
const dateError = ref('')
const rangeStart = (value) => {
    const startDateObj = value ? new Date(value) : null;
    // 清除之前的错误提示
    dateError.value = '';
    if (!startDateObj) {
        dateRange.value[0] = null;
        return;
    }
    dateRange.value[0] = startDateObj.getTime();
}

// 结束日期处理函数 主要用来校验日期范围
const rangeEnd = (value) => {
    // 兼容 rangeStart 里可能存的是时间戳或已格式化的字符串
    const rawStart = dateRange.value && dateRange.value[0] ? dateRange.value[0] : null;
    const startDate = rawStart ? (typeof rawStart === 'number' ? new Date(rawStart) : new Date(rawStart)) : null;
    const endDate = value ? new Date(value) : null;
    if (!startDate || !endDate) return;

    // 计算相差天数（向上取整以确保跨天计入）
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // 仅当日期范围不小于14天时才保存，并格式化为 yyyy-m-d（不补零）
    if (diffDays >= 14) {
        const fmt = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0'); // 补零
            const dd = String(d.getDate()).padStart(2, '0'); // 补零
            return `${y}${m}${dd}`;
        };
        dateRange.value = [fmt(startDate), fmt(endDate)];
        form.start_time = dateRange.value[0];
        form.end_time = dateRange.value[1];
        console.log('dateRange.value', dateRange.value)
        dateError.value = '';
    } else {
        dateError.value = "选择范围不足14天，未保存。";
        dateRange.value = [null, null];
        form.start_time = "";
        form.end_time = "";
    }
}


// 处理选区字符串事件
const onSelection = (selection) => {
    form.position = `${selection.bl.y},${selection.bl.x};${selection.tl.y},${selection.tl.x};${selection.br.y},${selection.br.x};${selection.tr.y},${selection.tr.x}`;
}

// 提交表单
const submitForm = () => {
    if (dateError.value || dateRange.value[0] === null || dateRange.value[1] === null) return;

    // 这里返回的是一个任务是否创建的结果,
    useModelInterpreter(form).then((response) => {
        openToast(response.message)
        let data = response.data || {};
        data.status = response.status || '';
        data.created_time = new Date().toLocaleString();
        modelInterpreterStore.addTask(data);
    }).catch((error) => {
        console.error('Error in Model Interpreter:', error);
    });
}

/**
 * 
 * 控制结果详情显示部分
 */

const isModalActive = ref(false);
const activeIdx = ref(null)
const showModal = (idx) => {
    if (modelInterpreterStore.resultList[idx].status !== '完成') return;
    isModalActive.value = true;
    activeIdx.value = idx;
}
const previewImgUrl = ref(null)
const isPreviewActive = ref(false);

onMounted(() => {
    // 页面加载时启动所有任务状态轮询
    modelInterpreterStore.pollAllTaskStatus();
});

onUnmounted(() => {
    // 页面卸载时清除所有定时器
    modelInterpreterStore.clearAllTimers();
});
</script>


<style scoped lang="scss">
$container-height: 680px;

.modelInterpreterContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    height: $container-height;

    .formContainer {
        min-width: 500px;
        border-radius: 10px;
        margin: 0px 10px;
        padding: 20px 30px;
        height: calc($container-height - 40px);
        background-color: var(--bulma-scheme-main);

        &:deep(.field.is-horizontal) {
            margin-bottom: 8px;
        }

        &:deep(.field-label) {
            margin-right: 8px;
            padding-top: 0px;
        }

        &:deep(.icon.has-text-danger) {
            width: 18px;
            margin-right: 5px;
        }

        .gradType:deep(.field-body .field) {
            width: 80px;
            flex-grow: 0;
        }

        &:deep(.field .has-numberinput.has-numberinput-is-small) {
            flex-grow: 0;
        }

        &:deep(.datepickerBox .field:first-child) {
            flex-grow: 0;
            margin: 0;
        }

    }

    .resultContainer {
        width: 400px;
        background-color: var(--bulma-scheme-main);
        border-radius: 10px;
        height: calc($container-height - 40px);
        padding: 20px 30px;
        margin: 0px 10px;
        overflow-y: auto;

        &:deep(.field-label) {
            flex: auto;
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

                &:hover .eyeIcon {
                    opacity: 1;
                }

                &:hover img {
                    filter: blur(4px);
                }


                img {
                    position: relative;
                    width: 100%;
                    display: block;
                    border-radius: 8px;
                    filter: blur(3px);
                    box-shadow: inset 0 0 0 1000px rgba(255, 255, 255, 0.25); // 模糊蒙版（半透明覆盖层）
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
        }
    }

    .previewModal{
        &:deep(.modal-content){
            max-width: 100vw !important;
        }
    }
}
</style>