<template>
  <div class="requirement-review">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <h2>需求评审</h2>
          <p>上传需求文档，AI将为您提供专业的需求评审报告</p>
        </div>
      </template>

      <div class="review-content">
        <!-- API选择 -->
        <div class="api-selection">
          <h3>选择AI模型</h3>
          <el-radio-group v-model="selectedApi" class="api-options">
            <el-radio label="cybotstar">CybotStar</el-radio>
            <el-radio label="deepseek">deepseek</el-radio>
          </el-radio-group>
        </div>

        <!-- 文件上传区域 -->
        <div class="upload-section">
          <h3>上传需求文档</h3>
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            accept=".txt,.md,.docx,.doc,.pdf,.xlsx,.xls,.json,.xml,.csv"
            :limit="10"
            multiple
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将需求文档拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持格式：.txt, .md, .docx, .doc, .pdf, .xlsx, .xls, .json, .xml, .csv（最大10MB，最多10个文件）
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 文本输入区域 -->
        <div class="text-input-section">
          <h3>或直接输入需求内容</h3>
          <el-input
            v-model="textInput"
            type="textarea"
            :rows="8"
            placeholder="请在此输入需求内容，支持Markdown格式..."
            class="text-input-textarea"
            maxlength="10000"
            show-word-limit
          />
        </div>

        <!-- 操作按钮 -->
        <div class="action-section">
          <el-button
            type="primary"
            size="large"
            :loading="reviewing"
            @click="startReview"
            :disabled="uploadedFiles.length === 0 && !textInput.trim()"
            class="review-btn"
          >
            <el-icon v-if="!reviewing"><Magic /></el-icon>
            {{ reviewing ? '评审中...' : '开始需求评审' }}
          </el-button>
        </div>

        <!-- 评审结果 -->
        <div v-if="reviewResult" class="result-section">
          <div class="result-header">
            <h3>需求评审报告</h3>
            <div class="result-actions">
              <el-button
                type="success"
                @click="downloadResult"
                :disabled="!downloadUrl"
              >
                <el-icon><Download /></el-icon>
                下载报告
              </el-button>
              <el-button
                @click="copyToClipboard"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制内容
              </el-button>
            </div>
          </div>
          
          <div class="result-content">
            <div class="review-summary">
              <h4>评审摘要</h4>
              <div class="summary-stats">
                <el-tag :type="getScoreType(reviewResult.score)" size="large">
                  综合评分: {{ reviewResult.score }}/100
                </el-tag>
                <el-tag :type="getIssueTagType(reviewResult.issueCount)" size="large">
                  发现问题: {{ reviewResult.issueCount }}个
                </el-tag>
              </div>
            </div>
            
            <div class="review-details">
              <h4>详细评审内容</h4>
              <div class="review-content-text" v-html="formatReviewContent(reviewResult.content)"></div>
            </div>
            
            <div v-if="reviewResult.suggestions" class="review-suggestions">
              <h4>改进建议</h4>
              <div class="suggestions-content" v-html="formatSuggestions(reviewResult.suggestions)"></div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { UploadFilled, Magic, Download, DocumentCopy } from '@element-plus/icons-vue'

export default {
  name: 'RequirementReview',
  components: {
    UploadFilled,
    Magic,
    Download,
    DocumentCopy
  },
  data() {
    return {
      selectedApi: 'cybotstar',
      uploadedFiles: [],
      fileList: [],
      fileContents: [],
      activeFileNames: [],
      textInput: '',
      reviewing: false,
      reviewResult: null,
      downloadUrl: ''
    }
  },
  methods: {
    handleFileChange(file) {
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        ElMessage.error('文件大小不能超过 10MB!')
        return false
      }
      
      const allowedTypes = ['.txt', '.md', '.docx', '.doc', '.pdf', '.xlsx', '.xls', '.json', '.xml', '.csv']
      const fileName = file.name.toLowerCase()
      const isValidType = allowedTypes.some(type => fileName.endsWith(type))
      
      if (!isValidType) {
        ElMessage.error('不支持的文件格式！')
        return false
      }
      
      this.uploadedFiles.push(file.raw)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const fileContent = {
          fileName: file.name,
          content: e.target.result
        }
        this.fileContents.push(fileContent)
        if (!this.activeFileNames.includes(file.name)) {
          this.activeFileNames.push(file.name)
        }
      }
      reader.readAsText(file.raw)
      
      ElMessage.success('文件上传成功！')
    },

    handleFileRemove(file) {
      const index = this.uploadedFiles.findIndex(f => f.name === file.name)
      if (index > -1) {
        this.uploadedFiles.splice(index, 1)
      }
      
      const contentIndex = this.fileContents.findIndex(f => f.fileName === file.name)
      if (contentIndex > -1) {
        this.fileContents.splice(contentIndex, 1)
      }
      
      const nameIndex = this.activeFileNames.indexOf(file.name)
      if (nameIndex > -1) {
        this.activeFileNames.splice(nameIndex, 1)
      }
    },

    async startReview() {
      if (this.uploadedFiles.length === 0 && !this.textInput.trim()) {
        ElMessage.warning('请上传需求文档或输入需求内容')
        return
      }

      this.reviewing = true
      try {
        const formData = new FormData()
        
        this.uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
        
        if (this.textInput.trim()) {
          formData.append('content', this.textInput.trim())
        }
        
        formData.append('apiProvider', this.selectedApi)
        formData.append('reviewType', 'requirement')
        
        const response = await axios.post('/api/review/requirement', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          this.reviewResult = response.data.result
          this.downloadUrl = response.data.downloadUrl
          ElMessage.success('需求评审完成！')
        } else {
          throw new Error(response.data.error || '评审失败')
        }
      } catch (error) {
        console.error('评审失败:', error)
        const errorMessage = error.response?.data?.error || error.message || '需求评审失败，请稍后重试'
        ElMessage.error(errorMessage)
        this.reviewResult = null
        this.downloadUrl = ''
      } finally {
        this.reviewing = false
      }
    },

    async downloadResult() {
      if (!this.downloadUrl) {
        ElMessage.warning('暂无可下载的文件')
        return
      }

      try {
        const response = await axios.get(this.downloadUrl, {
          responseType: 'blob'
        })

        const blob = new Blob([response.data], { type: 'application/octet-stream' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `requirement-review-${new Date().getTime()}.pdf`
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
      if (!this.reviewResult) return
      
      try {
        const content = this.reviewResult.content + '\n\n' + (this.reviewResult.suggestions || '')
        await navigator.clipboard.writeText(content)
        ElMessage.success('评审报告已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败，请手动复制')
      }
    },

    getScoreType(score) {
      if (score >= 90) return 'success'
      if (score >= 70) return 'warning'
      return 'danger'
    },

    getIssueTagType(count) {
      if (count === 0) return 'success'
      if (count <= 3) return 'warning'
      return 'danger'
    },

    formatReviewContent(content) {
      if (!content) return ''
      return content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    },

    formatSuggestions(suggestions) {
      if (!suggestions) return ''
      return suggestions.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    }
  }
}
</script>

<style scoped>
.requirement-review {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.main-card {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
  padding: 10px 0;
}

.card-header h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  color: #6c757d;
  font-size: 16px;
}

.review-content {
  padding: 20px;
}

.api-selection {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.api-selection h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
}

.api-options {
  display: flex;
  gap: 20px;
}

.text-input-section {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.text-input-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.text-input-textarea {
  width: 100%;
}

.text-input-textarea .el-textarea__inner {
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.5;
}

.text-input-textarea .el-textarea__inner:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
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

.file-contents-preview {
  margin-bottom: 30px;
}

.file-contents-preview h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
}

.file-content-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

.action-section {
  text-align: center;
  margin: 40px 0;
}

.review-btn {
  padding: 12px 30px;
  font-size: 16px;
  border-radius: 8px;
}

.result-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.result-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.result-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.review-summary {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.review-summary h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.summary-stats {
  display: flex;
  gap: 15px;
}

.review-details,
.review-suggestions {
  margin-bottom: 25px;
}

.review-details h4,
.review-suggestions h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.review-content-text,
.suggestions-content {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
  line-height: 1.6;
  color: #495057;
}

@media (max-width: 768px) {
  .requirement-review {
    padding: 10px;
  }
  
  .result-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .result-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .api-options {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
