<template>
  <div class="file-info">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>获取文件信息</h2>
          <p>上传文件后可以查看文件的详细信息，包括Hash值、MIME类型、大小等</p>
        </div>
      </template>
      
      <div class="file-info-content">
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
    </el-card>
  </div>
</template>

<script>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Download, DocumentCopy, Delete } from '@element-plus/icons-vue'
import CryptoJS from 'crypto-js'

export default {
  name: 'FileInfo',
  components: {
    UploadFilled,
    Download,
    DocumentCopy,
    Delete
  },
  setup() {
    const fileInfoUploadRef = ref()
    const fileInfoList = ref([])
    const fileInfoResults = ref([])

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
      fileInfoUploadRef,
      fileInfoList,
      fileInfoResults,
      handleFileInfoChange,
      handleFileInfoRemove,
      handleFileInfoExceed,
      getFileTypeTag,
      copyToClipboard,
      clearAllFileInfo,
      exportFileInfo
    }
  }
}
</script>

<style scoped>
.file-info {
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.page-card {
  width: 100%;
  height: 100%;
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

.file-info-content {
  padding: 20px 0;
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

@media (max-width: 768px) {
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
