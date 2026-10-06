import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/egg-calc', name: 'eggcalc', component: () => import('../views/EggGroupCalc.vue') },
  { path: '/breeding', name: 'breeding', component: () => import('../views/Breeding.vue') },
  { path: '/pet-dex', name: 'petdex', component: () => import('../views/PetDex.vue') },
  { path: '/storage', name: 'storage', component: () => import('../views/Storage.vue') },
  { path: '/inheritance', name: 'inheritance', component: () => import('../views/Inheritance.vue') },
  { path: '/about', name: 'about', component: () => import('../views/AboutView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
