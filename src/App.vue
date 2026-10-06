<template>
  <div class="layout">
    <SideNav />
    <main class="content">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
    <MessageBox />
  </div>
</template>

<script setup>
import SideNav from './components/SideNav.vue'
import MessageBox from './components/MessageBox.vue'
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}
.content {
  flex: 1;
  min-width: 0;
  padding: 20px;
}
@media (max-width: 768px) {
  .content {
    padding: 70px 12px 20px;
  }
}
</style>
