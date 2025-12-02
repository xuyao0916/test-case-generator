<template>
  <div class="api-generate">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>接口用例生成</h2>
          <p>基于接口信息自动生成测试用例</p>
        </div>
      </template>
      
      <!-- 第一步：选择输入方式 -->
      <div class="step-section">
        <h3 class="step-title">第一步：选择输入方式</h3>
        <el-radio-group v-model="generateForm.inputType" class="input-type-selector">
          <el-radio-button label="curl">cURL命令</el-radio-button>
          <el-radio-button label="doc">接口文档</el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 第二步：输入接口信息 -->
      <div v-if="generateForm.inputType" class="step-section">
        <h3 class="step-title">第二步：输入接口信息</h3>
        
        <!-- cURL命令输入模式 -->
        <div v-if="generateForm.inputType === 'curl'" class="curl-input-section">
          <div class="curl-header">
            <h3>接口信息输入</h3>
            <el-button type="primary" size="small" @click="addApiInput">
              <el-icon><Plus /></el-icon>
              添加接口
            </el-button>
          </div>
          
          <div class="curl-list">
            <div 
              v-for="(api, index) in generateForm.apiList" 
              :key="index" 
              class="curl-item"
            >
              <div class="curl-item-header">
                <span class="curl-index">接口 {{ index + 1 }}</span>
                <el-button 
                  v-if="generateForm.apiList.length > 1"
                  type="danger" 
                  size="small" 
                  text 
                  @click="removeApiInput(index)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
              
              <div class="api-input-row">
                <div class="api-name-input">
                  <label>接口名称：</label>
                  <el-input
                    v-model="api.name"
                    placeholder="请输入接口名称..."
                  />
                </div>
                <div class="api-curl-input">
                  <label>cURL命令：</label>
                  <el-input
                    v-model="api.command"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入cURL命令..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 接口文档输入模式 -->
        <div v-if="generateForm.inputType === 'doc'" class="doc-input-section">
          <el-form label-position="top">
            <el-form-item label="接口名称" required>
              <el-input 
                v-model="generateForm.singleApiName" 
                placeholder="请输入接口名称"
                clearable
              ></el-input>
            </el-form-item>
            
            <el-form-item label="接口文档" required>
              <el-input
                v-model="generateForm.apiDoc"
                type="textarea"
                :rows="10"
                placeholder="请输入接口文档内容，包括请求方法、URL、参数说明、响应格式等..."
                clearable
              ></el-input>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button type="primary" @click="generateTestCases" :loading="loading" size="large">
            <el-icon><Magic /></el-icon>
            生成测试用例
          </el-button>
          <el-button @click="clearForm" size="large">
            <el-icon><RefreshLeft /></el-icon>
            清空表单
          </el-button>
        </div>
      </div>
      
      <el-divider>生成结果</el-divider>
      
      <div v-if="result" class="result-section">
        <div class="result-actions">
          <el-button @click="copyResult" size="small">
            <el-icon><CopyDocument /></el-icon>
            复制内容
          </el-button>
          <el-button @click="downloadResult" size="small" type="success">
            <el-icon><Download /></el-icon>
            {{ downloadUrl ? '下载Excel表格' : '下载文本文件' }}
          </el-button>
        </div>
        <div class="markdown-content" v-html="result"></div>
      </div>
      
      <el-empty v-else description="暂无生成结果" />
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Magic, RefreshLeft, CopyDocument, Download, Plus, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

export default {
  name: 'ApiGenerate',
  components: {
    Magic,
    RefreshLeft,
    CopyDocument,
    Download,
    Plus,
    Delete
  },
  setup() {
    const loading = ref(false)
    const result = ref('')
    const downloadUrl = ref('')
    
    const generateForm = reactive({
      inputType: '',
      apiList: [{ name: '', command: '' }],
      singleApiName: '',
      apiDoc: ''
    })
    
    const addApiInput = () => {
      generateForm.apiList.push({ name: '', command: '' })
    }
    
    const removeApiInput = (index) => {
      if (generateForm.apiList.length > 1) {
        generateForm.apiList.splice(index, 1)
      }
    }
    
    const generateTestCases = async () => {
      if (generateForm.inputType === 'curl') {
        const hasValidApi = generateForm.apiList.some(api => api.name.trim() && api.command.trim())
        if (!hasValidApi) {
          ElMessage.warning('请至少输入一个完整的接口（包含接口名称和cURL命令）')
          return
        }
        
        const incompleteApis = generateForm.apiList.filter(api => 
          (api.name.trim() && !api.command.trim()) || (!api.name.trim() && api.command.trim())
        )
        if (incompleteApis.length > 0) {
          ElMessage.warning('请确保每个接口都包含名称和cURL命令，或删除不需要的接口')
          return
        }
      }
      
      if (generateForm.inputType === 'doc') {
        if (!generateForm.singleApiName.trim()) {
          ElMessage.warning('请输入接口名称')
          return
        }
        if (!generateForm.apiDoc.trim()) {
          ElMessage.warning('请输入接口文档')
          return
        }
      }
      
      loading.value = true
      
      try {
        let requestData = {}
        
        if (generateForm.inputType === 'curl') {
          const validApis = generateForm.apiList.filter(api => api.name.trim() && api.command.trim())
          
          if (validApis.length === 1) {
            requestData = {
              apiName: validApis[0].name.trim(),
              curlCommands: validApis[0].command.trim()
            }
          } else {
            const apiNames = validApis.map(api => api.name.trim()).join('、')
            const curlCommands = validApis
              .map((api, index) => `# ${api.name.trim()}\n${api.command.trim()}`)
              .join('\n\n')
            
            requestData = {
              apiName: `多接口测试用例（${apiNames}）`,
              curlCommands: curlCommands
            }
          }
        } else {
          requestData = {
            apiName: generateForm.singleApiName.trim(),
            apiDoc: generateForm.apiDoc.trim()
          }
        }
        
        const response = await axios.post('/api/generate-api-test', requestData)
        
        if (response.data.success) {
          result.value = markdownToHtml(response.data.content)
          downloadUrl.value = response.data.downloadUrl || ''
          ElMessage.success('测试用例生成成功！')
        } else {
          ElMessage.error(response.data.error || '生成失败')
        }
      } catch (error) {
        console.error('生成测试用例失败:', error)
        ElMessage.error('生成测试用例失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
    
    const clearForm = () => {
      generateForm.inputType = ''
      generateForm.apiList = [{ name: '', command: '' }]
      generateForm.singleApiName = ''
      generateForm.apiDoc = ''
      result.value = ''
      downloadUrl.value = ''
    }
    
    const markdownToHtml = (markdown) => {
      return markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    }
    
    const copyResult = async () => {
      try {
        const textContent = result.value
          .replace(/<[^>]*>/g, '')
          .replace(/<br>/g, '\n')
        await navigator.clipboard.writeText(textContent)
        ElMessage.success('内容已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败，请手动复制')
      }
    }
    
    const downloadResult = async () => {
      try {
        if (downloadUrl.value) {
          const link = document.createElement('a')
          link.href = downloadUrl.value
          link.download = ''
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          ElMessage.success('Excel文件下载成功')
          return
        }
        
        const textContent = result.value
          .replace(/<[^>]*>/g, '')
          .replace(/<br>/g, '\n')
        
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `api-test-cases-${Date.now()}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        ElMessage.success('文件下载成功')
      } catch (error) {
        ElMessage.error('下载失败，请稍后重试')
      }
    }
    
    return {
      generateForm,
      loading,
      result,
      downloadUrl,
      addApiInput,
      removeApiInput,
      generateTestCases,
      clearForm,
      markdownToHtml,
      copyResult,
      downloadResult
    }
  }
}
</script>

<style scoped>
.api-generate {
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

.step-section {
  margin-bottom: 30px;
}

.step-title {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.input-type-selector {
  margin-bottom: 20px;
}

.curl-input-section {
  margin-top: 20px;
}

.curl-form-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.left-panel {
  flex: 0 0 300px;
}

.right-panel {
  flex: 1;
}

.curl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.curl-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.curl-list {
  margin-bottom: 16px;
}

.curl-item {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fafafa;
}

.curl-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.curl-index {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.api-input-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.api-name-input {
  flex: 0 0 200px;
}

.api-curl-input {
  flex: 1;
}

.api-name-input label,
.api-curl-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

.doc-input-section {
  margin-top: 20px;
}

.action-buttons {
  margin-top: 24px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  line-height: 1.5;
}

.result-section {
  margin-top: 20px;
}

.result-actions {
  margin-bottom: 16px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.markdown-content {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e4e8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  max-height: 60vh;
  overflow-y: auto;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4 {
  margin: 20px 0 12px 0;
  color: #24292e;
  font-weight: 600;
}

.markdown-content h1 {
  font-size: 28px;
  border-bottom: 2px solid #e1e4e8;
  padding-bottom: 10px;
}

.markdown-content h2 {
  font-size: 22px;
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 8px;
}

.markdown-content h3 {
  font-size: 18px;
}

.markdown-content h4 {
  font-size: 16px;
}

.markdown-content ul {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-content li {
  margin: 6px 0;
}

.markdown-content strong {
  font-weight: 600;
  color: #24292e;
}

.markdown-content code {
  background-color: rgba(175, 184, 193, 0.2);
  padding: 3px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 85%;
  color: #d73a49;
}
</style>
