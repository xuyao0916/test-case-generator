<template>
  <div class="tools-module">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>工具类</h2>
          <p>提供格式转换、文件信息获取等实用工具</p>
        </div>
      </template>
      
      <div class="tools-content">
        <!-- 工具选择 -->
        <div class="tool-selection">
          <el-radio-group v-model="selectedTool" class="tool-radio-group">
            <el-radio-button label="format-converter">格式转换</el-radio-button>
            <el-radio-button label="file-info">获取文件信息</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 格式转换工具 -->
        <div v-if="selectedTool === 'format-converter'" class="tool-panel">
          <h3 class="panel-title">格式转换</h3>
          <p class="panel-description">支持上传Excel、XMind等格式文件，自动转换为标准XMind测试用例格式</p>
          
          <!-- 上传区域 -->
          <div class="upload-section">
            <h4 class="section-title">文件上传</h4>
            <el-upload
              ref="converterUploadRef"
              class="upload-dragger"
              drag
              :auto-upload="false"
              :on-change="handleConverterFileChange"
              :before-upload="beforeConverterUpload"
              accept=".xlsx,.xls,.xmind,.txt,.md,.json,.xml,.csv"
              :limit="1"
              :on-exceed="handleConverterExceed"
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
          <div class="options-section" v-if="converterFile">
            <h4 class="section-title">转换选项</h4>
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
          <div class="action-section" v-if="converterFile">
            <el-button type="primary" @click="convertFile" :loading="converting" size="large">
              <el-icon><Magic /></el-icon>
              开始转换
            </el-button>
            <el-button @click="clearConverterFile" size="large">
              <el-icon><RefreshLeft /></el-icon>
              重新上传
            </el-button>
          </div>

          <!-- 转换结果 -->
          <div class="result-section" v-if="convertResult">
            <h4 class="section-title">转换结果</h4>
            <el-alert
              title="转换成功！"
              type="success"
              :description="`文件已成功转换为XMind格式，共解析出 ${testCaseCount} 个测试用例`"
              show-icon
              :closable="false"
            />
            
            <div class="result-actions">
              <el-button type="success" @click="downloadConverterResult" size="large">
                <el-icon><Download /></el-icon>
                下载XMind文件
              </el-button>
              <el-button @click="previewConverterResult" size="large">
                <el-icon><ViewIcon /></el-icon>
                预览内容
              </el-button>
            </div>
          </div>
        </div>

        <!-- 文件信息获取工具 -->
        <div v-if="selectedTool === 'file-info'" class="tool-panel">
          <h3 class="panel-title">获取文件信息</h3>
          <p class="panel-description">上传文件后可以查看文件的详细信息，包括Hash值、MIME类型、大小等</p>
          
          <!-- 文件上传区域 -->
          <div class="upload-section">
            <h4 class="section-title">文件上传（最多20个文件）</h4>
            <el-upload
              ref="fileInfoUploadRef"
              class="upload-dragger"
              drag
              :auto-upload="false"
              :on-change="handleFileInfoChange"
              :on-remove="handleFileInfoRemove"
              :file-list="fileInfoList"
              :limit="20"
              :on-exceed="handleFileInfoExceed"
              multiple
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持所有格式文件，最多上传20个文件
                </div>
              </template>
            </el-upload>
          </div>

          <!-- 文件信息展示 -->
          <div class="file-info-section" v-if="fileInfoResults.length > 0">
            <h4 class="section-title">文件信息</h4>
            <div class="file-info-list">
              <el-card v-for="(fileInfo, index) in fileInfoResults" :key="index" class="file-info-card">
                <template #header>
                  <div class="file-info-header">
                    <span class="file-name">{{ fileInfo.fileName }}</span>
                    <el-tag :type="getFileTypeTag(fileInfo.mimeType)">{{ fileInfo.mimeType }}</el-tag>
                  </div>
                </template>
                
                <div class="file-info-content">
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="文件大小">
                      <span class="info-value">{{ fileInfo.size }} 字节</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="MIME类型">
                      <span class="info-value">{{ fileInfo.mimeType }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="MD5 Hash" :span="2">
                      <div class="hash-container">
                        <el-input 
                          :value="fileInfo.hash" 
                          readonly 
                          class="hash-input"
                        >
                          <template #append>
                            <el-button @click="copyToClipboard(fileInfo.hash)" size="small">
                              <el-icon><DocumentCopy /></el-icon>
                            </el-button>
                          </template>
                        </el-input>
                      </div>
                    </el-descriptions-item>
                    <el-descriptions-item label="Short Hash (前256KB)" :span="2">
                      <div class="hash-container">
                        <el-input 
                          :value="fileInfo.shortHash" 
                          readonly 
                          class="hash-input"
                        >
                          <template #append>
                            <el-button @click="copyToClipboard(fileInfo.shortHash)" size="small">
                              <el-icon><DocumentCopy /></el-icon>
                            </el-button>
                          </template>
                        </el-input>
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-card>
            </div>
            
            <!-- 批量操作 -->
            <div class="batch-actions">
              <el-button @click="clearAllFileInfo" size="large">
                <el-icon><Delete /></el-icon>
                清空所有文件
              </el-button>
              <el-button type="primary" @click="exportFileInfo" size="large">
                <el-icon><Download /></el-icon>
                导出文件信息
              </el-button>
            </div>
          </div>
        </div>

        <!-- 预览对话框 -->
        <el-dialog v-model="previewVisible" title="转换预览" width="80%" top="5vh">
          <div class="preview-content" v-html="previewHtml"></div>
          <template #footer>
            <el-button @click="previewVisible = false">关闭</el-button>
            <el-button type="primary" @click="downloadConverterResult">
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
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled, Magic, RefreshLeft, Download, View as ViewIcon, DocumentCopy, Delete } from '@element-plus/icons-vue'
import axios from 'axios'
import CryptoJS from 'crypto-js'

export default {
  name: 'ToolsModule',
  components: {
    UploadFilled,
    Magic,
    RefreshLeft,
    Download,
    ViewIcon,
    DocumentCopy,
    Delete
  },
  setup() {
    const selectedTool = ref('format-converter')
    
    const route = useRoute()
    if (route.query.tool === 'file-info') {
      selectedTool.value = 'file-info'
    }
    
    const converterUploadRef = ref()
    const converterFile = ref(null)
    const converting = ref(false)
    const convertResult = ref('')
    const testCaseCount = ref(0)
    const previewVisible = ref(false)
    const previewHtml = ref('')
    const converterDownloadUrl = ref('')
    
    const convertForm = reactive({
      fileName: '',
      description: ''
    })

    const fileInfoUploadRef = ref()
    const fileInfoList = ref([])
    const fileInfoResults = ref([])

    const handleConverterFileChange = (file) => {
      converterFile.value = file
      convertForm.fileName = file.name.replace(/\.[^/.]+$/, '') + '-converted'
      ElMessage.success('文件上传成功，请设置转换选项')
    }

    const beforeConverterUpload = (file) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.xmind.workbook',
        'text/plain',
        'text/markdown',
        'application/json',
        'application/xml',
        'text/xml',
        'text/csv'
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

    const handleConverterExceed = () => {
      ElMessage.warning('只能上传一个文件，请先删除已上传的文件')
    }

    const clearConverterFile = () => {
      converterUploadRef.value.clearFiles()
      converterFile.value = null
      convertResult.value = ''
      convertForm.fileName = ''
      convertForm.description = ''
      converterDownloadUrl.value = ''
      testCaseCount.value = 0
    }

    const convertFile = async () => {
      if (!converterFile.value) {
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
        formData.append('file', converterFile.value.raw)
        formData.append('fileName', convertForm.fileName)
        formData.append('description', convertForm.description)
        
        const response = await axios.post('/api/convert-format', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 120000
        })
        
        if (response.data.success) {
          convertResult.value = response.data.content
          const tcMatches = response.data.content.match(/TC-\d+/g)
          testCaseCount.value = tcMatches ? tcMatches.length : 0
          converterDownloadUrl.value = response.data.downloadUrl
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

    const previewConverterResult = () => {
      if (!convertResult.value) {
        ElMessage.error('没有可预览的内容')
        return
      }
      
      previewHtml.value = convertResult.value
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      previewVisible.value = true
    }

    const downloadConverterResult = () => {
      if (!converterDownloadUrl.value) {
        ElMessage.error('没有可下载的文件')
        return
      }
      
      const link = document.createElement('a')
      link.href = converterDownloadUrl.value
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      ElMessage.success('文件下载成功')
    }

    const handleFileInfoChange = async (file) => {
      try {
        const fileInfo = await processFileInfo(file.raw)
        fileInfoResults.value.push(fileInfo)
        ElMessage.success(`文件 ${file.name} 信息获取成功`)
      } catch (error) {
        console.error('文件信息处理失败:', error)
        ElMessage.error(`文件 ${file.name} 信息获取失败`)
      }
    }

    const handleFileInfoRemove = (file) => {
      const index = fileInfoResults.value.findIndex(f => f.fileName === file.name)
      if (index > -1) {
        fileInfoResults.value.splice(index, 1)
      }
    }

    const handleFileInfoExceed = () => {
      ElMessage.warning('最多只能上传20个文件')
    }

    const processFileInfo = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target.result
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
            
            const fullHash = CryptoJS.MD5(wordArray).toString()
            
            const shortSize = Math.min(arrayBuffer.byteLength, 256 * 1024)
            const shortWordArray = CryptoJS.lib.WordArray.create(arrayBuffer.slice(0, shortSize))
            const shortHash = CryptoJS.MD5(shortWordArray).toString()
            
            const fileInfo = {
              fileName: file.name,
              size: file.size,
              mimeType: file.type || 'application/octet-stream',
              hash: fullHash,
              shortHash: shortHash
            }
            
            resolve(fileInfo)
          } catch (error) {
            reject(error)
          }
        }
        
        reader.onerror = () => {
          reject(new Error('文件读取失败'))
        }
        
        reader.readAsArrayBuffer(file)
      })
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getFileTypeTag = (mimeType) => {
      if (mimeType.startsWith('image/')) return 'success'
      if (mimeType.startsWith('video/')) return 'warning'
      if (mimeType.startsWith('audio/')) return 'info'
      if (mimeType.startsWith('text/')) return 'primary'
      if (mimeType.includes('pdf')) return 'danger'
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'success'
      if (mimeType.includes('word') || mimeType.includes('document')) return 'primary'
      return 'info'
    }

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制到剪贴板')
      } catch (error) {
        console.error('复制失败:', error)
        ElMessage.error('复制失败，请手动复制')
      }
    }

    const clearAllFileInfo = () => {
      fileInfoUploadRef.value.clearFiles()
      fileInfoList.value = []
      fileInfoResults.value = []
      ElMessage.success('已清空所有文件信息')
    }

    const exportFileInfo = () => {
      if (fileInfoResults.value.length === 0) {
        ElMessage.warning('没有文件信息可导出')
        return
      }

      const csvContent = [
        ['文件名', '大小(字节)', 'MIME类型', 'MD5 Hash', 'Short Hash'].join(','),
        ...fileInfoResults.value.map(info => [
          info.fileName,
          info.size,
          info.mimeType,
          info.hash,
          info.shortHash
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `file-info-${new Date().getTime()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      ElMessage.success('文件信息导出成功')
    }

    return {
      selectedTool,
      // 格式转换
      converterUploadRef,
      converterFile,
      converting,
      convertResult,
      testCaseCount,
      previewVisible,
      previewHtml,
      converterDownloadUrl,
      convertForm,
      handleConverterFileChange,
      beforeConverterUpload,
      handleConverterExceed,
      clearConverterFile,
      convertFile,
      previewConverterResult,
      downloadConverterResult,
      // 文件信息
      fileInfoUploadRef,
      fileInfoList,
      fileInfoResults,
      handleFileInfoChange,
      handleFileInfoRemove,
      handleFileInfoExceed,
      formatFileSize,
      getFileTypeTag,
      copyToClipboard,
      clearAllFileInfo,
      exportFileInfo
    }
  }
}
</script>

<style scoped>
.tools-module {
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

.tools-content {
  padding: 20px 0;
}

.tool-selection {
  margin-bottom: 30px;
  text-align: center;
}

.tool-radio-group {
  margin-bottom: 20px;
}

.tool-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-title {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.panel-description {
  margin: 0 0 20px 0;
  color: #909399;
  font-size: 14px;
  line-height: 1.6;
}

.section-title {
  margin: 0 0 15px 0;
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

.file-info-section {
  margin-top: 30px;
}

.file-info-list {
  margin-bottom: 20px;
}

.file-info-card {
  margin-bottom: 15px;
}

.file-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-weight: 600;
  color: #303133;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-info-content {
  margin-top: 10px;
}

.info-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.hash-container {
  width: 100%;
}

.hash-input {
  width: 100%;
}

.batch-actions {
  text-align: center;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.batch-actions .el-button {
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

@media (max-width: 768px) {
  .tools-module {
    padding: 10px;
  }
  
  .file-info-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .batch-actions {
    text-align: center;
  }
  
  .batch-actions .el-button {
    margin: 5px;
    width: 100%;
    max-width: 200px;
  }
}
</style>
