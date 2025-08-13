<template>
  <div class="format-converter">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>用例格式转换</h2>
          <p>支持上传Excel、XMind等格式文件，自动转换为标准XMind测试用例格式</p>
        </div>
      </template>
      
      <div class="converter-content">
        <!-- 上传区域 -->
        <div class="upload-section">
          <h3 class="section-title">文件上传</h3>
          <el-upload
            ref="uploadRef"
            class="upload-dragger"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :before-upload="beforeUpload"
            accept=".xlsx,.xls,.xmind,.txt,.md,.json,.xml,.csv"
            :limit="1"
            :on-exceed="handleExceed"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持格式：Excel(.xlsx/.xls)、XMind(.xmind)、文本(.txt/.md)、JSON(.json)、XML(.xml)、CSV(.csv)
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 转换选项 -->
        <div class="options-section" v-if="uploadedFile">
          <h3 class="section-title">转换选项</h3>
          <el-form :model="convertForm" label-width="120px">
            <el-form-item label="文件名称">
              <el-input v-model="convertForm.fileName" placeholder="请输入转换后的文件名称" />
            </el-form-item>
            <el-form-item label="转换说明">
              <el-input
                v-model="convertForm.description"
                type="textarea"
                :rows="3"
                placeholder="请描述文件内容或转换要求（可选）"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作按钮 -->
        <div class="action-section" v-if="uploadedFile">
          <el-button type="primary" @click="convertFile" :loading="converting" size="large">
            <el-icon><Magic /></el-icon>
            开始转换
          </el-button>
          <el-button @click="clearFile" size="large">
            <el-icon><RefreshLeft /></el-icon>
            重新上传
          </el-button>
        </div>

        <!-- 转换结果 -->
        <div class="result-section" v-if="convertResult">
          <h3 class="section-title">转换结果</h3>
          <el-alert
            title="转换成功！"
            type="success"
            :description="`文件已成功转换为XMind格式，共解析出 ${testCaseCount} 个测试用例`"
            show-icon
            :closable="false"
          />
          
          <div class="result-actions">
            <el-button type="success" @click="downloadResult" size="large">
              <el-icon><Download /></el-icon>
              下载XMind文件
            </el-button>
            <el-button @click="previewResult" size="large">
              <el-icon><ViewIcon /></el-icon>
              预览内容
            </el-button>
          </div>
        </div>

        <!-- 预览对话框 -->
        <el-dialog v-model="previewVisible" title="转换预览" width="80%" top="5vh">
          <div class="preview-content" v-html="previewHtml"></div>
          <template #footer>
            <el-button @click="previewVisible = false">关闭</el-button>
            <el-button type="primary" @click="downloadResult">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
          </template>
        </el-dialog>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Magic, RefreshLeft, Download, View as ViewIcon } from '@element-plus/icons-vue'
import axios from 'axios'

export default {
  name: 'FormatConverter',
  components: {
    UploadFilled,
    Magic,
    RefreshLeft,
    Download,
    ViewIcon
  },
  setup() {
    const uploadRef = ref()
    const uploadedFile = ref(null)
    const converting = ref(false)
    const convertResult = ref('')
    const testCaseCount = ref(0)
    const previewVisible = ref(false)
    const previewHtml = ref('')
    const downloadUrl = ref('')
    
    const convertForm = reactive({
      fileName: '',
      description: ''
    })

    // 文件变化处理
    const handleFileChange = (file) => {
      uploadedFile.value = file
      convertForm.fileName = file.name.replace(/\.[^/.]+$/, '') + '-converted'
      ElMessage.success('文件上传成功，请设置转换选项')
    }

    // 上传前验证
    const beforeUpload = (file) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'application/vnd.xmind.workbook', // xmind
        'text/plain', // txt
        'text/markdown', // md
        'application/json', // json
        'application/xml', // xml
        'text/xml', // xml
        'text/csv' // csv
      ]
      
      const isValidType = allowedTypes.includes(file.type) || 
                         file.name.toLowerCase().endsWith('.xmind') ||
                         file.name.toLowerCase().endsWith('.md')
      
      if (!isValidType) {
        ElMessage.error('不支持的文件格式！')
        return false
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        ElMessage.error('文件大小不能超过 10MB!')
        return false
      }
      
      return true
    }

    // 文件数量超限处理
    const handleExceed = () => {
      ElMessage.warning('只能上传一个文件，请先删除已上传的文件')
    }

    // 清空文件
    const clearFile = () => {
      uploadRef.value.clearFiles()
      uploadedFile.value = null
      convertResult.value = ''
      convertForm.fileName = ''
      convertForm.description = ''
      downloadUrl.value = ''
      testCaseCount.value = 0
    }

    // 转换文件
    const convertFile = async () => {
      if (!uploadedFile.value) {
        ElMessage.error('请先上传文件')
        return
      }
      
      if (!convertForm.fileName.trim()) {
        ElMessage.error('请输入文件名称')
        return
      }

      converting.value = true
      
      try {
        const formData = new FormData()
        formData.append('file', uploadedFile.value.raw)
        formData.append('fileName', convertForm.fileName)
        formData.append('description', convertForm.description)
        
        const response = await axios.post('/api/convert-format', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 120000 // 2分钟超时
        })
        
        if (response.data.success) {
          convertResult.value = response.data.content
          // 简单计算测试用例数量（通过统计TC-开头的行数）
          const tcMatches = response.data.content.match(/TC-\d+/g)
          testCaseCount.value = tcMatches ? tcMatches.length : 0
          downloadUrl.value = response.data.downloadUrl
          ElMessage.success('文件转换成功！')
        } else {
          ElMessage.error(response.data.error || '转换失败')
        }
      } catch (error) {
        console.error('转换失败:', error)
        ElMessage.error('转换失败，请稍后重试')
      } finally {
        converting.value = false
      }
    }

    // 预览结果
    const previewResult = () => {
      if (!convertResult.value) {
        ElMessage.error('没有可预览的内容')
        return
      }
      
      // 将Markdown转换为HTML显示
      previewHtml.value = convertResult.value
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      previewVisible.value = true
    }

    // 下载结果
    const downloadResult = () => {
      if (!downloadUrl.value) {
        ElMessage.error('没有可下载的文件')
        return
      }
      
      const link = document.createElement('a')
      link.href = downloadUrl.value
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      ElMessage.success('文件下载成功')
    }

    return {
      uploadRef,
      uploadedFile,
      converting,
      convertResult,
      testCaseCount,
      previewVisible,
      previewHtml,
      downloadUrl,
      convertForm,
      handleFileChange,
      beforeUpload,
      handleExceed,
      clearFile,
      convertFile,
      previewResult,
      downloadResult
    }
  }
}
</script>

<style scoped>
.format-converter {
  padding: 20px;
}

.page-card {
  max-width: 1000px;
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

.converter-content {
  padding: 20px 0;
}

.section-title {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-left: 4px solid #409EFF;
  padding-left: 12px;
}

.upload-section {
  margin-bottom: 30px;
}

.upload-dragger {
  width: 100%;
}

.options-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.action-section {
  margin-bottom: 30px;
  text-align: center;
}

.action-section .el-button {
  margin: 0 10px;
}

.result-section {
  padding: 20px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #e1f5fe;
}

.result-actions {
  margin-top: 20px;
  text-align: center;
}

.result-actions .el-button {
  margin: 0 10px;
}

.preview-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 4px;
  line-height: 1.6;
}

.preview-content h1,
.preview-content h2,
.preview-content h3 {
  color: #303133;
  margin-top: 20px;
  margin-bottom: 10px;
}

.preview-content h1 {
  font-size: 24px;
}

.preview-content h2 {
  font-size: 20px;
}

.preview-content h3 {
  font-size: 16px;
}
</style>