export const useTestStore = defineStore('test', () => {
  const message = ref('hello from pinia')

  function setMessage(m) {
    message.value = m
  }

  return { message, setMessage }
})
