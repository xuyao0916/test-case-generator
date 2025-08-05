<template>
  <div class="home">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>测试用例生成器</span>
          <el-icon><DocumentAdd /></el-icon>
        </div>
      </template>

      <!-- 生成按钮 -->
      <div class="input-section">
        <el-tabs v-model="activeTab" class="input-tabs">
          <el-tab-pane label="文件上传" name="file">
            <el-upload
              ref="uploadRef"
              class="upload-demo"
              drag
              :auto-upload="false"
              :on-change="handleFileChange"
              :file-list="fileList"
              accept=".txt,.md,.js,.py,.java,.cpp,.c,.html,.css,.json,.xml,.doc,.docx,.pdf"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 txt/md/js/py/java/cpp/c/html/css/json/xml/doc/docx/pdf 等格式文件
                </div>
              </template>
            </el-upload>
          </el-tab-pane>

          <el-tab-pane label="文本输入" name="text">
            <el-input
              v-model="textInput"
              type="textarea"
              :rows="8"
              placeholder="请输入需要生成测试用例的代码或需求描述..."
              class="text-input"
            />
          </el-tab-pane>
        </el-tabs>
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

export default {
  name: 'Home',
  data() {
    return {
      activeTab: 'text',
      textInput: '',
      fileList: [],
      loading: false,
      result: '',
      downloadUrl: ''
    }
  },
  computed: {
    canGenerate() {
      return (this.activeTab === 'text' && this.textInput.trim()) ||
             (this.activeTab === 'file' && this.fileList.length > 0)
    }
  },
  methods: {
    handleFileChange(file, fileList) {
      this.fileList = fileList
    },

    async generateTestCases() {
      this.loading = true
      this.result = ''
      this.downloadUrl = ''

      try {
        const formData = new FormData()

        if (this.activeTab === 'file' && this.fileList.length > 0) {
          formData.append('file', this.fileList[0].raw)
        }

        if (this.activeTab === 'text' && this.textInput.trim()) {
          formData.append('textInput', this.textInput)
        }

        const response = await axios.post('/api/generate', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

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

.input-section {
  margin-bottom: 20px;
}

.input-tabs {
  min-height: 200px;
}

.upload-demo {
  width: 100%;
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

.el-icon--upload {
  font-size: 67px;
  color: #c0c4cc;
  margin: 40px 0 16px;
  line-height: 50px;
}

.el-upload__text {
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.el-upload__text em {
  color: #409eff;
  font-style: normal;
}

.el-upload__tip {
  font-size: 12px;
  color: #606266;
  margin-top: 7px;
}
</style>