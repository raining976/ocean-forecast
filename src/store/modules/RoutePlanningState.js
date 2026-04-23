import { get_route_plan_result, post_route_plan_by_departure_task } from '@/api'

const POLL_INTERVAL = 3000
const MAX_CACHE_SIZE = 10

export const useRoutePlanningStore = defineStore('routePlanningState', () => {
    const taskList = ref([])
    const activeTaskId = ref(null)

    const pollTimerMap = new Map()

    const activeTask = computed(() => taskList.value.find((item) => item.taskId === activeTaskId.value) || null)

    const trimTaskList = () => {
        while (taskList.value.length > MAX_CACHE_SIZE) {
            const removed = taskList.value.pop()
            if (removed?.taskId) {
                stopPolling(removed.taskId)
            }
        }
    }

    const normalizeTaskStatus = (status, success) => {
        if (status) return status
        return success ? 'COMPLETED' : 'FAILED'
    }

    const updateTask = (taskId, patch) => {
        const index = taskList.value.findIndex((item) => item.taskId === taskId)
        if (index === -1) return
        taskList.value[index] = {
            ...taskList.value[index],
            ...patch,
            updatedAt: new Date().toISOString()
        }
    }

    const addTask = ({ taskId, startPort, endPort }) => {
        taskList.value.unshift({
            taskId,
            startPort,
            endPort,
            status: 'IN_PROGRESS',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            result: null,
            error: ''
        })
        activeTaskId.value = taskId
        trimTaskList()
    }

    const stopPolling = (taskId) => {
        const timer = pollTimerMap.get(taskId)
        if (!timer) return
        clearInterval(timer)
        pollTimerMap.delete(taskId)
    }

    const clearAllPolling = () => {
        for (const taskId of pollTimerMap.keys()) {
            stopPolling(taskId)
        }
    }

    const fetchTaskResult = async (taskId) => {
        try {
            const response = await get_route_plan_result(taskId)
            const status = normalizeTaskStatus(response?.status, response?.success)

            if (status === 'COMPLETED') {
                updateTask(taskId, {
                    status,
                    result: response?.data?.result || null,
                    error: ''
                })
                stopPolling(taskId)
                return
            }

            if (status === 'FAILED' || status === 'TIMEOUT') {
                updateTask(taskId, {
                    status,
                    error: response?.data?.error || response?.message || ''
                })
                stopPolling(taskId)
                return
            }

            updateTask(taskId, { status })
        } catch (error) {
            updateTask(taskId, { status: 'FAILED', error: error?.message || 'Request failed' })
            stopPolling(taskId)
        }
    }

    const startPolling = (taskId, interval = POLL_INTERVAL) => {
        stopPolling(taskId)
        fetchTaskResult(taskId)
        const timer = setInterval(() => {
            fetchTaskResult(taskId)
        }, interval)
        pollTimerMap.set(taskId, timer)
    }

    const restartPendingPolling = () => {
        taskList.value.forEach((task) => {
            if (task.status === 'IN_PROGRESS') {
                startPolling(task.taskId)
            }
        })
    }

    const submitRoutePlanTask = async ({ startPort, endPort, departureDate }) => {
        const response = await post_route_plan_by_departure_task({
            start_port: startPort,
            end_port: endPort,
            departure_date: departureDate
        })
        const taskId = response?.data?.task_id
        if (!taskId) {
            throw new Error('Missing task id')
        }

        addTask({ taskId, startPort, endPort })
        startPolling(taskId)
        return taskId
    }

    const setActiveTask = (taskId) => {
        activeTaskId.value = taskId
    }

    return {
        taskList,
        activeTaskId,
        activeTask,
        addTask,
        updateTask,
        submitRoutePlanTask,
        setActiveTask,
        fetchTaskResult,
        startPolling,
        stopPolling,
        clearAllPolling,
        restartPendingPolling
    }
}, {
    persist: {
        enabled: true,
        strategies: [
            { key: 'routePlanningState', storage: localStorage, paths: ['taskList', 'activeTaskId'] }
        ]
    }
})
