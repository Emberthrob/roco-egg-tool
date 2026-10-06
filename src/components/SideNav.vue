<template>
  <header class="mobile-header">
    <button class="hamburger" type="button" @click="open = true">☰</button>
    <span class="mobile-title"><img class="mobile-icon" src="/sdfsx.png" alt="" />S4智能配窝器</span>
  </header>

  <div class="mask" v-if="open" @click="open = false"></div>

  <aside class="sidenav" :class="{ open }">
    <div class="brand">
      <img class="brand-icon" src="/sdfsx.png" alt="" />
      <h2>S4智能配窝器</h2>
    </div>
    <nav>
      <router-link to="/" @click="closeMenu">🏠 首页</router-link>
      <router-link to="/storage" @click="closeMenu">📦 精灵仓库</router-link>
      <router-link to="/breeding" @click="closeMenu">🥚 孵蛋配窝</router-link>
      <router-link to="/pet-dex" @click="closeMenu">📖 精灵大全</router-link>
      <router-link to="/inheritance" @click="closeMenu">🧬 配窝计划</router-link>
      <router-link to="/about" @click="closeMenu">ℹ️ 关于</router-link>
    </nav>

    <div class="nav-footer">洛克王国智能配窝器 v8.0</div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'

const open = ref(false)
function closeMenu() {
  open.value = false
}
</script>

<style scoped>
.mobile-header {
  display: none;
}

.hamburger {
  border: none;
  background: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.mask {
  display: none;
}

.sidenav {
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  overflow-y: auto;
  flex-shrink: 0;
  width: 230px;
  color: #fff;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.15);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  margin-bottom: 14px;
}

.brand-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.brand h2 {
  font-size: 18px;
  margin: 0;
  color: #fff;
  letter-spacing: 1px;
}

.sidenav nav {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.sidenav nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 14px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.sidenav nav a:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  padding-left: 26px;
}

.sidenav nav a.router-link-active {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-left-color: #c4b5fd;
  font-weight: bold;
}

.nav-footer {
  padding: 16px 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  text-align: center;
}

@media (max-width: 768px) {
  .mobile-header {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    background: rgba(60, 45, 140, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: #fff;
    z-index: 999;
  }

  .mobile-title {
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mobile-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  .mask {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }

  .sidenav {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 1001;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidenav.open {
    transform: translateX(0);
  }
}
</style>
