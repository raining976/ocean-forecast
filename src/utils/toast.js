

import { ToastProgrammatic as Toast } from "buefy"
const toast = new Toast()

export const openToast = (msg) => {
    toast.open({
        message: msg,
        duration: 2000,
        queue: true
    })
}

export const successToast = (msg) => {
    toast.open({
        message: msg,
        type: 'is-success',
        duration: 2000,
        queue: true
    })
}

