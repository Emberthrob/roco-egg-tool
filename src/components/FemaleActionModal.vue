<template>
  <teleport to="body">
    <div class="mask" v-if="visible" @click.self="close">
      <div class="box">
        <div class="head">
          <span class="name">{{ female.note || female.name }}</span>
          <button class="x" @click="close">×</button>
        </div>
        <button class="opt" @click="emit('priority')">
          {{ female.priority ? '取消优先分配' : '优先分配' }}
        </button>
        <button v-if="canSetAcademy" class="opt academy" @click="emit('academy')">
          {{ female.useAcademy ? '取消学院精灵窝' : '分配学院精灵窝' }}
        </button>
        <button class="opt danger" @click="emit('remove')">删除</button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
const visible = defineModel({ type: Boolean, default: false })
defineProps({
  female: { type: Object, required: true },
  canSetAcademy: { type: Boolean, default: false },
})
const emit = defineEmits(['priority', 'academy', 'remove'])
function close() { visible.value = false }
</script>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(30,20,60,.4); display: flex; align-items: center; justify-content: center; z-index: 1200; }
.box { width: 240px; background: rgba(40,30,90,.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,.25); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 16px 48px rgba(0,0,0,.45); }
.head { display: flex; align-items: center; justify-content: space-between; color: #fff; }
.name { font-weight: bold; }
.x { border: none; background: none; color: rgba(255,255,255,.6); font-size: 20px; cursor: pointer; }
.opt { padding: 10px; border: 1px solid rgba(255,255,255,.25); border-radius: 8px; background: rgba(255,255,255,.1); color: #fff; cursor: pointer; font-size: 14px; }
.opt:hover { border-color: #c4b5fd; }
.opt.academy { border-color: rgba(52,211,153,.5); color: #6ee7b7; }
.opt.academy:hover { background: rgba(52,211,153,.15); }
.opt.danger { border-color: rgba(252,165,165,.5); color: #fca5a5; }
.opt.danger:hover { background: rgba(248,113,113,.18); }
</style>
