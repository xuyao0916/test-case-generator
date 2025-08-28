<template>
  <div class="home">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>测试用例生成器</span>
          <el-icon><DocumentAdd /></el-icon>
        </div>
      </template>

      <!-- API选择区域 -->
      <div class="api-selection">
        <h3>选择AI服务</h3>
        <el-radio-group v-model="selectedApi" class="api-radio-group">
          <el-radio-button label="cybotstar">Cybotstar AI</el-radio-button>
          <el-radio-button label="deepseek">DeepSeek AI</el-radio-button>
        </el-radio-group>
        <div class="api-description">
          <span v-if="selectedApi === 'cybotstar'" class="api-desc">
            <el-icon><Star /></el-icon>
            Cybotstar AI - 专业的测试用例生成服务
          </span>
          <span v-if="selectedApi === 'deepseek'" class="api-desc">
            <el-icon><Cpu /></el-icon>
            DeepSeek AI - 强大的代码理解和生成能力
          </span>
        </div>
      </div>

      <!-- 输入方式选择 -->
      <div class="input-mode-selection">
        <h3>选择输入方式</h3>
        <el-radio-group v-model="inputMode" class="mode-radio-group">
          <el-radio-button label="text">文本输入</el-radio-button>
          <el-radio-button label="file" :disabled="selectedApi === 'cybotstar'">文件上传</el-radio-button>
        </el-radio-group>
        <div v-if="selectedApi === 'cybotstar' && inputMode === 'file'" class="mode-notice">
          <el-alert
            title="该功能后续支持"
            type="warning"
            :closable="false"
            show-icon
          >
            Cybotstar AI 暂不支持文件上传功能，请使用文本输入方式。
          </el-alert>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-section">
        <!-- 文本输入 -->
        <div v-if="inputMode === 'text'" class="text-input-area">
          <div class="input-header">
            <h3>文本输入</h3>
          </div>
          <el-input
            v-model="textInput"
            type="textarea"
            :rows="10"
            placeholder="请输入需要生成测试用例的需求描述或功能说明...\n\n例如：\n- 输入框只能输入1-10的数字\n- 用户登录功能验证\n- 购物车添加商品功能"
            class="text-input"
          />
        </div>

        <!-- 文件上传 -->
        <div v-if="inputMode === 'file'" class="file-upload-area">
          <div class="input-header">
            <h3>文件上传</h3>
            <el-alert
              title="文件上传功能后续支持"
              type="info"
              :closable="false"
              show-icon
              class="upload-notice"
              v-if="selectedApi === 'cybotstar'"
            >
              当前版本仅支持文本输入生成测试用例，文件上传功能将在后续版本中提供。
            </el-alert>
          </div>
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            accept=".txt,.md,.docx,.doc,.pdf,.xlsx,.xls,.json,.xml,.csv"
            :limit="1"
            :disabled="selectedApi === 'cybotstar'"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持格式：.txt, .md, .docx, .doc, .pdf, .xlsx, .xls, .json, .xml, .csv（最大10MB）
              </div>
            </template>
          </el-upload>
        </div>
      </div>

      <!-- 生成按钮 -->
      <div class="action-section">
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="generateTestCases"
          :disabled="!canGenerate"
          class="generate-btn"
        >
          <el-icon v-if="!loading"><Magic /></el-icon>
          {{ loading ? '生成中...' : '开始生成测试用例' }}
        </el-button>
      </div>
    </el-card>

    <!-- 结果展示区域 -->
    <el-card v-if="result" class="result-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>生成结果</span>
          <div class="header-actions">
            <el-button
              type="success"
              size="small"
              @click="downloadResult"
              :disabled="!downloadUrl"
            >
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
            <el-button
              size="small"
              @click="copyToClipboard"
            >
              <el-icon><DocumentCopy /></el-icon>
              复制内容
            </el-button>
          </div>
        </div>
      </template>

      <div class="result-content">
        <pre>{{ result }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

export default {
  name: 'Home',
  components: {
    UploadFilled
  },
  data() {
    return {
      textInput: '',
      loading: false,
      result: '',
      downloadUrl: '',
      selectedApi: 'cybotstar', // 默认选择Cybotstar
      inputMode: 'text', // 默认文本输入
      fileList: [],
      uploadedFile: null
    }
  },
  computed: {
    canGenerate() {
      if (this.inputMode === 'text') {
        return this.textInput.trim().length > 0 && this.selectedApi
      } else {
        return this.uploadedFile && this.selectedApi
      }
    }
  },
  watch: {
    selectedApi(newVal) {
      // 当切换到Cybotstar且当前为文件上传模式时，自动切换到文本输入
      if (newVal === 'cybotstar' && this.inputMode === 'file') {
        this.inputMode = 'text'
        this.fileList = []
        this.uploadedFile = null
      }
    }
  },
  methods: {
    async generateTestCases() {
      this.loading = true
      this.result = ''
      this.downloadUrl = ''

      try {
        let response
        
        if (this.inputMode === 'text') {
          // 文本输入模式
          response = await axios.post('/api/generate', {
            content: this.textInput,
            apiProvider: this.selectedApi
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        } else {
          // 文件上传模式
          const formData = new FormData()
          formData.append('file', this.uploadedFile)
          formData.append('apiProvider', this.selectedApi)
          
          response = await axios.post('/api/generate', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        }

        if (response.data.success) {
          this.result = response.data.content
          this.downloadUrl = response.data.downloadUrl
          ElMessage.success('测试用例生成成功！')
        } else {
          throw new Error(response.data.error || '生成失败')
        }
      } catch (error) {
        console.error('生成失败:', error)
        ElMessage.error(error.response?.data?.error || '生成测试用例失败，请稍后重试')
      } finally {
        this.loading = false
      }
    },

    handleFileChange(file) {
      // 文件大小检查（10MB）
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        ElMessage.error('文件大小不能超过 10MB!')
        return false
      }
      
      // 文件类型检查
      const allowedTypes = ['.txt', '.md', '.docx', '.doc', '.pdf', '.xlsx', '.xls', '.json', '.xml', '.csv']
      const fileName = file.name.toLowerCase()
      const isValidType = allowedTypes.some(type => fileName.endsWith(type))
      
      if (!isValidType) {
        ElMessage.error('不支持的文件格式！')
        return false
      }
      
      this.uploadedFile = file.raw
      ElMessage.success('文件上传成功！')
    },

    handleFileRemove() {
      this.uploadedFile = null
      this.fileList = []
    },

    async downloadResult() {
      if (!this.downloadUrl) return

      try {
        const response = await axios.get(this.downloadUrl, {
          responseType: 'blob'
        })

        const blob = new Blob([response.data], { type: 'application/octet-stream' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `test-cases-${new Date().getTime()}.xmind`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        ElMessage.success('文件下载成功！')
      } catch (error) {
        console.error('下载失败:', error)
        ElMessage.error('文件下载失败')
      }
    },

    async copyToClipboard() {
      try {
        // 优先使用现代的 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.result)
          ElMessage.success('内容已复制到剪贴板！')
        } else {
          // 降级到传统的复制方法
          this.fallbackCopyToClipboard(this.result)
        }
      } catch (error) {
        console.error('复制失败:', error)
        // 如果现代API失败，尝试降级方法
        try {
          this.fallbackCopyToClipboard(this.result)
        } catch (fallbackError) {
          console.error('降级复制也失败:', fallbackError)
          ElMessage.error('复制失败，请手动选择文本复制')
        }
      }
    },

    fallbackCopyToClipboard(text) {
      // 创建临时文本区域
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          ElMessage.success('内容已复制到剪贴板！')
        } else {
          throw new Error('execCommand failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.main-card, .result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.api-selection {
  margin-bottom: 25px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.api-selection h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.api-radio-group {
  margin-bottom: 15px;
}

.api-description {
  margin-top: 10px;
}

.api-desc {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6c757d;
  font-size: 14px;
  font-style: italic;
}

.api-desc .el-icon {
  color: #409eff;
}

.input-mode-selection {
  margin-bottom: 25px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.input-mode-selection h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.mode-radio-group {
  margin-bottom: 15px;
}

.mode-notice {
  margin-top: 10px;
}

.input-section {
  margin-bottom: 20px;
}

.text-input-area,
.file-upload-area {
  min-height: 200px;
}

.upload-demo {
  width: 100%;
}

.upload-demo .el-upload {
  width: 100%;
}

.upload-demo .el-upload-dragger {
  width: 100%;
  height: 180px;
}

.input-header {
  margin-bottom: 15px;
}

.input-header h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 18px;
}

.upload-notice {
  margin-bottom: 15px;
}

.text-input {
  width: 100%;
}

.action-section {
  text-align: center;
  padding: 20px 0;
}

.generate-btn {
  padding: 12px 30px;
  font-size: 16px;
  border-radius: 8px;
}

.result-content {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
}

.result-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #2c3e50;
}
</style>