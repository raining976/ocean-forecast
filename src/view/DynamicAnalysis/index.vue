<template>
  <div class="DynamicAnalysisContainer">
    <div class="formContainer">
      <section>
        <b-field label="数据范围" horizontal class="datepickerBox" :type="dateError ? 'is-danger' : ''"
          :message="dateError">
          <b-datepicker placeholder="点击选择..." range style="width: 230px;" size="is-small" @range-end="rangeEnd"
            @range-start="rangeStart" type="month">
          </b-datepicker>
        </b-field>
        <b-field label="预报提前期" horizontal class="advanceDate">
          <b-numberinput size="is-small" type="is-dark" v-model.number="pred_gap" min="1"
            style="width: 230px; height: 30px;"></b-numberinput>
        </b-field>

        <b-field label="目标月份" horizontal>
          <b-input size="is-small" disabled style="width: 250px;" :value="targetMonth" readonly
            placeholder="目标月份由数据范围和预报提前期决定"></b-input>
        </b-field>

        <b-field label="分析范围" horizontal>
          <image-selector :image-url="imgUrl" @selection-string="onSelection" :width="432" :height="432"  />
        </b-field>

        <b-field label="分析目标" horizontal class="gradType">
          <b-radio v-model="form.grad_type" name="analysisObjective" native-value="sum" type="is-black" size="is-small">
            海冰面积
          </b-radio>
          <b-radio v-model="form.grad_type" name="analysisObjective" native-value="variation" type="is-black"
            size="is-small">
            海冰变化
          </b-radio>
        </b-field>

        <b-field horizontal><b-button type="is-dark" size="is-small" style="margin: 10px 0;"
            @click="submitForm">提交分析</b-button></b-field>
      </section>
    </div>
    <div class="resultWrapper">
      <ResultDisplay tooltip="缓存最近三条动态分析记录" emptyMessage="提交分析之后才会显示结果热图!" :taskList="dynamicAnalysisStore.taskList"
        :resultList="dynamicAnalysisStore.resultList" modalTitle="逐日动态分析结果热图" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useDynamicAnalysisStore } from "@/store"

import { openToast } from "@/utils/toast"

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
  dateRange.value[0] = startDateObj;
}

const rangeEnd = (value) => {
  const startDate = dateRange.value[0];
  const endDate = value ? new Date(value) : null;
  if (!startDate || !endDate) return;

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
    openToast('请选择数据范围');
    return;
  }
  if (!form.grad_type) {
    openToast('请选择分析目标');
    return;
  }
  const formData = Object.assign({}, form);
  formData.startDate = formatToYearMonth(form.startDate);
  formData.endDate = formatToYearMonth(form.endDate);
  formData.grad_month = targetMonth.value.split('-')[1];
  
  postDynamicAnalysis(formData).then(res => {
    const { task_id } = res.data
    const task = {
      task_id,
      created_time: new Date().toLocaleString()
    }
    dynamicAnalysisStore.addTask(task);
    openToast(res.message)
  })

}


</script>

<style scoped lang="scss">
$container-height: 580px;

.DynamicAnalysisContainer {
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

    &:deep(.advanceDate .field-label .label) {
      width: 90px;
    }
  }

  .resultWrapper {
    width: 400px;
    height: calc($container-height - 40px);
    margin: 0px 10px;
  }


}
</style>