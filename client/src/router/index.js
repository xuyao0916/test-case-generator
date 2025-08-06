import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import History from '../views/History.vue'

const routes = [
  {
    path: '/',
    redirect: '/functional/generate'
  },
  {
    path: '/functional/generate',
    name: 'FunctionalGenerate',
    component: Home
  },
  {
    path: '/functional/history',
    name: 'FunctionalHistory',
    component: History
  },
  {
    path: '/api/test',
    name: 'ApiTest',
    component: () => import('../views/ApiTest.vue')
  },
  {
    path: '/api/docs',
    name: 'ApiDocs',
    component: () => import('../views/ApiDocs.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
