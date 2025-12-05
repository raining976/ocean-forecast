<template>
    <div class="NoticeContainer"><NoticeToWeb /></div>
    <div class="modelInterpreterContainer" :class="{ 'is-en': locale === 'en-US' }">
        <div class="formContainer">
            <section>
                <b-field :label="t('modelInterpreter.dataRange')" horizontal class="datepickerBox" :type="dateError ? 'is-danger' : ''"
                    :message="dateError">
                    <b-datepicker :placeholder="t('common.placeholder.select')" range style="width: 230px;" size="is-small" :min-date="minDate"
                        :max-date="maxDate" @range-end="rangeEnd" @range-start="rangeStart">
                    </b-datepicker>
                    <b-tooltip style="margin: 0 10px; line-height: 30px;" :label="t('modelInterpreter.tooltip')"
                        position="is-right" type="is-dark"><vue-fontawesome icon="circle-exclamation" /></b-tooltip>
                </b-field>
                <b-field :label="t('modelInterpreter.forecastInterval')" horizontal>
                    <b-numberinput size="is-small" type="is-dark" v-model.number="form.pred_gap" min="1"
                        style="width: 230px; height: 30px;"></b-numberinput><span
                        style="font-weight: bold; line-height: 30px;">{{ t('common.unit.day') }}</span>
                </b-field>
                <b-field :label="t('modelInterpreter.analysisTarget')" horizontal class="gradType">
                    <b-radio v-model="form.grad_type" name="analysisObjective" native-value="sum" type="is-black">
                        {{ t('modelInterpreter.mean') }}
                    </b-radio>
                    <b-radio v-model="form.grad_type" name="analysisObjective" native-value="l2" type="is-black">
                        {{ t('modelInterpreter.distribution') }}
                    </b-radio>
                </b-field>
                <b-field :label="t('modelInterpreter.selectedPosition')" horizontal>
                    <image-selector :image-url="imgUrl" @selection-string="onSelection" :width="304" :height="448"/>
                </b-field>
                <b-field :label="t('modelInterpreter.selectedVariable')" horizontal>
                    <b-select :placeholder="t('common.placeholder.selectVariable')" size="is-small" @update:modelValue="updateVariable">
                        <option v-for="option, idx in selectableVariable" :value="option.value" :key="idx">
                            {{ option.label }}
                        </option>
                    </b-select>
                </b-field>

                <b-field horizontal><b-button type="is-dark" size="is-small" style="margin: 10px 0;"
                        @click="submitForm">{{ t('common.button.submitAnalysis') }}</b-button></b-field>
            </section>
        </div>
        <div class="resultWrapper">
            <ResultDisplay 
                :title="t('modelInterpreter.resultTitle')"
                :tooltip="t('modelInterpreter.resultTooltip')"
                :emptyMessage="t('common.message.submitToView')"
                :taskList="modelInterpreterStore.taskList"
                :resultList="modelInterpreterStore.resultList"
                :modalTitle="t('modelInterpreter.resultModalTitle')"
            />
        </div>
    </div>
</template>


<script setup>
import { useModelInterpreter } from "@/api"
import { openToast } from "@/utils/toast"
import { useModelInterpreterStore } from "@/store"
import { useI18n } from 'vue-i18n'
import NoticeToWeb from '@/components/NoticeToWeb/index.vue'

const { t, locale } = useI18n()
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

const selectableVariable = computed(() => [
    {
        label: t('modelInterpreter.variables.sic'),
        value: '1'
    },
    {
        label: t('modelInterpreter.variables.si_u'),
        value: '2'
    },
    {
        label: t('modelInterpreter.variables.si_v'),
        value: '3'
    },
    {
        label: t('modelInterpreter.variables.t2m'),
        value: '4'
    },
    {
        label: t('modelInterpreter.variables.u10m'),
        value: '5'
    },
    {
        label: t('modelInterpreter.variables.v10m'),
        value: '6'
    }
])

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
        dateError.value = t('modelInterpreter.error.rangeTooShort');
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

    &.is-en {
        &:deep(.field-label) {
            font-size: 14px;
            flex: 2;
        }
    }

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

    .resultWrapper {
        width: 400px;
        height: calc($container-height - 40px);
        margin: 0px 10px;
    }
}
.NoticeContainer{
    display: none;
}

@media screen and (max-width: 768px) {
  .modelInterpreterContainer{
    display: none;
  }

  .NoticeContainer{
    display: block;
  }
}
</style>