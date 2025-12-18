import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/functional/generate',
    name: 'FunctionalGenerate',
    component: () => import('../views/functional/TestCaseGenerator.vue')
  },
  {
    path: '/functional/step-by-step',
    name: 'StepByStepGenerate',
    component: () => import('../views/functional/StepByStepGenerator.vue')
  },
  {
    path: '/functional/history',
    name: 'FunctionalHistory',
    component: () => import('../views/functional/History.vue')
  },
  {
    path: '/review/testcase',
    name: 'TestCaseReview',
    component: () => import('../views/review/TestCaseReview.vue')
  },
  {
    path: '/review/requirement',
    name: 'RequirementReview',
    component: () => import('../views/review/RequirementReview.vue')
  },
  {
    path: '/tools/format-converter',
    name: 'FormatConverter',
    component: () => import('../views/tools/FormatConverter.vue')
  },
  {
    path: '/tools/file-info',
    name: 'FileInfo',
    component: () => import('../views/tools/FileInfo.vue')
  },
  {
    path: '/api/test',
    name: 'ApiTest',
    component: () => import('../views/api/ApiTest.vue')
  },
  {
    path: '/api/wss',
    name: 'WssTest',
    component: () => import('../views/api/WssTest.vue')
  },
  {
    path: '/api/generate',
    name: 'ApiGenerate',
    component: () => import('../views/api/ApiGenerate.vue')
  },
  {
    path: '/api/docs',
    name: 'ApiDocs',
    component: () => import('../views/api/ApiDocs.vue')
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
