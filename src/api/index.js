import {get, post} from "@/utils/request";

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL

export const get_daily_real_time_forecast = (params) => get('/api/realtime/day', params).then(res=>{
    return res.data.images.map((item, index)=>{
        item.path = WEBSITE_URL + item.path
        return item
    })
})

export const get_monthly_real_time_forecast = (params) => get('/api/realtime/month', params).then(res=>{
    return res.data.images.map((item, index)=>{
        item.path = WEBSITE_URL + item.path
        return item
    })
})
