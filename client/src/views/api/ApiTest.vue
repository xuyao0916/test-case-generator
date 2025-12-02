<template>
  <div class="api-test">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>接口测试</h2>
          <p>测试API接口的功能和性能</p>
        </div>
      </template>
      
      <el-form :model="testForm" label-width="120px" class="test-form">
        <el-form-item label="cURL命令">
          <div class="curl-list-block">
            <div v-for="(c, idx) in curlList" :key="idx" class="curl-row">
              <el-input
                v-model="curlList[idx]"
                type="textarea"
                :rows="6"
                placeholder="输入cURL命令"
              ></el-input>
              <el-button v-if="curlList.length > 1" text type="danger" @click="removeCurl(idx)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
            <el-button text type="primary" @click="addCurl">
              <el-icon><Plus /></el-icon>
              添加cURL
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="请求方法">
          <el-select v-model="testForm.method" placeholder="选择请求方法">
            <el-option label="GET" value="GET"></el-option>
            <el-option label="POST" value="POST"></el-option>
            <el-option label="PUT" value="PUT"></el-option>
            <el-option label="DELETE" value="DELETE"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="请求URL">
          <el-input v-model="testForm.url" placeholder="输入API接口地址"></el-input>
        </el-form-item>
        
        <el-form-item label="请求头">
          <el-input
            v-model="testForm.headers"
            type="textarea"
            :rows="3"
            placeholder='JSON格式，例如：{"Content-Type": "application/json"}'
          ></el-input>
        </el-form-item>
        
        <el-form-item label="请求体" v-if="testForm.method !== 'GET'">
          <el-input
            v-model="testForm.body"
            type="textarea"
            :rows="5"
            placeholder="JSON格式的请求体数据"
          ></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="sendRequest" :loading="loading">
            <el-icon><Position /></el-icon>
            发送请求
          </el-button>
          <el-button type="success" @click="generateAndExecuteFromCurl" :loading="execLoading">
            自动生成并执行用例
          </el-button>
          <el-button @click="clearForm">
            <el-icon><RefreshLeft /></el-icon>
            清空
          </el-button>
        </el-form-item>
      </el-form>
      
      <el-divider>响应结果</el-divider>
      
      <div v-if="responseTabs && responseTabs.length" class="response-section">
        <el-tabs v-model="activeRespTab" type="border-card">
          <el-tab-pane
            v-for="(respItem, idx) in responseTabs"
            :key="idx"
            :label="getTabLabel(idx, respItem.request)"
            :name="String(idx + 1)"
          >
            <el-descriptions :column="2" border>
              <el-descriptions-item label="状态码">
                <el-tag :type="getStatusType(respItem.status)">{{ respItem.status }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="响应时间">
                {{ respItem.duration }}ms
              </el-descriptions-item>
              <el-descriptions-item label="请求方法">
                {{ respItem.request?.method }}
              </el-descriptions-item>
              <el-descriptions-item label="请求URL">
                {{ respItem.request?.url }}
              </el-descriptions-item>
            </el-descriptions>
            <div class="response-content">
              <h4>请求头：</h4>
              <el-input
                :model-value="formatResponse(respItem.request?.headers || {})"
                type="textarea"
                :rows="6"
                readonly
                class="response-textarea"
              ></el-input>
            </div>
            <div class="response-content" v-if="respItem.request && respItem.request.body !== undefined">
              <h4>请求体：</h4>
              <el-input
                :model-value="formatResponse(respItem.request?.body ?? null)"
                type="textarea"
                :rows="6"
                readonly
                class="response-textarea"
              ></el-input>
            </div>
            <div class="response-content">
              <h4>响应内容：</h4>
              <el-input
                :model-value="respItem.data"
                type="textarea"
                :rows="10"
                readonly
                class="response-textarea"
              ></el-input>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <div v-else-if="response" class="response-section">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态码">
            <el-tag :type="getStatusType(response.status)">{{ response.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ response.duration }}ms
          </el-descriptions-item>
          <el-descriptions-item label="请求方法">
            {{ response.request?.method || testForm.method }}
          </el-descriptions-item>
          <el-descriptions-item label="请求URL">
            {{ response.request?.url || testForm.url }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="response-content">
          <h4>请求头：</h4>
          <el-input
            :model-value="formatResponse(response.request?.headers || parseJSONSafe(testForm.headers))"
            type="textarea"
            :rows="6"
            readonly
            class="response-textarea"
          ></el-input>
        </div>
        <div class="response-content" v-if="(response.request && response.request.body !== undefined) || testForm.method !== 'GET'">
          <h4>请求体：</h4>
          <el-input
            :model-value="formatResponse(response.request?.body ?? parseJSONSafe(testForm.body))"
            type="textarea"
            :rows="6"
            readonly
            class="response-textarea"
          ></el-input>
        </div>
        <div class="response-content">
          <h4>响应内容：</h4>
          <el-input
            v-model="response.data"
            type="textarea"
            :rows="10"
            readonly
            class="response-textarea"
          ></el-input>
        </div>
      </div>

      <el-empty v-else description="暂无响应数据" />

      <el-divider>批量测试结果</el-divider>
      <div v-if="batchResult" class="response-section">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="用例数">{{ batchResult.summary.total }}</el-descriptions-item>
          <el-descriptions-item label="通过">{{ batchResult.summary.passed }}</el-descriptions-item>
          <el-descriptions-item label="通过率">{{ batchResult.summary.passRate }}%</el-descriptions-item>
        </el-descriptions>
        <el-tabs v-model="activeTab" type="border-card" style="margin-top: 12px;">
          <el-tab-pane
            v-for="(grp, idx) in groups"
            :key="idx"
            :label="getTabLabel(idx, grp.base)"
            :name="String(idx + 1)"
          >
            <el-table :data="grp.items" style="width: 100%;">
              <el-table-column prop="name" label="用例" width="220" />
              <el-table-column prop="status" label="状态码" width="100" />
              <el-table-column prop="duration" label="耗时(ms)" width="120" />
              <el-table-column label="方法" width="100">
                <template #default="scope">{{ scope.row.request?.method }}</template>
              </el-table-column>
              <el-table-column label="URL" min-width="240">
                <template #default="scope">{{ scope.row.request?.url }}</template>
              </el-table-column>
              <el-table-column label="结果">
                <template #default="scope">
                  <el-tag :type="scope.row.success ? 'success' : 'danger'">{{ scope.row.success ? '通过' : '失败' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="响应" min-width="300">
                <template #default="scope">
                  <el-input
                    :model-value="formatResponse(scope.row.response)"
                    type="textarea"
                    :rows="4"
                    readonly
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column label="请求头" min-width="260">
                <template #default="scope">
                  <el-input
                    :model-value="formatResponse(scope.row.request?.headers || {})"
                    type="textarea"
                    :rows="3"
                    readonly
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column label="请求体" min-width="260">
                <template #default="scope">
                  <el-input
                    :model-value="formatResponse(scope.row.request?.data ?? scope.row.request?.body ?? null)"
                    type="textarea"
                    :rows="3"
                    readonly
                  ></el-input>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Position, RefreshLeft, Plus, Delete } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

export default {
  name: 'ApiTest',
  components: {
    Position,
    RefreshLeft,
    Plus,
    Delete
  },
  setup() {
    const loading = ref(false)
    const execLoading = ref(false)
    const response = ref(null)
    const responseTabs = ref([])
    const activeRespTab = ref('1')
    const batchResult = ref(null)
    const curlList = ref([''])
    const activeTab = ref('1')
    const groups = computed(() => {
      const br = batchResult.value
      if (!br) return []
      const itemsByGroup = {}
      ;(br.results || []).forEach(r => {
        const gi = r.groupIndex || 1
        if (!itemsByGroup[gi]) itemsByGroup[gi] = []
        itemsByGroup[gi].push(r)
      })
      const bases = br.baseRequests || (br.baseRequest ? [br.baseRequest] : [])
      const maxGroup = Math.max(...Object.keys(itemsByGroup).map(n => Number(n)), bases.length || 1, 1)
      const arr = []
      for (let i = 1; i <= maxGroup; i++) {
        arr.push({ items: itemsByGroup[i] || [], base: bases[i - 1] })
      }
      return arr
    })
    const getTabLabel = (idx, base) => {
      const n = idx + 1
      if (base && base.url) {
        try {
          const u = new URL(base.url)
          return `cURL ${n} (${(base.method || 'GET')} ${u.pathname})`
        } catch {
          return `cURL ${n}`
        }
      }
      return `cURL ${n}`
    }
    
    const testForm = reactive({
      method: 'GET',
      url: '',
      headers: '',
      body: ''
    })
    
    const route = useRoute()
    if (route.query.method) {
      testForm.method = route.query.method
    }
    if (route.query.url) {
      testForm.url = route.query.url
    }
    
    const sendRequest = async () => {
      const inputs = (curlList.value || []).map(s => (s || '').trim()).filter(s => s)
      if (inputs.length > 0) {
        loading.value = true
        response.value = null
        responseTabs.value = []
        try {
          const tasks = inputs.map(async (c) => {
            const parseRes = await axios.post('/api/parse-curl', { curl: c })
            if (!parseRes.data || !parseRes.data.success) throw new Error(parseRes.data?.error || 'cURL解析失败')
            const base = parseRes.data.request
            const startTime = Date.now()
            const res = await axios.post('/api/proxy-request', {
              method: base.method,
              url: base.url,
              headers: base.headers || {},
              data: base.body ?? base.data
            })
            const endTime = Date.now()
            return {
              status: res.data.status,
              duration: res.data.duration ?? (endTime - startTime),
              data: JSON.stringify(res.data.data ?? res.data, null, 2),
              request: res.data.request
            }
          })
          const items = await Promise.all(tasks)
          responseTabs.value = items
          activeRespTab.value = '1'
          if (items.length > 0) {
            const req = items[0].request || {}
            testForm.method = (req.method || 'GET').toUpperCase()
            testForm.url = req.url || ''
            testForm.headers = JSON.stringify(req.headers || {}, null, 2)
            testForm.body = req.body ? JSON.stringify(req.body, null, 2) : ''
          }
          ElMessage.success('请求发送成功')
        } catch (error) {
          ElMessage.error('请求失败：' + (error.message || '未知错误'))
        } finally {
          loading.value = false
        }
        return
      }
      // 单请求：使用表单参数发送
      if (!testForm.url) {
        ElMessage.warning('请输入API接口地址或提供cURL命令')
        return
      }
      loading.value = true
      const startTime = Date.now()
      let headers = {}
      let data = null
      try {
        if (testForm.headers) {
          try {
            headers = JSON.parse(testForm.headers)
          } catch (e) {
            ElMessage.error('请求头格式错误，请使用JSON格式')
            loading.value = false
            return
          }
        }
        if (testForm.body && testForm.method !== 'GET') {
          try {
            data = JSON.parse(testForm.body)
          } catch (e) {
            ElMessage.error('请求体格式错误，请使用JSON格式')
            loading.value = false
            return
          }
        }
        const res = await axios.post('/api/proxy-request', {
          method: testForm.method,
          url: testForm.url,
          headers,
          data
        })
        const endTime = Date.now()
        responseTabs.value = [{
          status: res.data.status,
          duration: res.data.duration ?? (endTime - startTime),
          data: JSON.stringify(res.data.data ?? res.data, null, 2),
          request: res.data.request
        }]
        activeRespTab.value = '1'
        if (res.data && res.data.request) {
          const req = res.data.request
          testForm.method = (req.method || 'GET').toUpperCase()
          testForm.url = req.url || ''
          testForm.headers = JSON.stringify(req.headers || {}, null, 2)
          testForm.body = req.body ? JSON.stringify(req.body, null, 2) : ''
        }
        ElMessage.success('请求发送成功')
      } catch (error) {
        const endTime = Date.now()
        responseTabs.value = [{
          status: error.response?.status || 'Error',
          duration: endTime - startTime,
          data: JSON.stringify({
            error: error.message,
            details: error.response?.data || '网络错误或服务器无响应'
          }, null, 2),
          request: {
            method: testForm.method,
            url: testForm.url,
            headers,
            body: data ?? null
          }
        }]
        activeRespTab.value = '1'
        ElMessage.error('请求失败：' + error.message)
      } finally {
        loading.value = false
      }
    }
    
    const generateAndExecuteFromCurl = async () => {
      const inputs = (curlList.value || []).map(s => (s || '').trim()).filter(s => s)
      if (inputs.length === 0) {
        ElMessage.warning('请输入cURL命令')
        return
      }
      execLoading.value = true
      batchResult.value = null
      try {
        const endpoint = inputs.length > 1 ? '/api/execute-api-tests-multi' : '/api/execute-api-tests'
        const payload = inputs.length > 1 ? { curls: inputs } : { curl: inputs[0] }
        const res = await axios.post(endpoint, payload)
        if (res.data && res.data.success) {
          batchResult.value = res.data
          // 同步填充单次请求表单，便于用户复用
          const base = res.data.baseRequest
          if (base) {
            testForm.method = base.method || 'GET'
            testForm.url = base.url || ''
            testForm.headers = JSON.stringify(base.headers || {}, null, 2)
            testForm.body = base.body ? JSON.stringify(base.body, null, 2) : ''
          }
          ElMessage.success('用例已生成并执行完成')
          activeTab.value = '1'
        } else {
          ElMessage.error(res.data?.error || '执行失败')
        }
      } catch (e) {
        ElMessage.error('执行失败：' + (e.message || '未知错误'))
      } finally {
        execLoading.value = false
      }
    }
    
    const clearForm = () => {
      testForm.method = 'GET'
      testForm.url = ''
      testForm.headers = ''
      testForm.body = ''
      response.value = null
      responseTabs.value = []
      batchResult.value = null
      curlList.value = ['']
      activeTab.value = '1'
      activeRespTab.value = '1'
    }

    const addCurl = () => {
      curlList.value.push('')
    }

    const removeCurl = (idx) => {
      if (curlList.value.length > 1) {
        curlList.value.splice(idx, 1)
      }
    }
    
    const getStatusType = (status) => {
      if (status >= 200 && status < 300) return 'success'
      if (status >= 300 && status < 400) return 'warning'
      if (status >= 400) return 'danger'
      return 'info'
    }

    const formatResponse = (data) => {
      try {
        return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      } catch (e) {
        return String(data)
      }
    }

    const parseJSONSafe = (text) => {
      try {
        return text ? JSON.parse(text) : {}
      } catch {
        return text || ''
      }
    }

    watch([activeRespTab, responseTabs], () => {
      const idx = Number(activeRespTab.value) - 1
      const item = responseTabs.value && responseTabs.value[idx]
      const req = item && item.request
      if (req) {
        testForm.method = (req.method || 'GET').toUpperCase()
        testForm.url = req.url || ''
        testForm.headers = JSON.stringify(req.headers || {}, null, 2)
        testForm.body = req.body ? JSON.stringify(req.body, null, 2) : ''
      }
    })

    return {
      testForm,
      loading,
      execLoading,
      response,
      responseTabs,
      activeRespTab,
      batchResult,
      curlList,
      activeTab,
      groups,
      getTabLabel,
      sendRequest,
      generateAndExecuteFromCurl,
      clearForm,
      getStatusType,
      formatResponse,
      parseJSONSafe,
      addCurl,
      removeCurl
    }
  }
}
</script>

<style scoped>
.api-test {
  padding: 20px;
}

.page-card {
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.test-form {
  margin-bottom: 20px;
}

.response-section {
  margin-top: 20px;
}

.response-content {
  margin-top: 16px;
}

.response-content h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.response-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.response-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f8f9fa;
}

.curl-list-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curl-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.curl-row :deep(.el-input) {
  flex: 1;
}
.curl-list-block {
  width: 100%;
}
</style>
