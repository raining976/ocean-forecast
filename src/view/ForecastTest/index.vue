<template>
  <div class="forecastTestContainer">
    <div class="formContainer">
      <h3 class="title">{{ t('forecastTest.title') }}</h3>
      <b-tabs type="is-toggle" size="is-small" class="typeTabs" v-model="predictionType">
        <b-tab-item :label="t('forecastTest.daily')" value="daily" @click="predictionType = 'daily'"></b-tab-item>
        <b-tab-item :label="t('forecastTest.monthly')" value="monthly" @click="predictionType = 'monthly'"></b-tab-item>
      </b-tabs>
      <section>
        <b-field :label="uploadedFilesNum" require>
          <b-progress style="margin: 10px auto;" :value="fileList.length" :max="imageNum">
          </b-progress>
        </b-field>
      </section>
      <section style="margin: 10px 0;">
        <b-field :label="predictionType === 'monthly' ? t('forecastTest.selectMonthStart') : t('forecastTest.selectDateStart')">
          <b-datepicker :type="predictionType === 'monthly' ? 'month' : undefined" @update:modelValue="formatDate"
            size="is-small" style="max-width: 330px;" :placeholder="predictionType === 'monthly' ? t('common.placeholder.selectMonth') : t('common.placeholder.selectDate')"
            trap-focus></b-datepicker>
        </b-field>
      </section>
      <section>
        <b-field>
          <b-upload v-model="fileList" multiple drag-drop accept="image/png" @update:modelValue="filesOnUpdate"
            :disabled="fileList.length >= imageNum">
            <section class="upload-dropzone">
              <p class="uploadIconBox"><vue-fontawesome icon="upload" /></p>
              <p class="uploadHint">{{ t('forecastTest.uploadHint', { num: imageNum }) }}</p>
            </section>
          </b-upload>
        </b-field>
        <div class="tags">
          <span v-for="(file, index) in fileList" :key="index" class="tag is-light is-dark">
            {{ file.name }}
            <button class="delete is-small" type="button" @click="deleteDropFile(index)"></button>
          </span>
        </div>
      </section>

      <!-- <b-button class="submitBtn" type="is-dark" size="is-small" @click="uploadFiles">上传文件</b-button> -->
      <b-button class="submitBtn" type="is-dark" size="is-small" @click="submitForm">{{ t('common.button.submitAnalysis') }}</b-button>
    </div>
    <div class="resultContainer">
      <h3 class="title">{{ t('forecastTest.resultTitle') }} <b-tooltip :label="t('forecastTest.resultTooltip')" position="is-right" type="is-dark"><vue-fontawesome
            icon="circle-exclamation" /></b-tooltip></h3>
      <section>
        <b-message v-if="predictionTestStore.taskList.length == 0">
          {{ t('common.message.submitToViewPrediction') }}
        </b-message>
      </section>
      <section class="resultList">
        <b-notification :closable="false" v-for="task, idx in predictionTestStore.taskList" :key="task.task_id">
          <div class="taskId">
            <span class="idBox">
              {{ t('components.resultDisplay.taskId') }}: {{ task.task_id }}
            </span>
            <span class="tag">
              <b-tag type='is-info is-light'>{{ task.type === 'daily' ? t('forecastTest.dailyForecast') : t('forecastTest.monthlyForecast') }}
              </b-tag>
              <b-tag
                :type="predictionTestStore.resultList[idx].status === '完成' ? 'is-success is-light' : 'is-warning is-light'">{{
                  predictionTestStore.resultList[idx].status === '完成' ? t('common.status.completed') : (predictionTestStore.resultList[idx].status === '进行中' ? t('common.status.processing') : predictionTestStore.resultList[idx].status) }}</b-tag>
            </span>
          </div>
          <div class="resultMask" @click="showModal(idx)">
            <!-- TODO:这里图片可以压缩 -->
            <img src="@/assets/images/result_mask.png" alt="">
            <span class="iconBox" v-if="predictionTestStore.resultList[idx].status === '完成'">
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
    <b-modal v-model="isModalActive">
      <div class="modalBox">
        <h3 class="title">{{ t('forecastTest.modalTitle') }}</h3>
        <div class="content">
          <b-carousel progress-type="is-dark" pause-text="">
            <b-carousel-item v-for="(carousel, i) in predictionTestStore.resultList[activeIdx].images" :key="i">
              <section>
                <div class="carouselBox"
                  style="display: flex; justify-content: center;flex-direction: column; align-items: center;">
                  <img :src="carousel.path.startsWith('http') ? carousel.path : websiteUrl + carousel.path" alt="">
                  <p>{{ carousel.date }}</p>
                </div>
              </section>
            </b-carousel-item>
          </b-carousel>

        </div>
      </div>
    </b-modal>
  </div>
</template>


<script setup>
import { upload_multiple_pngs, postPrediction } from "@/api"
import { errorToast, openToast } from "@/utils/toast"
import { usePredictionTestStore } from "@/store"
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const websiteUrl = import.meta.env.VITE_WEBSITE_URL
const predictionTestStore = usePredictionTestStore();


const fileList = ref([]); // 待上传的文件列表
const selectedDate = ref(null); // 选择的日期
const predictionType = ref('daily') // 预测类型：逐日或逐月

const formatDate = (date) => {
  const year = new Date(date).getFullYear();
  const month = new Date(date).getMonth() + 1;
  const day = new Date(date).getDate();
  const paddedMonth = month < 10 ? '0' + month : month;
  const paddedDay = day < 10 ? '0' + day : day;
  selectedDate.value = predictionType.value === 'monthly' ? `${year}/${paddedMonth}` : `${year}/${paddedMonth}/${paddedDay}`;
};

watch(predictionType, (newType) => {
  // 切换预测类型时清空已上传文件
  fileList.value = [];
  selectedDate.value = null;
});

const imagePathList = ref([]); // 上传成功后的图片路径列表

// 计算最大上传图片数量
const imageNum = computed(() => predictionType.value === 'daily' ? 14 : 12);

// 删除已上传的文件
const deleteDropFile = (index) => {
  fileList.value.splice(index, 1);
};

// 过滤只保留 PNG 文件，且最多 14 个
const filesOnUpdate = (files) => {
  const pngs = files.filter(f => f.type === 'image/png' || /\.png$/i.test(f.name));
  fileList.value = pngs.slice(0, imageNum.value);
};

// 已上传文件数量显示
const uploadedFilesNum = computed(() => {
  return `${t('forecastTest.uploadedFiles')}: ${fileList.value.length} / ${imageNum.value}`;
});

// 提交表单
const submitForm = async () => {
  // 在提交表单之前要先上传图片
  if (fileList.value.length === 0) {
    errorToast('common.message.uploadImageFirst');
    return;
  }
  if (!selectedDate.value) {
    errorToast('common.message.selectDateFirst');
    return;
  }
  try {
    await uploadFiles(fileList.value);
    const res = await postPrediction(predictionType.value, selectedDate.value, imagePathList.value);
    if (res.success) {
      openToast('common.message.uploadSuccess');
      const data = res.data
      predictionTestStore.addTask(data.task_id, predictionType.value);

    }
  } catch (error) {
    errorToast('common.message.uploadFail');
  } finally {
    clearForm();
  }
}

// 批量上传文件
const uploadFiles = async (files) => {
  await upload_multiple_pngs(files)
    .then(responses => {
      imagePathList.value = responses
    })
    .catch(error => {
      console.error('Error uploading files:', error);
      errorToast('common.message.imageUploadFail');
    });
}

const clearForm = () => {
  fileList.value = [];
  selectedDate.value = null;
  imagePathList.value = [];
}

/**
 * 控制模态框部分
 */
const isModalActive = ref(false);
const activeIdx = ref(null)
const showModal = (idx) => {
  if (predictionTestStore.resultList[idx].status !== '完成') return;
  isModalActive.value = true;
  activeIdx.value = idx;
}


onMounted(() => {
  predictionTestStore.pollAllTaskStatus()
});

onUnmounted(() => {
  predictionTestStore.clearAllTimers()
});

</script>

<style scoped lang="scss">
$container-height: 530px;

.forecastTestContainer {
  display: flex;
  justify-content: center;
  align-items: center;

  .title {
    text-align: left;
    font-size: 18px;
    margin-bottom: 10px;
  }

  .formContainer {
    width: 400px;
    height: $container-height;
    padding: 20px;
    margin: 0 auto;
    border-radius: 10px;
    background-color: var(--bulma-scheme-main);
    margin-right: 10px;

    .uploadIconBox {
      font-size: 25px;
      margin: 0;
      text-align: center;
    }

    .uploadHint {
      font-size: 12px;
      margin: 5px 10px;
    }

    .tags {
      margin: 10px 0;
      max-height: 100px;
      overflow-y: auto;
    }

    .submitBtn {
      margin: 5px 0;
    }


    .typeTabs {
      &:deep(.tab-content) {
        padding: 0;
      }

      &:deep(.tabs ul) {
        margin: 0;
      }

      &:deep(li.is-active a) {
        background-color: #2c3039;
        color: var(--bulma-scheme-main);
      }
    }

  }

  .resultContainer {
    width: 400px;
    height: $container-height;
    padding: 20px;
    margin: 0 auto;
    border-radius: 10px;
    background-color: var(--bulma-scheme-main);
    margin-left: 10px;

    .resultList {
      padding: 10px 0;
      max-height: 450px;
      overflow-y: auto;

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
    width: 800px;
    height: 520px;
    padding: 20px;
    margin: 0 auto;
    background-color: var(--bulma-scheme-main);
    border-radius: 10px;

    .title {
      text-align: center;
    }

    img {
      max-height: 400px;
    }

    p {
      margin-bottom: 20px;
    }

    &:deep(.indicator-style) {
      border-color: #2c3039;
    }

    &:deep(.indicator-item.is-active .indicator-style) {
      background-color: #2c3039;
    }

    &:deep(.svg-inline--fa) {
      color: #2c3039;

    }

    &:deep(.is-hovered.carousel-arrow .icon) {
      border-color: #2c3039
    }

  }

}


@media screen and (max-width: 768px) {
  .forecastTestContainer{
    flex-direction: column;
    height: auto;

    .formContainer, .resultContainer {
      width: 85%;
      margin: 10px auto;
    }
  }
}
</style>