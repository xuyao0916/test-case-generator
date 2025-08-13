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
          <el-button @click="clearForm">
            <el-icon><RefreshLeft /></el-icon>
            清空
          </el-button>
        </el-form-item>
      </el-form>
      
      <el-divider>响应结果</el-divider>
      
      <div v-if="response" class="response-section">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态码">
            <el-tag :type="getStatusType(response.status)">{{ response.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ response.duration }}ms
          </el-descriptions-item>
        </el-descriptions>
        
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
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Position, RefreshLeft } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

export default {
  name: 'ApiTest',
  components: {
    Position,
    RefreshLeft
  },
  setup() {
    const loading = ref(false)
    const response = ref(null)
    
    const testForm = reactive({
      method: 'GET',
      url: '',
      headers: '',
      body: ''
    })
    
    // 从路由查询参数中获取预填充数据
    const route = useRoute()
    if (route.query.method) {
      testForm.method = route.query.method
    }
    if (route.query.url) {
      testForm.url = route.query.url
    }
    
    const sendRequest = async () => {
      if (!testForm.url) {
        ElMessage.warning('请输入API接口地址')
        return
      }
      
      loading.value = true
      const startTime = Date.now()
      
      try {
        let headers = {}
        if (testForm.headers) {
          try {
            headers = JSON.parse(testForm.headers)
          } catch (e) {
            ElMessage.error('请求头格式错误，请使用JSON格式')
            loading.value = false
            return
          }
        }
        
        let data = null
        if (testForm.body && testForm.method !== 'GET') {
          try {
            data = JSON.parse(testForm.body)
          } catch (e) {
            ElMessage.error('请求体格式错误，请使用JSON格式')
            loading.value = false
            return
          }
        }
        
        const config = {
          method: testForm.method.toLowerCase(),
          url: testForm.url,
          headers,
          timeout: 30000
        }
        
        if (data) {
          config.data = data
        }
        
        const res = await axios(config)
        const endTime = Date.now()
        
        response.value = {
          status: res.status,
          duration: endTime - startTime,
          data: JSON.stringify(res.data, null, 2)
        }
        
        ElMessage.success('请求发送成功')
      } catch (error) {
        const endTime = Date.now()
        
        response.value = {
          status: error.response?.status || 'Error',
          duration: endTime - startTime,
          data: JSON.stringify({
            error: error.message,
            details: error.response?.data || '网络错误或服务器无响应'
          }, null, 2)
        }
        
        ElMessage.error('请求失败：' + error.message)
      } finally {
        loading.value = false
      }
    }
    
    const clearForm = () => {
      testForm.method = 'GET'
      testForm.url = ''
      testForm.headers = ''
      testForm.body = ''
      response.value = null
    }
    
    const getStatusType = (status) => {
      if (status >= 200 && status < 300) return 'success'
      if (status >= 300 && status < 400) return 'warning'
      if (status >= 400) return 'danger'
      return 'info'
    }

    return {
      testForm,
      loading,
      response,
      sendRequest,
      clearForm,
      getStatusType
    }
  }
}
</script>

<style scoped>
.api-test {
  padding: 20px;
}

.page-card {
  max-width: 1200px;
  margin: 0 auto;
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
</style>