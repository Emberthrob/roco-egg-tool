import { reactive } from 'vue'

export const dialogState = reactive({
  visible: false,
  type: 'alert', // 'alert' | 'confirm'
  message: '',
  _resolve: null,
})

export function showAlert(message) {
  return new Promise((resolve) => {
    dialogState.type = 'alert'
    dialogState.message = message
    dialogState._resolve = resolve
    dialogState.visible = true
  })
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    dialogState.type = 'confirm'
    dialogState.message = message
    dialogState._resolve = resolve
    dialogState.visible = true
  })
}

export function closeDialog(result) {
  dialogState.visible = false
  const resolve = dialogState._resolve
  dialogState._resolve = null
  if (resolve) resolve(result)
}
