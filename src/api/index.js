import { get, post } from "@/utils/request";

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
        const response = await get(`/api/model/interpreter/${task_id}`)
        return response
    } catch (error) {
        console.error('Error fetching model interpreter result:', error)
        throw error
    }
}




