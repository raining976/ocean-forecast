export const useRTForecastStore = defineStore('realTimeForecastState', () => {
    const isPlaying = ref(true)
    const DAILY = 'daily'
    const MONTHLY = 'monthly'
    const dateType = ref(DAILY) // daily or monthly

    const isLoading = ref(false);
    const play = () => {
        isPlaying.value = true
    }

    const pause = () => {
        isPlaying.value = false
    }

    return { isPlaying, play, pause, dateType, DAILY, MONTHLY, isLoading }
})
