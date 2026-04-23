import { get, post, getWithoutToast } from "@/utils/request";

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL

export const get_daily_real_time_forecast = (params) => get('/api/realtime/day', params).then(res => {
    return res.data.images.map((item, index) => {
        item.path = WEBSITE_URL + item.path
        return item
    })
})

export const get_monthly_real_time_forecast = (params) => get('/api/realtime/month', params).then(res => {
    return res.data.images.map((item, index) => {
        item.path = WEBSITE_URL + item.path
        return item
    })
})

/**
 * 获取实时逐日预测结果
 * @param {{ [key: string]: any }} params 请求参数
 * @returns {Promise<Array<{date: string, path: string, source_date: string, cesium_image_url: string}>>}
 */
export const get_realtime_daily_prediction = (params) => get('/api/realtime/daily', params).then(res => {
    return res.data.result_urls.map((item) => {
        item.path = WEBSITE_URL + item.path
        item.cesium_image_url = WEBSITE_URL + item.cesium_image_url
        return item
    })
})

export const post_model_interpreter_data = (params) => post('/api/model/interpreter', params).then(res => {
    console.log('res', res)
})


/**
 * 
 * @param {*} formData  start_time, end_time, pred_gap, grad_type, position, variable
 * @returns 
 */
export async function useModelInterpreter(formData) {
    try {
        const { start_time, end_time, pred_gap, grad_type, position, variable } = formData;

        const params = {
            start_time,
            end_time,
            pred_gap,
            grad_type
        }

        // 只有当position和variable有值时才添加到请求参数
        if (position) params.position = position
        if (variable) params.variable = variable

        const response = await post('/api/model/interpreter', params)
        return response
    } catch (error) {
        console.error('Error fetching model interpreter:', error)
        throw error
    }
}

/**
 * 获取模型解释器任务结果
 */
export async function get_model_interpreter_result(task_id) {
    try {
        const response = await getWithoutToast(`/api/model/interpreter/${task_id}`)
        return response
    } catch (error) {
        console.error('Error fetching model interpreter result:', error)
        throw error
    }
}




/**
 * 上传文件接口
 * 单个文件上传
 */
export const upload_pngs = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await post('/api/upload/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return res.data.image_url
}


/**
 * 上传多个文件接口 
 * @param {*} files  文件列表
 * @returns 
 */
export const upload_multiple_pngs = (files) => {
    const promises = []
    files.forEach(file => {
        promises.push(upload_pngs(file))
    })
    return Promise.all(promises)
}


/**
 * 提交逐日的预报分析
 */
export async function postDayPrediction(startDate, imagePaths) {
    try {
        const response = await post('/api/predict/day', {
            start_date: startDate,
            image_paths: imagePaths
        })

        return response
    } catch (error) {
        console.error('Error fetching day predictions:', error)
        throw error
    }
}

/**
 * 提交逐月的预报分析
 */
export async function postMonthPrediction(startDate, imagePaths) {
    try {
        const response = await post('/api/predict/month', {
            start_date: startDate,
            image_paths: imagePaths
        })

        return response
    } catch (error) {
        console.error('Error fetching month predictions:', error)
        throw error
    }
}


/**
 * 获取逐日预报的结果
 */
export async function getDayPredictionResult(taskId) {
    try {
        const response = await getWithoutToast(`/api/predict/day/${taskId}`)
        return response
    } catch (error) {
        console.error('Error fetching day prediction result:', error)
        throw error
    }
}

/**
 * 获取逐月预报的结果
 */
export async function getMonthPredictionResult(taskId) {
    try {
        const response = await getWithoutToast(`/api/predict/month/${taskId}`)
        return response
    } catch (error) {
        console.error('Error fetching month prediction result:', error)
        throw error
    }
}


/**
 * 提交预报测试请求
 */

export async function postPrediction(type, startDate, imagePaths) {
    if (type === 'daily') {
        return await postDayPrediction(startDate, imagePaths);
    } else if (type === 'monthly') {
        return await postMonthPrediction(startDate, imagePaths);
    } else {
        throw new Error('Invalid prediction type');
    }
}

/**
 * 获取预报测试结果
 */
export async function getPredictionResult(taskId, type) {
    let res
    if (type === 'daily') {
        res = await getDayPredictionResult(taskId);
        return res
    } else if (type === 'monthly') {
        res = await getMonthPredictionResult(taskId);
        return res
    }
    else {
        throw new Error('Invalid prediction type');
    }
}


/**
 * 
 * @param {*} formData  start_time, end_time, pred_gap, grad_type, position, variable
 * @returns 
 */
export async function postDynamicAnalysis(formData) {
    try {
        // 创建基本请求参数
        const { startDate, endDate, grad_month, grad_type, selection } = formData;
        const params = {
            start_time: startDate,
            end_time: endDate,
            grad_month,
            grad_type,
            // x1: selection.tl.y, // 非常逆天的接口设计 
            // y1: selection.tl.x,
            // x2: selection.br.y,
            // y2: selection.br.x
            x1: selection.bl.x,
            y1: selection.bl.y,
            x2: selection.tr.x,
            y2: selection.tr.y
        }
        const response = await post('/api/dynamics/analysis', params)
        return response
    } catch (error) {
        console.error('Error fetching dynamics analysis:', error)
        throw error
    }
}


/**
 * 获取动态分析任务结果
 */
export async function get_dynamic_analysis_result(task_id) {
    try {
        const response = await getWithoutToast(`/api/dynamics/analysis/${task_id}`)
        return response
    } catch (error) {
        console.error('Error fetching dynamic analysis result:', error)
        throw error
    }
}

/**
 * 获取逐日预测的瓦片结果 以日期列表的形式返回 使用时只需替换到对应的路径即可
 */
export async function get_daily_realtime_tiles() {
    try {
        const ASSET_URL = import.meta.env.VITE_WEBSITE_URL
        const response = await getWithoutToast('/api/realtime/day/tiles')
        const tilesList = response.data.result_date_list.map(item => {
            return { path: ASSET_URL + '/media/tiles/' + item + '/{z}/{x}/{y}.png', date: item }
        })
        // console.log('tilesList',tilesList)
        return tilesList
    } catch (error) {
        console.error('Error fetching daily realtime tiles:', error)
        throw error
    }
}

/**
 * 获取航线预测的所有港口
 */
export async function get_route_ports() {
    try {
        const response = await getWithoutToast('/api/route/ports')
        return response.data.ports
    } catch (error) {
        console.error('Error fetching route ports:', error)
        throw error
    }
}

/**
 * 提交航线规划任务（按出发时间）
 * @param {Object} params
 * @param {string} params.start_port 起始港口名称
 * @param {string} params.end_port 终点港口名称
 * @param {string} params.departure_date 出发日期，格式 yyyy-mm-dd
 */
export async function post_route_plan_by_departure_task(params) {
    try {
        const { start_port, end_port, departure_date } = params
        const response = await post('/api/route/planByDeparture', {
            start_port,
            end_port,
            departure_date
        })
        return response
    } catch (error) {
        console.error('Error creating route plan by departure task:', error)
        throw error
    }
}

/**
 * 获取航线规划任务结果
 * @param {number|string} task_id 任务ID
 */
export async function get_route_plan_result(task_id) {
    try {
        const response = await getWithoutToast(`/api/route/plan/${task_id}`)
        return response
    } catch (error) {
        console.error('Error fetching route plan result:', error)
        throw error
    }
}




