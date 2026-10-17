<template>
  <div class="module" @click="onClick">
    <NodeCard :node="node" :target="true" :target-spec="targetSpec" />
  </div>
</template>

<script setup>
import { inject } from 'vue'
import NodeCard from './NodeCard.vue'

const props = defineProps({
  node: { type: Object, required: true },
  targetSpec: { type: Object, default: null },
})

const childClick = inject('child-click', null)

function onClick() {
  if (props.node && props.node.raceId != null && !props.node.isUnknown && !props.node.isMissing && childClick) {
    childClick(props.node)
  }
}
</script>

<style scoped>
.module { cursor: pointer; }
</style>
