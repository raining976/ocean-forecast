

import { ToastProgrammatic as Toast } from "buefy"
import i18n from "@/i18n"

const toast = new Toast()

// 辅助函数：如果 msg 是 key，则尝试翻译，否则直接显示
const getMessage = (msg) => {
    if (i18n.global.te(msg)) {
        return i18n.global.t(msg)
    }
    return msg
}

export const openToast = (msg) => {
    toast.open({
        message: getMessage(msg),
        duration: 2000,
        queue: true
    })
}

export const successToast = (msg) => {
    toast.open({
        message: getMessage(msg),
        type: 'is-success',
        duration: 2000,
        queue: true
    })
}

export const errorToast = (msg) => {
    toast.open({
        message: getMessage(msg),
        type: 'is-danger',
        duration: 2000,
        queue: true
    })
}

