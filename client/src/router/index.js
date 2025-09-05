import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/functional/generate',
    name: 'FunctionalGenerate',
    component: () => import('../views/TestCaseGenerator.vue')
  },
  {
    path: '/functional/step-by-step',
    name: 'StepByStepGenerate',
    component: () => import('../views/StepByStepGenerator.vue')
  },
  {
    path: '/functional/history',
    name: 'FunctionalHistory',
    component: () => import('../views/History.vue')
  },
  {
    path: '/review/testcase',
    name: 'TestCaseReview',
    component: () => import('../views/TestCaseReview.vue')
  },
  {
    path: '/review/requirement',
    name: 'RequirementReview',
    component: () => import('../views/RequirementReview.vue')
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
