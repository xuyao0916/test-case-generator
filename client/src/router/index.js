import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/functional/generate',
    name: 'FunctionalGenerate',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/functional/history',
    name: 'FunctionalHistory',
    component: () => import('../views/History.vue')
  },
  {
    path: '/converter/format',
    name: 'FormatConverter',
    component: () => import('../views/FormatConverter.vue')
  },
  {
    path: '/api/test',
    name: 'ApiTest',
    component: () => import('../views/ApiTest.vue')
  },
  {
    path: '/api/generate',
    name: 'ApiGenerate',
    component: () => import('../views/ApiGenerate.vue')
  },
  {
    path: '/api/docs',
    name: 'ApiDocs',
    component: () => import('../views/ApiDocs.vue')
  },
  {
    path: '/',
    redirect: '/functional/generate'
  }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes
})

export default router
