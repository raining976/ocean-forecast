<template>
    <div class="routePlanningContainer">
        <div class="leftContainer">
            <div class="formContainer">
                <!-- <h3 class="title">{{ t('routePlanning.title') }}</h3> -->

                <!-- <section class="formRow">
                <b-field :label="t('routePlanning.selectDate')">
                    <b-datepicker
                        v-model="selectedDate"
                        size="is-small"
                        :placeholder="t('routePlanning.datePlaceholder')"
                        :min-date="minSelectableDate"
                        :max-date="maxSelectableDate"
                        trap-focus
                    />
                </b-field>
            </section> -->

                <section class="formRow">
                    <b-field :label="t('routePlanning.departureDate')">
                        <b-datepicker
                            v-model="departureDate"
                            size="is-small"
                            :placeholder="t('routePlanning.datePlaceholder')"
                            :min-date="departureDateMin"
                            :max-date="departureDateMax"
                            trap-focus
                        />
                    </b-field>
                </section>

                <section class="formRow">
                    <b-field :label="t('routePlanning.startPoint')">
                        <b-radio v-for="point in routePoints" :key="`start-${point.value}`" v-model="startPoint"
                            name="start-point" :native-value="point.value" type="is-dark" size="is-small" class="radioItem">
                            {{ point.label }}
                        </b-radio>
                    </b-field>
                </section>

                <section class="formRow">
                    <b-field :label="t('routePlanning.endPoint')">
                        <b-radio v-for="point in routePoints" :key="`end-${point.value}`" v-model="endPoint"
                            name="end-point" :native-value="point.value" type="is-dark" size="is-small"  class="radioItem">
                            {{ point.label }}
                        </b-radio>
                    </b-field>
                </section>

                <b-button class="submitBtn" type="is-dark" size="is-small" @click="submitForm">
                    {{ t('common.button.submitAnalysis') }}
                </b-button>


            </div>

            <section class="taskListSection">
                <h4 class="taskListTitle">{{ t('routePlanning.taskListTitle') }}</h4>
                <p v-if="!taskList.length" class="taskEmptyHint">
                    {{ t('routePlanning.taskListEmpty') }}
                </p>
                <div v-else class="taskList">
                    <article v-for="task in taskList" :key="task.taskId" class="taskItem" >
                        <p class="taskLine">
                            <span><span style="margin-right:10px">ID:#{{ task.taskId }}</span>{{ formatDateTime(task.createdAt) }}</span>
                            <span :class="statusClass(task.status)">
                                {{ taskStatusText(task.status) }}
                            </span>
                        </p>
                        <p class="taskLine">
                            {{ task.startPort }} -> {{ task.endPort }}
                        </p>
                        <b-button size="is-small" type="is-dark" :disabled="task.status !== 'COMPLETED'"
                            @click.stop="loadTaskResult(task.taskId)">
                            {{ t('routePlanning.loadResult') }}
                        </b-button>
                    </article>
                </div>
            </section>
        </div>

        <div class="resultContainer">
            <h3 class="title">{{ t('routePlanning.resultTitle') }}</h3>
            <p class="summary" v-if="routeSummary">
                <b-button
                    size="is-small"
                    style="margin-right: 10px;"
                    outlined
                    :disabled="!canClearRenderedResult"
                    @click="clearRenderedResult"
                >
                    {{ t('common.button.clearSelection') }}
                </b-button>{{ routeSummary }}
            </p>
            <p class="summary" v-else>
                {{ t('routePlanning.emptyHint') }}
            </p>
            <RoutePhere ref="routePhereRef" :route-ports="ROUTE_PORTS" :selected-start-point="startPoint"
                :selected-end-point="endPoint" :route-result="activeTask?.result || null" class="sphereBox" />

            <section v-if="activeTask && activeTask.result" class="resultMeta">
                <div class="metaGrid">
                    <article class="metaCard" v-for="item in resultMetaCards" :key="item.key">
                        <p class="metaLabel">{{ item.label }}</p>
                        <p class="metaValue">{{ item.value }}</p>
                    </article>
                </div>

                <p v-if="activeTask.error" class="taskError">
                    {{ t('routePlanning.meta.error') }}: {{ activeTask.error }}
                </p>
            </section>
        </div>
    </div>
</template>

<script setup>
import RoutePhere from './components/RoutePhere.vue'
import { useI18n } from 'vue-i18n'
import { errorToast, openToast } from '@/utils/toast'
import { ROUTE_PORTS } from '@/constants/routePorts'
import { useRoutePlanningStore } from '@/store'

const { t, te } = useI18n()
const routePlanningStore = useRoutePlanningStore()

const startPoint = ref('')
const endPoint = ref('')
const departureDate = ref(null)
const routePhereRef = ref(null)
const hasResult = ref(false)

const departureDateMin = new Date(2025, 6, 1)
const departureDateMax = new Date(2025, 7, 31)
const taskList = computed(() => routePlanningStore.taskList)
const activeTask = computed(() => routePlanningStore.activeTask)

const getPortLabel = (portName) => {
    const key = `routePlanning.portLabels.${portName}`
    return te(key) ? t(key) : portName
}

const routePoints = computed(() => ROUTE_PORTS.map((port) => ({
    value: port.name,
    label: getPortLabel(port.name)
})))

const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString()
}

const formatDepartureDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const isDepartureDateInRange = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false
    return date >= departureDateMin && date <= departureDateMax
}

const normalizedDepartureDate = computed(() => {
    if (!(departureDate.value instanceof Date)) return null
    return isDepartureDateInRange(departureDate.value) ? departureDate.value : null
})

const routeSummary = computed(() => {
    if (!hasResult.value || !activeTask.value) return ''
    return t('routePlanning.taskSummary', {
        taskId: activeTask.value.taskId,
        status: taskStatusText(activeTask.value.status)
    })
})

const formatEtaText = (hours) => {
    const value = Number(hours)
    if (!Number.isFinite(value)) return '-'
    return t('routePlanning.meta.etaHoursValue', { value: value.toFixed(1) })
}

const formatDistanceNmText = (nm) => {
    const value = Number(nm)
    if (!Number.isFinite(value)) return '-'
    return t('routePlanning.meta.distanceNmValue', { value: value.toFixed(1) })
}

const routeResultData = computed(() => activeTask.value?.result || null)
const canClearRenderedResult = computed(() => !!activeTask.value?.result)

const resultStartPortText = computed(() => {
    const result = routeResultData.value
    const portName = result?.start_port || activeTask.value?.startPort || '-'
    return portName === '-' ? '-' : getPortLabel(portName)
})

const resultEndPortText = computed(() => {
    const result = routeResultData.value
    const portName = result?.end_port || activeTask.value?.endPort || '-'
    return portName === '-' ? '-' : getPortLabel(portName)
})

const resultMetaCards = computed(() => {
    const result = routeResultData.value
    if (!result) return []

    return [
        {
            key: 'startPort',
            label: t('routePlanning.meta.startPort'),
            value: resultStartPortText.value
        },
        {
            key: 'endPort',
            label: t('routePlanning.meta.endPort'),
            value: resultEndPortText.value
        },
        {
            key: 'departureDate',
            label: t('routePlanning.meta.departureDate'),
            value: result?.departure_date || '-'
        },
        {
            key: 'etaHours',
            label: t('routePlanning.meta.etaHours'),
            value: formatEtaText(result?.eta_hours)
        },
        {
            key: 'distanceNm',
            label: t('routePlanning.meta.distanceNm'),
            value: formatDistanceNmText(result?.distance_nm)
        },
        {
            key: 'route',
            label: t('routePlanning.meta.route'),
            value: `${resultStartPortText.value} -> ${resultEndPortText.value}`
        }
    ]
})

const taskStatusText = (status) => {
    if (status === 'COMPLETED') return t('routePlanning.taskStatus.completed')
    if (status === 'FAILED') return t('routePlanning.taskStatus.failed')
    if (status === 'TIMEOUT') return t('routePlanning.taskStatus.timeout')
    return t('routePlanning.taskStatus.inProgress')
}

const statusClass = (status) => {
    if (status === 'COMPLETED') return 'statusSuccess'
    if (status === 'FAILED' || status === 'TIMEOUT') return 'statusFailed'
    return 'statusProcessing'
}

const selectTask = (taskId) => {
    if (!taskId) return
    routePlanningStore.setActiveTask(taskId)
}

const loadTaskResult = async (taskId) => {
    const task = taskList.value.find((item) => item.taskId === taskId)
    if (!task || task.status !== 'COMPLETED') return
    routePlanningStore.setActiveTask(task.taskId)
    await nextTick()
    hasResult.value = true
    openToast('routePlanning.loadSuccess')
}

const clearRenderedResult = () => {
    routePhereRef.value?.clearRouteResult?.()
    routePlanningStore.setActiveTask(null)
    hasResult.value = false
}

const submitForm = async () => {
    if (!routePoints.value.length || !startPoint.value || !endPoint.value) {
        errorToast('routePlanning.errors.noPortsAvailable')
        return
    }

    if (!departureDate.value) {
        errorToast('routePlanning.errors.dateRequired')
        return
    }

    if (!normalizedDepartureDate.value) {
        errorToast('routePlanning.errors.dateOutOfRange')
        return
    }

    if (startPoint.value === endPoint.value) {
        errorToast('routePlanning.errors.pointsMustDiffer')
        return
    }

    try {
        await routePlanningStore.submitRoutePlanTask({
            startPort: startPoint.value,
            endPort: endPoint.value,
            departureDate: formatDepartureDate(normalizedDepartureDate.value)
        })
        hasResult.value = false
        openToast('routePlanning.submitSuccess')
    } catch (error) {
        errorToast('common.message.uploadFail')
    }
}

onMounted(async () => {
    routePlanningStore.restartPendingPolling()
    if (activeTask.value?.status === 'COMPLETED' && activeTask.value?.result) {
        await nextTick()
        hasResult.value = true
    }
})

onBeforeUnmount(() => {
    routePlanningStore.clearAllPolling()
})

watch(
    () => activeTask.value,
    (task) => {
        if (!task) {
            hasResult.value = false
            return
        }
        hasResult.value = task.status === 'COMPLETED' && !!task.result
    },
    { deep: true, immediate: true }
)

</script>

<style scoped lang="scss">
$container-height: 560px;
$form-container-height: 400px;

.routePlanningContainer {
    display: flex;
    justify-content: flex-start;
    align-items: stretch;
    width: 100%;
    padding-left: 28px;
    column-gap: 18px;

    .title {
        color: #fff;
        text-align: left;
        font-size: 18px;
        margin-bottom: 14px;
    }

    .leftContainer {
        width: 340px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        flex-shrink: 0;
    }

    .formContainer {
        width: 100%;
        // height: $form-container-height;
        padding: 18px;
        border-radius: 10px;
        background-color: var(--bulma-scheme-main);
        flex-shrink: 0;
        overflow-y: auto;
        overflow-x: hidden;

        .formRow {
            margin-bottom: 14px;
        }

        .radioItem {
            margin-right: 16px;
            margin-bottom: 8px;
            min-width: 120px;
        }

        .submitBtn {
            margin-top: 8px;
        }
    }

    .taskListSection {
        height: 230px;
        border-radius: 10px;
        background: rgba(10, 18, 26, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .taskListTitle {
            color: #fff;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .taskEmptyHint {
            color: #b9c0c8;
            font-size: 12px;
            margin-bottom: 0;
        }

        .taskList {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 4px;
        }

        .taskList::-webkit-scrollbar {
            width: 6px;
        }

        .taskList::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.24);
            border-radius: 99px;
        }

        .taskList::-webkit-scrollbar-track {
            background: transparent;
        }

        .taskItem {
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 8px;
            padding: 7px 8px;
            margin-bottom: 8px;
            background: rgba(10, 18, 26, 0.35);
            cursor: pointer;
            min-height: 72px;

            &.active {
                border-color: rgba(255, 255, 255, 0.5);
                background: rgba(35, 56, 78, 0.42);
            }

            .taskLine {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                color: #dbe3ec;
                font-size: 11px;
                margin-bottom: 6px;
                line-height: 1.4;
            }

            .statusProcessing {
                color: #f0d286;
            }

            .statusSuccess {
                color: #79d89e;
            }

            .statusFailed {
                color: #ff9a9a;
            }

            :deep(.button.is-small) {
                height: 24px;
                font-size: 11px;
                padding: 0 10px;
            }
        }
    }

    .resultContainer {
        flex: 1;
        min-width: 0;
        height: $container-height;
        padding: 0;
        background-color: transparent;
        border-radius: 0;

        .summary {
            display: flex;
            align-items: center;
            color: #fff;
            min-height: 24px;
            margin-bottom: 10px;
            font-size: 14px;
            
        }

        .resultActions {
            margin-bottom: 10px;
            display: flex;
            justify-content: flex-end;
        }

        .sphereBox {
            height: calc($container-height - 70px);
            border-radius: 8px;
            // overflow: hidden;
        }

        .resultMeta {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            background: rgba(8, 13, 20, 0.42);

            .metaGrid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
            }

            .metaCard {
                padding: 8px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.12);
                background: rgba(19, 30, 43, 0.45);
            }

            .metaLabel {
                color: #9fb0c2;
                font-size: 11px;
                margin-bottom: 4px;
            }

            .metaValue {
                color: #dbe3ec;
                font-size: 13px;
                line-height: 1.5;
                margin-bottom: 0;
                word-break: break-word;
            }

            .taskError {
                color: #ffb4b4;
                font-size: 12px;
                line-height: 1.6;
                margin-top: 8px;
                margin-bottom: 0;
            }

            @media (max-width: 1100px) {
                .metaGrid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 760px) {
                .metaGrid {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
        }
    }
}

@media screen and (max-width: 1024px) {
    .routePlanningContainer {
        flex-direction: column;
        padding-left: 0;
        width: 100%;

        .leftContainer {
            width: 100%;
            display: flex;
            flex-direction: row;
            gap: 10px;
            margin: 10px 0;
        }

        .formContainer,
        .taskListSection {
            width: auto;
            flex: 1;
            margin: 0;
            height: auto;
        }

        .taskListSection {
            min-height: 230px;
        }

        .resultContainer {
            width: 100%;
            margin: 10px 0;
            height: auto;
        }

        .resultContainer .sphereBox {
            height: 420px;
        }
    }
}
</style>