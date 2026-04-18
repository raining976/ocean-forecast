<template>
  <div class="noticeContainer">
    <NoticeToWeb />
  </div>
  <div class="DynamicAnalysisContainer" :class="{ 'is-en': locale === 'en-US' }">
    <div class="formContainer">
      <section class="formFieldSection">
        <b-field :label="t('dynamicAnalysis.dataRange')" horizontal class="datepickerBox"
          :type="dateError ? 'is-danger' : ''" :message="dateError">
          <b-datepicker :placeholder="t('common.placeholder.select')" range style="width: 230px;" size="is-small"
            @range-end="rangeEnd" @range-start="rangeStart" type="month" :max-date="maxDate">
          </b-datepicker>
          <b-tooltip style="margin: 0 10px; line-height: 30px;" :label="t('dynamicAnalysis.tooltip')"
                        position="is-right" type="is-dark"><vue-fontawesome icon="circle-exclamation" /></b-tooltip>
        </b-field>
        <b-field :label="t('dynamicAnalysis.forecastLeadTime')" horizontal class="advanceDate">
          <b-numberinput size="is-small" type="is-dark" v-model.number="pred_gap" min="1"
            style="width: 200px; height: 30px;"></b-numberinput>
        </b-field>

        <b-field :label="t('dynamicAnalysis.targetMonth')" horizontal>
          <b-input size="is-small" disabled style="width: 250px;" :value="targetMonth" readonly
            :placeholder="t('dynamicAnalysis.targetMonthPlaceholder')"></b-input>
        </b-field>

        <b-field :label="t('dynamicAnalysis.analysisRange')" horizontal>
          <image-selector :image-url="imgUrl" @selection-string="onSelection" :width="432" :height="432" />
        </b-field>

        <b-field :label="t('dynamicAnalysis.analysisTarget')" horizontal class="gradType">
          <b-radio v-model="form.grad_type" name="analysisObjective" native-value="sum" type="is-black" size="is-small">
            {{ t('dynamicAnalysis.seaIceArea') }}
          </b-radio>
          <b-radio v-model="form.grad_type" name="analysisObjective" native-value="variation" type="is-black"
            size="is-small">
            {{ t('dynamicAnalysis.seaIceVariation') }}
          </b-radio>
        </b-field>

        <b-field horizontal><b-button type="is-dark" size="is-small" style="margin: 10px 0;" @click="submitForm">{{
          t('common.button.submitAnalysis') }}</b-button></b-field>
      </section>
    </div>
    <div class="resultWrapper">
      <ResultDisplay :tooltip="t('dynamicAnalysis.tooltip')" :emptyMessage="t('common.message.submitToView')"
        :taskList="dynamicAnalysisStore.taskList" :resultList="dynamicAnalysisStore.resultList"
        :modalTitle="t('dynamicAnalysis.modalTitle')" :maskImage="resultMask" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useDynamicAnalysisStore } from "@/store"
import { useI18n } from 'vue-i18n'

import { openToast } from "@/utils/toast"

import resultMask from "@/assets/images/dynamic_result_mask.png"

const { t, locale } = useI18n()
const dynamicAnalysisStore = useDynamicAnalysisStore();

const imgUrl = new URL('@/assets/images/land_image.webp', import.meta.url).href;

const form = reactive({
  startDate: null,
  endDate: null,
  grad_type: 'sum',
  grad_month: '',
  selection: null,
});

const pred_gap = ref(1);

const dateRange = ref([null, null]);
const dateError = ref('');
const maxDate = new Date(2022, 11, 31);

// 时间格式化函数 格式化为 yyyy-mm的格式
const formatToYearMonth = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};



const rangeStart = (value) => {
  const startDateObj = value ? new Date(value) : null;
  dateError.value = '';
  if (!startDateObj) {
    dateRange.value[0] = null;
    return;
  }
  if (startDateObj > maxDate) {
    dateError.value = '时间选择最晚限制到2022年12月';
    dateRange.value = [null, null];
    form.startDate = null;
    form.endDate = null;
    return;
  }
  dateRange.value[0] = startDateObj;
}

const rangeEnd = (value) => {
  const startDate = dateRange.value[0];
  const endDate = value ? new Date(value) : null;
  if (!startDate || !endDate) return;

  if (endDate > maxDate) {
    dateError.value = '时间选择最晚限制到2022年12月';
    dateRange.value = [null, null];
    form.startDate = null;
    form.endDate = null;
    return;
  }

  const monthSpan = (endDate.getFullYear() - startDate.getFullYear()) * 12
    + (endDate.getMonth() - startDate.getMonth()) + 1;
  if (monthSpan < 12) {
    dateError.value = '动力学分析时间窗口过短，至少需要 12 个月';
    dateRange.value = [null, null];
    form.startDate = null;
    form.endDate = null;
    return;
  }

  dateRange.value = [startDate, endDate];
  form.startDate = startDate;
  form.endDate = endDate;
  dateError.value = '';
}


// 计算结束日期+预报提前期的月份
const targetMonth = computed(() => {
  if (!form.endDate) return '';

  const end = new Date(form.endDate);
  end.setMonth(end.getMonth() + pred_gap.value);

  const format = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  return format(end);
});

const onSelection = (selection) => {
  form.selection = selection;
};

import { postDynamicAnalysis } from "@/api"
const submitForm = () => {
  if (!form.startDate || !form.endDate) {
    openToast('common.message.selectDataRange');
    return;
  }
  if (!form.grad_type) {
    openToast('common.message.selectAnalysisTarget');
    return;
  }
  const formData = Object.assign({}, form);
  formData.startDate = formatToYearMonth(form.startDate);
  formData.endDate = formatToYearMonth(form.endDate);
  formData.grad_month = targetMonth.value.split('-')[1];
  postDynamicAnalysis(formData).then(res => {
    if (!res.data) {
      openToast(res.message || 'Submission failed');
      console.error('res.message', res.message)
      return;
    }
    const { task_id } = res.data
    const task = {
      task_id,
      created_time: new Date().toLocaleString()
    }
    dynamicAnalysisStore.addTask(task);
    openToast(res.message)
  })

}

onMounted(() => {
  // 页面加载时恢复未完成任务的轮询
  dynamicAnalysisStore.pollAllTaskStatus();
});

onUnmounted(() => {
  // 页面卸载时清理定时器，避免后台持续轮询
  dynamicAnalysisStore.clearAllTimers();
});


</script>

<style scoped lang="scss">
$container-height: 650px;

.DynamicAnalysisContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  height: $container-height;

  &.is-en {
    &:deep(.field-label) {
      font-size: 16px;
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

    .formFieldSection {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

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

    &:deep(.advanceDate .field-label .label) {
      min-width: 90px;
    }
  }

  .resultWrapper {
    width: 400px;
    height: calc($container-height);
    margin: 0px 10px;
    padding: 20px;
  }


}

.noticeContainer {
  display: none;
}

@media screen and (max-width: 768px) {
  .DynamicAnalysisContainer {
    display: none;
  }

  .noticeContainer {
    display: block;
  }
}
</style>