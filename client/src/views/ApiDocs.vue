<template>
  <div class="api-docs">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>API文档</h2>
          <p>管理和查看API接口文档</p>
        </div>
      </template>
      
      <div class="docs-toolbar">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加接口
        </el-button>
        <el-input
          v-model="searchText"
          placeholder="搜索接口名称或路径"
          style="width: 300px; margin-left: 16px;"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      
      <el-table :data="filteredApis" style="width: 100%; margin-top: 20px;" stripe>
        <el-table-column prop="name" label="接口名称" width="200" />
        <el-table-column prop="method" label="请求方法" width="100">
          <template #default="scope">
            <el-tag :type="getMethodType(scope.row.method)">{{ scope.row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="接口路径" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" @click="viewApi(scope.row)">
              <el-icon><ViewIcon /></el-icon>
              查看
            </el-button>
            <el-button size="small" type="primary" @click="testApi(scope.row)">
              <el-icon><Position /></el-icon>
              测试
            </el-button>
            <el-button size="small" type="danger" @click="deleteApi(scope.$index)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="filteredApis.length === 0" description="暂无API接口数据" />
    </el-card>
    
    <!-- 添加接口对话框 -->
    <el-dialog v-model="showAddDialog" title="添加API接口" width="600px">
      <el-form :model="newApi" label-width="100px">
        <el-form-item label="接口名称" required>
          <el-input v-model="newApi.name" placeholder="输入接口名称" />
        </el-form-item>
        <el-form-item label="请求方法" required>
          <el-select v-model="newApi.method" placeholder="选择请求方法">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="接口路径" required>
          <el-input v-model="newApi.path" placeholder="例如：/api/users" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newApi.description" type="textarea" :rows="3" placeholder="接口功能描述" />
        </el-form-item>
        <el-form-item label="请求参数">
          <el-input v-model="newApi.parameters" type="textarea" :rows="4" placeholder="JSON格式的参数说明" />
        </el-form-item>
        <el-form-item label="响应示例">
          <el-input v-model="newApi.response" type="textarea" :rows="4" placeholder="JSON格式的响应示例" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addApi">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 查看接口详情对话框 -->
    <el-dialog v-model="showViewDialog" title="接口详情" width="800px">
      <div v-if="currentApi" class="api-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="接口名称">{{ currentApi.name }}</el-descriptions-item>
          <el-descriptions-item label="请求方法">
            <el-tag :type="getMethodType(currentApi.method)">{{ currentApi.method }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="接口路径" :span="2">{{ currentApi.path }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentApi.description || '暂无描述' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>请求参数：</h4>
          <el-input
            :model-value="currentApi.parameters || '暂无参数说明'"
            type="textarea"
            :rows="6"
            readonly
            class="code-textarea"
          />
        </div>
        
        <div class="detail-section">
          <h4>响应示例：</h4>
          <el-input
            :model-value="currentApi.response || '暂无响应示例'"
            type="textarea"
            :rows="6"
            readonly
            class="code-textarea"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, View as ViewIcon, Position, Delete } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

export default {
  name: 'ApiDocs',
  components: {
    Plus,
    Search,
    ViewIcon,
    Position,
    Delete
  },
  setup() {
    const router = useRouter()
    const searchText = ref('')
    const showAddDialog = ref(false)
    const showViewDialog = ref(false)
    const currentApi = ref(null)
    
    // 示例API数据
    const apis = ref([
      {
        name: '生成测试用例',
        method: 'POST',
        path: '/api/generate',
        description: '根据输入内容生成测试用例',
        parameters: JSON.stringify({
          textInput: 'string - 文本输入内容',
          file: 'file - 上传的文件（可选）'
        }, null, 2),
        response: JSON.stringify({
          success: true,
          content: '生成的测试用例内容',
          downloadUrl: '/api/download/filename.xmind'
        }, null, 2)
      },
      {
        name: '获取历史记录',
        method: 'GET',
        path: '/api/history',
        description: '获取测试用例生成历史记录',
        parameters: '无需参数',
        response: JSON.stringify({
          success: true,
          data: [
            {
              id: 1234567890,
              title: '测试用例标题',
              description: '描述信息',
              createTime: 1234567890,
              downloadUrl: '/api/download/filename.xmind'
            }
          ]
        }, null, 2)
      },
      {
        name: '健康检查',
        method: 'GET',
        path: '/api/health',
        description: '检查服务器运行状态',
        parameters: '无需参数',
        response: JSON.stringify({
          status: 'OK',
          message: '测试用例生成平台运行正常'
        }, null, 2)
      }
    ])
    
    const newApi = reactive({
      name: '',
      method: 'GET',
      path: '',
      description: '',
      parameters: '',
      response: ''
    })
    
    const filteredApis = computed(() => {
      if (!searchText.value) return apis.value
      return apis.value.filter(api => 
        api.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        api.path.toLowerCase().includes(searchText.value.toLowerCase())
      )
    })
    
    const getMethodType = (method) => {
      const types = {
        GET: 'success',
        POST: 'primary',
        PUT: 'warning',
        DELETE: 'danger'
      }
      return types[method] || 'info'
    }
    
    const addApi = () => {
      if (!newApi.name || !newApi.method || !newApi.path) {
        ElMessage.warning('请填写必填字段')
        return
      }
      
      apis.value.push({ ...newApi })
      
      // 重置表单
      Object.assign(newApi, {
        name: '',
        method: 'GET',
        path: '',
        description: '',
        parameters: '',
        response: ''
      })
      
      showAddDialog.value = false
      ElMessage.success('添加成功')
    }
    
    const viewApi = (api) => {
      currentApi.value = api
      showViewDialog.value = true
    }
    
    const testApi = (api) => {
      // 跳转到接口测试页面，并预填充数据
      router.push({
        path: '/api/test',
        query: {
          method: api.method,
          url: `http://localhost:3001${api.path}`
        }
      })
    }
    
    const deleteApi = async (index) => {
      try {
        await ElMessageBox.confirm('确定要删除这个接口吗？', '确认删除', {
          type: 'warning'
        })
        apis.value.splice(index, 1)
        ElMessage.success('删除成功')
      } catch {
        // 用户取消删除
      }
    }
    
    return {
      searchText,
      showAddDialog,
      showViewDialog,
      currentApi,
      apis,
      newApi,
      filteredApis,
      getMethodType,
      addApi,
      viewApi,
      testApi,
      deleteApi
    }
  }
}
</script>

<style scoped>
.api-docs {
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

.docs-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.api-detail {
  padding: 16px 0;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.code-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f8f9fa;
}
</style>