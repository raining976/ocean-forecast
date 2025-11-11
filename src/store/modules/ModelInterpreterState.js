import { get_model_interpreter_result } from "@/api"

export const useModelInterpreterStore = defineStore('modelInterpreter', () => {
    const MAX_LENGTH = 3 // 最大缓存任务数
    const taskList = ref([]) // 临时保留任务列表 celery_id task_id
    const resultList = ref([]) // 结果列表  保存与当前任务对应的结果

    function trimToMax(listRef) {
        while (listRef.value.length > MAX_LENGTH) {
            // 从下标 MAX_LENGTH 开始删除多余项，保留前 MAX_LENGTH 项（最新的）
            listRef.value.splice(MAX_LENGTH)
        }
    }

    function addTask(task) {
        // 将新任务放到头部，保持最新项在前
        taskList.value.unshift(task)
        addResult({ status: '处理中', task_id: task.task_id, timeId: null });
        // 开轮训更新任务状态
        pollTaskStatus(resultList.value[0]);
        trimToMax(taskList)
    }

    function addResult(result) {
        resultList.value.unshift(result)
        trimToMax(resultList)
    }

    // 轮训更新任务状态的逻辑可以放在这里
    // TODO: 如果当前resultRef还没有完成就被删除了,可能存在内存泄漏风险
    function pollTaskStatus(resultRef, interval = 2000) {
        // 这里可以使用 setInterval 或其他方式定期检查任务状态
        if(resultRef.timerId != null) return 
        resultRef.timerId = setInterval(async () => {
            // 轮询任务状态的逻辑
            try {
                const response = await get_model_interpreter_result(resultRef.task_id)
                console.log('response', response)
                if (response.status === 'COMPLETED' || response.status === 'FAILED') {
                    resultRef.status = response.status === 'COMPLETED' ? '完成' : '失败';
                    resultRef.images = response.data.images;
                    // 任务完成或失败，停止轮询
                    clearInterval(resultRef.timerId);
                    resultRef.timerId = null;
                }
            } catch (error) {
                console.error('Error polling task status:', error)
            }

        }, interval);
    }


    /**
     *  轮训tasklist 确保因为上次关闭页面导致的未完成任务继续轮训
     */
    function pollAllTaskStatus() {
        for (const result of resultList.value) {
            if (result.status !== '完成' && result.status !== '失败') {
                pollTaskStatus(result);
            }
        }
    }

    // 清空所有定时器
    function clearAllTimers() {
        for (const result of resultList.value) {
            if (result.timerId) {
                clearInterval(result.timerId);
                result.timerId = null;
            }
        }
    }



    return { taskList, addTask, resultList, addResult, pollTaskStatus, clearAllTimers, pollAllTaskStatus }
}, {
    persist: {
        enabled: true,
        strategies: [
            { key: 'modelInterpreter', storage: localStorage, paths: ['taskList', 'resultList'] }
        ]
    }
});
