<template>
  <teleport to="body">
    <div class="mb-mask" v-if="dialogState.visible" @click.self="onCancel">
      <div class="mb-box">
        <div class="mb-icon">🐣</div>
        <div class="mb-msg">{{ dialogState.message }}</div>
        <div class="mb-actions">
          <button v-if="dialogState.type === 'confirm'" class="mb-btn cancel" @click="onCancel">取消</button>
          <button class="mb-btn ok" @click="onOk">确定</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { dialogState, closeDialog } from '../store/dialog'

function onOk() { closeDialog(true) }
function onCancel() { closeDialog(false) }
</script>

<style scoped>
.mb-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 14, 50, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.mb-box {
  width: 340px;
  max-width: 90vw;
  background: rgba(40, 30, 90, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  padding: 22px 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}
.mb-icon { font-size: 40px; }
.mb-msg { color: #fff; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.mb-actions { display: flex; gap: 10px; }
.mb-btn {
  padding: 8px 26px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transition: all 0.15s;
}
.mb-btn.ok {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.5);
}
.mb-btn.cancel:hover { border-color: #fca5a5; color: #fecaca; }
</style>
